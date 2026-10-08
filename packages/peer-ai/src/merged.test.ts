import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PeerAiConfig } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { evaluate } from "./check.ts";
import { runCloseMerged } from "./close-merged.ts";
import type { Runner } from "./feedback.ts";
import { readHistory } from "./history.ts";
import { checkMerged } from "./merged.ts";
import { capture, cleanUp, project, scripted } from "./test-helpers.ts";
import { advanceWorkItem, createWorkItem } from "./work.ts";

afterEach(cleanUp);

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
const commitAll = (cwd: string): string => {
  git(cwd, "add", "-A");
  git(cwd, "commit", "-qm", "change");
  return git(cwd, "rev-parse", "HEAD");
};
function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

/** gh that knows nothing, as on a machine without it, or one that answers for one branch. */
const noGitHub: Runner = () => undefined;
const gitHubSays =
  (branch: string, answer: unknown): Runner =>
  (_command, args) =>
    args.includes(branch) ? JSON.stringify(answer) : "[]";

/** A shop on main with one item built on its own branch, committed there, and back on main. */
function built(id = "SHOP-1", file = "apps/web/Cart.tsx"): { root: string; config: PeerAiConfig; branch: string } {
  const root = project(
    {
      "peer-ai.config.json": JSON.stringify({
        version: 1,
        project: { name: "Shop", stage: "mvp" },
        tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active" }],
        tracker: { kind: "linear", ticketPrefix: "SHOP" },
        repo: { defaultBranch: "main", branchNaming: "feature/{ticket}-{slug}" },
        commands: { verify: "npm test" },
      }),
      "apps/web/package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
    },
    { git: true },
  );
  git(root, "symbolic-ref", "HEAD", "refs/heads/main");
  commitAll(root);
  const { config } = loadConfig(root);
  if (config === undefined) throw new Error("the test config is not valid");
  return { root, config, branch: addItem(root, config, id, file) };
}

function addItem(root: string, config: PeerAiConfig, id: string, file: string): string {
  const branch = `feature/${id}-work`;
  git(root, "switch", "-qc", branch);
  value(createWorkItem(root, config, { id, title: "Work", kind: "feature", track: "web" }, NOW));
  value(advanceWorkItem(root, config, id, "build", NOW, noGitHub));
  writeFileSync(join(root, file), `export const ${id.replace("-", "")} = true;\n`);
  commitAll(root);
  git(root, "switch", "-q", "main");
  return branch;
}

describe("closing work whose branch is already merged (RFC 0013)", { timeout: 20_000 }, () => {
  it("closes an item merged with a merge commit, recording the commit", () => {
    const { root, config, branch } = built();
    git(root, "merge", "-q", "--no-ff", "--no-edit", branch);
    const merge = git(root, "rev-parse", "HEAD");
    expect(value(advanceWorkItem(root, config, "SHOP-1", "done", NOW, noGitHub))).toMatchObject({
      stage: "done",
      closed: { by: "merge", commit: merge, at: NOW.toISOString() },
    });
  });

  it("closes one squashed into the default branch, whose files are all there as the branch left them", () => {
    const { root, config, branch } = built();
    git(root, "merge", "-q", "--squash", branch);
    git(root, "commit", "-qm", "squash");
    expect(value(advanceWorkItem(root, config, "SHOP-1", "done", NOW, noGitHub)).closed).toEqual({
      by: "merge",
      at: NOW.toISOString(),
    });
  });

  it("sees past Peer AI's own record, committed on the branch after it merged (#230)", () => {
    const { root, config, branch } = built();
    git(root, "merge", "-q", "--no-ff", "--no-edit", branch);
    // The branch gains a commit that changes only Peer AI's records, such as closing its item.
    git(root, "switch", "-q", branch);
    writeFileSync(join(root, ".peer-ai/notes.md"), "Closed after the merge.\n");
    commitAll(root);
    git(root, "switch", "-q", "main");
    expect(checkMerged(root, config)[0]?.message).toContain("merged already: SHOP-1.");
  });

  it("leaves an unstarted item alone, though another item's branch of its name merged (#230)", () => {
    const { root, config, branch } = built();
    git(root, "merge", "-q", "--no-ff", "--no-edit", branch);
    value(createWorkItem(root, config, { id: "SHOP-2", title: "Next", kind: "feature", track: "web", branch }, NOW));
    const listed = checkMerged(root, config)[0]?.message ?? "";
    expect(listed).toContain("SHOP-1");
    expect(listed).not.toContain("SHOP-2");
  });

  it("asks GitHub about a branch git no longer has", () => {
    const { root, config, branch } = built();
    git(root, "merge", "-q", "--squash", branch);
    git(root, "commit", "-qm", "squash");
    writeFileSync(join(root, "apps/web/Cart.tsx"), "export const changedSince = true;\n");
    commitAll(root);
    git(root, "branch", "-qD", branch);
    const oid = "a".repeat(40);
    const answer = [{ number: 214, mergeCommit: { oid } }];
    expect(value(advanceWorkItem(root, config, "SHOP-1", "done", NOW, gitHubSays(branch, answer))).closed).toEqual({
      by: "merge",
      commit: oid,
      pullRequest: 214,
      at: NOW.toISOString(),
    });
  });

  it("still holds an unmerged item to the gate", () => {
    const { root, config } = built();
    git(root, "switch", "-q", "feature/SHOP-1-work");
    const moved = advanceWorkItem(root, config, "SHOP-1", "done", NOW, noGitHub);
    expect(moved.ok ? "" : moved.error).toContain("SHOP-1 can't move to done yet");
  });

  it("closes every merged item at once, after listing them, and the gate accepts them", async () => {
    const { root, config, branch } = built();
    const second = addItem(root, config, "SHOP-2", "apps/web/Total.tsx");
    addItem(root, config, "SHOP-3", "apps/web/Notes.tsx");
    git(root, "merge", "-q", "--no-ff", "--no-edit", branch);
    git(root, "merge", "-q", "--no-ff", "--no-edit", second);

    expect(checkMerged(root, config)).toEqual([
      expect.objectContaining({
        id: "merged",
        status: "warn",
        message:
          "2 open work items look merged already: SHOP-1, SHOP-2. Their branches are in the default branch, or gone.",
      }),
    ]);

    const declined = capture();
    expect(await runCloseMerged({ cwd: root, yes: false, run: noGitHub }, scripted([false]), declined)).toBe(1);
    expect(declined.text()).toContain("  SHOP-1 (build): Work, in ");
    expect(declined.text()).toContain("Nothing was closed.");
    expect(await runCloseMerged({ cwd: root, yes: false, run: noGitHub }, undefined, capture())).toBe(2);

    const out = capture();
    expect(await runCloseMerged({ cwd: root, yes: true, now: NOW, run: noGitHub }, undefined, out)).toBe(0);
    expect(out.text()).toContain("Closed 2 items, each recording how.");
    expect(out.text()).not.toContain("SHOP-3");
    expect(checkMerged(root, config)).toEqual([]);
    expect(evaluate(root, config).checks.filter((check) => check.status === "fail")).toEqual([]);
    // Each is a line of the history, saying how it closed (RFC 0017).
    expect(readHistory(root).map((line) => [line.id, line.by])).toEqual([
      ["SHOP-1", "merge"],
      ["SHOP-2", "merge"],
    ]);
  });
});
