import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PeerAiConfig, WorkItem } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { evaluate, runCheck } from "./check.ts";
import { main } from "./cli.ts";
import { diagnose } from "./doctor.ts";
import { gateWorkflow } from "./gate.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";
import { advanceWorkItem, createWorkItem, loadWorkItem, recordVerify, saveWorkItem } from "./work.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-02T09:15:00Z");
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const commitAll = (cwd: string): string => {
  git(cwd, "add", "-A");
  git(
    cwd,
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "change",
  );
  return git(cwd, "rev-parse", "HEAD");
};

function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const SCREEN = "export const Cart = () => <main>Cart</main>;\n";

/** A shop on main, in git, with a web part that has a screen. */
function shop(stage = "mvp"): { root: string; config: PeerAiConfig } {
  const root = project(
    {
      "peer-ai.config.json": JSON.stringify({
        version: 1,
        project: { name: "Shop", stage },
        tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active" }],
        tracker: { kind: "linear", ticketPrefix: "SHOP" },
        repo: { branchNaming: "feature/{ticket}-{slug}" },
      }),
      "apps/web/package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
      "apps/web/Cart.tsx": SCREEN,
    },
    { git: true },
  );
  git(root, "symbolic-ref", "HEAD", "refs/heads/main");
  commitAll(root);
  const { config } = loadConfig(root);
  if (config === undefined) throw new Error("the test config is not valid");
  return { root, config };
}

const required = (item: WorkItem) => (item.requiredReviews ?? []).map((review) => review.skill);

describe("the reviews an item needs (RFC 0010)", () => {
  it("come from its own commits, not a parent branch's, and leave out whitespace-only changes", () => {
    const { root, config } = shop();
    // The parent branch changes a dependency, with an item of its own.
    git(root, "switch", "-qc", "feature/SHOP-1-react");
    value(createWorkItem(root, config, { title: "React", kind: "chore", track: "web" }, NOW));
    writeFileSync(join(root, "apps/web/package.json"), JSON.stringify({ dependencies: { react: "19.1.0" } }));
    commitAll(root);
    // Stacked on it: an item that only reformats a screen and adds notes.
    git(root, "switch", "-qc", "feature/SHOP-2-notes");
    value(createWorkItem(root, config, { title: "Notes", kind: "chore", track: "web" }, NOW));
    value(advanceWorkItem(root, config, "SHOP-2", "build", NOW));
    // Only whitespace and a blank line change, as a formatter might.
    writeFileSync(join(root, "apps/web/Cart.tsx"), "export const Cart = () => <main>  Cart</main>;\n\n");
    writeFileSync(join(root, "apps/web/NOTES.md"), "Notes.\n");
    commitAll(root);
    const own = value(advanceWorkItem(root, config, "SHOP-2", "verify", NOW));
    expect(required(own)).not.toContain("dependency-review");
    expect(required(own)).not.toContain("accessibility-review");

    // The old rule, from the whole diff against main, asks for both.
    const withoutBase: WorkItem = { ...own, stage: "build" };
    delete withoutBase.base;
    value(saveWorkItem(root, config, withoutBase));
    const old = value(advanceWorkItem(root, config, "SHOP-2", "verify", NOW));
    expect(required(old)).toContain("dependency-review");
  });
});

