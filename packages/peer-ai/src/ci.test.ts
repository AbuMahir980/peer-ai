import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PeerAiConfig } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { evaluate } from "./check.ts";
import { ciProblem, ciResult } from "./ci.ts";
import type { Runner } from "./feedback.ts";
import { gateWorkflow } from "./gate.ts";
import { runShip } from "./ship.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";
import { advanceWorkItem, createWorkItem, loadWorkItem, saveWorkItem, verifyFromCi } from "./work.ts";

afterEach(cleanUp);

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const URL = "https://github.com/acme/shop/actions/runs/1/job/2";

/** gh answering the check-runs API for one commit, as GitHub would. */
const github =
  (runs: object[]): Runner =>
  (command, args) =>
    command === "gh" && args.join(" ") === `api repos/{owner}/{repo}/commits/${COMMIT}/check-runs?per_page=100`
      ? JSON.stringify({ total_count: runs.length, check_runs: runs })
      : undefined;

const run = (name: string, status: string, conclusion: string | null, started: string) => ({
  name,
  status,
  conclusion,
  html_url: URL,
  started_at: started,
});

describe("CI's verify (RFC 0013)", () => {
  it("is the latest run of the check, by its name or as a pull request shows it", () => {
    const runs = [
      run("check", "completed", "failure", "2026-10-03T08:00:00Z"),
      run("check", "completed", "success", "2026-10-03T09:00:00Z"),
      run("lint", "completed", "failure", "2026-10-03T09:00:00Z"),
    ];
    expect(ciResult(COMMIT, "check", github(runs))).toEqual({ status: "pass", url: URL });
    expect(ciResult(COMMIT, "ci / check", github(runs))).toEqual({ status: "pass", url: URL });
    expect(ciResult(COMMIT, "ci / lint", github(runs))).toEqual({ status: "fail", url: URL });
  });

  it("says when it's still running, didn't run, or GitHub can't be asked", () => {
    const running = ciResult(COMMIT, "check", github([run("check", "in_progress", null, "2026-10-03T09:00:00Z")]));
    expect(ciProblem(running, "check", COMMIT)).toBe(
      "CI's check is still running on 0123456. Ask again when it finishes.",
    );
    const missing = ciResult(
      COMMIT,
      "ci / test",
      github([run("check", "completed", "success", "2026-10-03T09:00:00Z")]),
    );
    expect(ciProblem(missing, "ci / test", COMMIT)).toBe(
      'No check named "ci / test" ran on 0123456. Push the branch and let CI run it; the checks that ran are check, so check commands.verifyCheck.',
    );
    const unknown = ciResult(COMMIT, "check", () => undefined);
    expect(ciProblem(unknown, "check", COMMIT)).toBe(
      "GitHub couldn't be asked for CI's result: sign in with gh auth login, or verify here instead.",
    );
  });
});