describe("where an item's change starts (#205)", { timeout: 20_000 }, () => {
  it("counts commits made on its branch before it moved to build", () => {
    const { root, config } = shop();
    const start = git(root, "rev-parse", "HEAD");
    git(root, "switch", "-qc", "feature/SHOP-1-react");
    value(createWorkItem(root, config, { title: "React", kind: "chore", track: "web" }, NOW));
    writeFileSync(join(root, "apps/web/package.json"), JSON.stringify({ dependencies: { react: "19.1.0" } }));
    commitAll(root);
    expect(value(advanceWorkItem(root, config, "SHOP-1", "build", NOW)).base).toBe(start);
    expect(required(value(advanceWorkItem(root, config, "SHOP-1", "verify", NOW)))).toContain("dependency-review");
  });

  it("counts only the branch's own files, not those a merge from the default branch brought in (#229)", () => {
    const { root, config } = shop();
    git(root, "switch", "-qc", "feature/SHOP-1-notes");
    value(createWorkItem(root, config, { title: "Notes", kind: "chore", track: "web" }, NOW));
    value(advanceWorkItem(root, config, "SHOP-1", "build", NOW));
    writeFileSync(join(root, "apps/web/NOTES.md"), "Notes.\n");
    commitAll(root);
    // Meanwhile the default branch gains a migration, which its own item reviewed.
    git(root, "switch", "-q", "main");
    mkdirSync(join(root, "apps/web/migrations"), { recursive: true });
    writeFileSync(join(root, "apps/web/migrations/0002_notes.sql"), "ALTER TABLE carts ADD note TEXT;\n");
    commitAll(root);
    git(root, "switch", "-q", "feature/SHOP-1-notes");
    git(root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "merge", "-q", "--no-edit", "main");
    const item = value(advanceWorkItem(root, config, "SHOP-1", "verify", NOW));
    expect(required(item)).not.toContain("data-migration-review");
  });

  it("starts a stacked branch where it leaves its parent's, even after the parent moves on", () => {
    const { root, config } = shop();
    git(root, "switch", "-qc", "feature/SHOP-1-react");
    value(createWorkItem(root, config, { title: "React", kind: "chore", track: "web" }, NOW));
    writeFileSync(join(root, "apps/web/package.json"), JSON.stringify({ dependencies: { react: "19.1.0" } }));
    const parent = commitAll(root);
    git(root, "switch", "-qc", "feature/SHOP-2-notes");
    value(createWorkItem(root, config, { title: "Notes", kind: "chore", track: "web" }, NOW));
    writeFileSync(join(root, "apps/web/NOTES.md"), "Notes.\n");
    commitAll(root);
    // The parent gains a commit after the stacked branch left it.
    git(root, "switch", "-q", "feature/SHOP-1-react");
    writeFileSync(join(root, "apps/web/Total.tsx"), SCREEN);
    commitAll(root);
    git(root, "switch", "-q", "feature/SHOP-2-notes");
    expect(value(advanceWorkItem(root, config, "SHOP-2", "build", NOW)).base).toBe(parent);
  });
});

describe("the gate on a pull request (RFC 0010)", () => {
  function onBranch(stage: WorkItem["stage"], projectStage = "mvp"): { root: string; config: PeerAiConfig } {
    const { root, config } = shop(projectStage);
    git(root, "switch", "-qc", "feature/SHOP-1-cart");
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    const item = value(loadWorkItem(root, "SHOP-1"));
    value(saveWorkItem(root, config, { ...item, stage }));
    return { root, config };
  }
  const prCheck = (root: string, config: PeerAiConfig, branch: string) =>
    evaluate(root, config, { pullRequest: branch }).checks.find((check) => check.id === "pull-request");

  it("fails while the branch's item isn't at ship, so unreviewed work can't merge", async () => {
    const { root, config } = onBranch("verify");
    expect(prCheck(root, config, "feature/SHOP-1-cart")).toEqual({
      id: "pull-request",
      status: "fail",
      message: "SHOP-1 is at verify, so the change on feature/SHOP-1-cart isn't verified and reviewed yet.",
      fix: "Move SHOP-1 to ship before this merges: verify it, record the reviews it needs, then advance it.",
    });
    expect(await main(["check", "--branch", "feature/SHOP-1-cart"], { cwd: root, out: capture() })).toBe(1);
  });

  it("passes a branch whose item is at ship, or one with no item, such as a dependency update", () => {
    const shipped = onBranch("ship");
    value(recordVerify(shipped.root, shipped.config, "SHOP-1", "pass", NOW));
    expect(prCheck(shipped.root, shipped.config, "feature/SHOP-1-cart")).toMatchObject({ status: "ok" });
    expect(prCheck(shipped.root, shipped.config, "dependabot/npm/react-19.2")).toEqual({
      id: "pull-request",
      status: "ok",
      message: "No work item is on dependabot/npm/react-19.2, so there's no record to hold it to",
    });
  });

  it("only tells a prototype", () => {
    const { root, config } = onBranch("build", "prototype");
    expect(prCheck(root, config, "feature/SHOP-1-cart")?.status).toBe("warn");
  });

  it("checks out the pull request's own commit, with its history", () => {
    const { config } = shop();
    const workflow = gateWorkflow(config);
    expect(workflow).toContain("ref: ${{ github.event.pull_request.head.sha || github.sha }}");
    expect(workflow).toContain("fetch-depth: 0");
  });
});