describe("shipping with CI's verify (RFC 0013)", () => {
  const NOW = new Date("2026-10-03T09:00:00Z");
  const git = (cwd: string, ...args: string[]) =>
    execFileSync(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
  function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
    if (!result.ok) throw new Error(result.error);
    return result.value;
  }

  /** SHOP-1 built and committed on its branch, at verify with no reviews needed, never verified here. */
  function atVerify(): { root: string; config: PeerAiConfig; head: string } {
    const root = project(
      {
        "peer-ai.config.json": JSON.stringify({
          version: 1,
          project: { name: "Shop", stage: "mvp" },
          tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active" }],
          tracker: { kind: "linear", ticketPrefix: "SHOP" },
          repo: { defaultBranch: "main", branchNaming: "feature/{ticket}-{slug}" },
          commands: { verify: "make check", verifyCheck: "ci / check" },
        }),
        "apps/web/package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
      },
      { git: true },
    );
    git(root, "symbolic-ref", "HEAD", "refs/heads/main");
    git(root, "add", "-A");
    git(root, "commit", "-qm", "start");
    const { config } = loadConfig(root);
    if (config === undefined) throw new Error("the test config is not valid");
    git(root, "switch", "-qc", "feature/SHOP-1-cart");
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    writeFileSync(join(root, "apps/web/Cart.ts"), "export const cart = [];\n");
    const item = value(loadWorkItem(root, "SHOP-1"));
    value(saveWorkItem(root, config, { ...item, stage: "verify", requiredReviews: [] }));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "cart");
    return { root, config, head: git(root, "rev-parse", "HEAD") };
  }

  const ci =
    (head: string, status: string, conclusion: string | null): Runner =>
    (_command, args) =>
      args[1] === `repos/{owner}/{repo}/commits/${head}/check-runs?per_page=100`
        ? JSON.stringify({ check_runs: [run("check", status, conclusion, "2026-10-03T08:50:00Z")] })
        : undefined;

  it("moves an item to ship on CI's passing run, recorded with its link", () => {
    const { root, config, head } = atVerify();
    const shipped = value(advanceWorkItem(root, config, "SHOP-1", "ship", NOW, ci(head, "completed", "success")));
    expect(shipped.stage).toBe("ship");
    expect(shipped.lastVerify).toEqual({
      result: "pass",
      at: NOW.toISOString(),
      commit: head,
      ci: { check: "ci / check", url: URL },
    });
  });

  it("says what's missing while CI is still running, or when it failed", () => {
    const { root, config, head } = atVerify();
    const running = advanceWorkItem(root, config, "SHOP-1", "ship", NOW, ci(head, "in_progress", null));
    expect(running.ok ? "" : running.error).toContain(`CI's ci / check is still running on ${head.slice(0, 7)}`);
    const failing = advanceWorkItem(root, config, "SHOP-1", "ship", NOW, ci(head, "completed", "failure"));
    expect(failing.ok ? "" : failing.error).toContain("SHOP-1 is at ship, but its last verify failed.");
  });

  it("is confirmed by the gate, which fails a record GitHub doesn't back", () => {
    const { root, config, head } = atVerify();
    value(advanceWorkItem(root, config, "SHOP-1", "ship", NOW, ci(head, "completed", "success")));
    const gates = (run: Runner) =>
      evaluate(root, config, { pullRequest: "feature/SHOP-1-cart", run }).checks.filter(
        (check) => check.id === "gates",
      );
    expect(gates(ci(head, "completed", "success")).every((check) => check.status === "ok")).toBe(true);
    expect(gates(ci(head, "completed", "failure"))).toContainEqual(
      expect.objectContaining({
        status: "fail",
        message: `SHOP-1 is at ship, and its verify says CI's ci / check passed on ${head.slice(0, 7)}, but GitHub says it failed.`,
      }),
    );
  });

  it("is what peer-ai ship takes, for the item on the branch", () => {
    const { root, head } = atVerify();
    const out = capture();
    expect(runShip({ cwd: root, now: NOW, run: ci(head, "completed", "success") }, out)).toBe(0);
    expect(out.text()).toContain(`SHOP-1 is at ship, verified by CI's ci / check: ${URL}.`);
    git(root, "add", "-A");
    git(root, "commit", "-qm", "ship");
    git(root, "switch", "-q", "main");
    const none = capture();
    expect(runShip({ cwd: root, now: NOW, run: ci(head, "completed", "success") }, none)).toBe(2);
    expect(none.text()).toContain("No open work item is on main. Give its id: peer-ai ship <id>.");
  });

  it("refuses uncommitted changes, which CI can't have verified", () => {
    const { root, config, head } = atVerify();
    writeFileSync(join(root, "apps/web/Cart.ts"), "export const cart = [1];\n");
    const taken = verifyFromCi(root, config, "SHOP-1", NOW, ci(head, "completed", "success"));
    expect(taken.ok ? "" : taken.error).toBe(
      "CI verifies commits, and apps/web/Cart.ts isn't committed. Commit and push it, then ask again.",
    );
  });

  it("lets the gate's workflow ask GitHub, only when the config names the check", () => {
    const { config } = atVerify();
    expect(gateWorkflow(config)).toContain("  checks: read\n");
    expect(gateWorkflow(config)).toContain("          GH_TOKEN: ${{ github.token }}");
    const plain = { ...config, commands: { verify: "make check" } };
    expect(gateWorkflow(plain)).not.toContain("checks: read");
  });
});