describe("a record that falls behind (RFC 0010)", () => {
  const recordChecks = (root: string) => diagnose(root, "24.3.0").checks.filter((check) => check.id === "record");

  it("is warned about while the item is still at prepare and its branch has commits", () => {
    const { root, config } = shop();
    git(root, "switch", "-qc", "feature/SHOP-1-cart");
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    expect(recordChecks(root)).toEqual([]);
    writeFileSync(join(root, "apps/web/Total.tsx"), "export const Total = () => null;\n");
    commitAll(root);
    expect(recordChecks(root)).toEqual([
      {
        id: "record",
        status: "warn",
        message: "SHOP-1 is at prepare, but its branch has 1 commit.",
        fix: "Move it to build, and say what changed with update_work_item.",
      },
    ]);
  });

  it("is warned about when the branch moves on after a verify", () => {
    const { root, config } = shop();
    git(root, "switch", "-qc", "feature/SHOP-1-cart");
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    value(advanceWorkItem(root, config, "SHOP-1", "build", NOW));
    const first = commitAll(root);
    value(advanceWorkItem(root, config, "SHOP-1", "verify", NOW));
    value(recordVerify(root, config, "SHOP-1", "pass", NOW, first));
    writeFileSync(join(root, "apps/web/Cart.tsx"), "export const Cart = () => null;\n");
    commitAll(root);
    expect(recordChecks(root)).toEqual([
      expect.objectContaining({
        status: "warn",
        message: `SHOP-1 is at verify, but its verify looked at ${first.slice(0, 7)}, and apps/web/Cart.tsx changed since.`,
      }),
    ]);
  });
});

describe("reviews and a merge from the base branch (RFC 0013)", { timeout: 20_000 }, () => {
  const PRICES = Array.from({ length: 12 }, (_, i) => `export const price${String(i)} = ${String(i)};`);
  const prices = (first: string, last: string) => [first, ...PRICES.slice(1, -1), last, ""].join("\n");

  /** SHOP-1 changes prices.ts, is reviewed, then merges main: verified on the merge, reviewed before it. */
  function mergedFromMain(mainChanges: Record<string, string>): { root: string; config: PeerAiConfig } {
    const { root, config } = shop();
    writeFileSync(join(root, "apps/web/prices.ts"), prices(PRICES[0] ?? "", PRICES[11] ?? ""));
    commitAll(root);
    git(root, "switch", "-qc", "feature/SHOP-1-cart");
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    value(advanceWorkItem(root, config, "SHOP-1", "build", NOW));
    writeFileSync(join(root, "apps/web/prices.ts"), prices("export const price0 = 100;", PRICES[11] ?? ""));
    const reviewed = commitAll(root);
    git(root, "switch", "-q", "main");
    for (const [file, content] of Object.entries(mainChanges)) writeFileSync(join(root, file), content);
    commitAll(root);
    git(root, "switch", "-q", "feature/SHOP-1-cart");
    git(root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "merge", "-q", "--no-edit", "main");
    const item = value(loadWorkItem(root, "SHOP-1"));
    value(
      saveWorkItem(root, config, {
        ...item,
        stage: "verify",
        requiredReviews: [{ skill: "code-review", reason: "it changes code" }],
        reviews: [{ skill: "code-review", result: "pass", at: NOW.toISOString(), commit: reviewed }],
      }),
    );
    value(recordVerify(root, config, "SHOP-1", "pass", NOW, git(root, "rev-parse", "HEAD")));
    return { root, config };
  }

  it("keep a review when the merge brings in only other files", () => {
    const { root, config } = mergedFromMain({ "apps/web/Total.tsx": "export const Total = () => null;\n" });
    expect(value(advanceWorkItem(root, config, "SHOP-1", "ship", NOW)).stage).toBe("ship");
  });

  it("don't keep one when the merge changes a file the item changes too", () => {
    const { root, config } = mergedFromMain({
      "apps/web/prices.ts": prices(PRICES[0] ?? "", "export const price11 = 1100;"),
    });
    const moved = advanceWorkItem(root, config, "SHOP-1", "ship", NOW);
    expect(moved.ok ? "" : moved.error).toContain("its code-review looked at");
  });

  it("are what the gate says in the job's summary on the pull request", async () => {
    const { root, config } = mergedFromMain({
      "apps/web/prices.ts": prices(PRICES[0] ?? "", "export const price11 = 1100;"),
    });
    const item = value(loadWorkItem(root, "SHOP-1"));
    value(saveWorkItem(root, config, { ...item, stage: "ship" }));
    const summary = join(root, "summary.md");
    writeFileSync(summary, "");
    expect(runCheck({ cwd: root, json: false, branch: "feature/SHOP-1-cart", summary }, capture())).toBe(1);
    const text = readFileSync(summary, "utf8");
    expect(text).toMatch(/^### peer-ai check failed: \d+ problems? to fix before this merges/);
    expect(text).toContain("- **Fails:** SHOP-1 is at ship, but its code-review looked at");
    expect(await main(["check", "--branch", "feature/SHOP-1-cart"], { cwd: root, out: capture() })).toBe(1);
  });
});
