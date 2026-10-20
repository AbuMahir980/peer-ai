import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
import { advanceWorkItem, closedRecord, createWorkItem, loadWorkItem, nextWork, updateWorkItem } from "./work.ts";

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

  it("records done where the merge is, to land with the next pull request (RFC 0020)", () => {
    const { root, config, branch } = built();
    git(root, "merge", "-q", "--no-ff", "--no-edit", branch);
    // The merged branch is still checked out in its own worktree.
    const worktree = join(mkdtempSync(join(tmpdir(), "peer-ai-worktree-")), "work");
    git(root, "worktree", "add", "-q", worktree, branch);
    expect(value(advanceWorkItem(root, config, "SHOP-1", "done", NOW, noGitHub)).stage).toBe("done");
    expect(readHistory(root).map((line) => line.id)).toEqual(["SHOP-1"]);
    expect(readHistory(worktree)).toEqual([]);
    expect(nextWork(root, config).unlanded).toEqual([{ id: "SHOP-1", stage: "done" }]);
    commitAll(root);
    expect(nextWork(root, config).unlanded).toBeUndefined();
  });

  it("leaves out an older record of a closed item in another worktree, and never writes into it (#278)", () => {
    const { root, config, branch } = built();
    git(root, "merge", "-q", "--no-ff", "--no-edit", branch);
    const merge = git(root, "rev-parse", "HEAD");
    // The merged branch stays checked out in another agent's worktree, its record still at build.
    const worktree = join(mkdtempSync(join(tmpdir(), "peer-ai-worktree-")), "work");
    git(root, "worktree", "add", "-q", worktree, branch);
    const stale = readFileSync(join(worktree, ".peer-ai/work/SHOP-1.json"), "utf8");
    value(advanceWorkItem(root, config, "SHOP-1", "done", NOW, noGitHub));
    commitAll(root);

    // From either working copy, the item is done, and says where it merged.
    for (const here of [root, worktree]) {
      expect(nextWork(here, config).open.map((item) => item.id)).not.toContain("SHOP-1");
      expect(value(loadWorkItem(here, "SHOP-1"))).toMatchObject({
        stage: "done",
        next: `Closed: done on 2026-10-03, merged in ${merge.slice(0, 7)}.`,
      });
    }
    expect(closedRecord(worktree, "SHOP-1")?.merge).toEqual({ commit: merge });

    // Moving it back reopens it here, in the caller's own working copy, and leaves the other alone.
    const later = new Date("2026-10-04T09:00:00Z");
    expect(value(advanceWorkItem(root, config, "SHOP-1", "build", later, noGitHub)).stage).toBe("build");
    expect(readFileSync(join(worktree, ".peer-ai/work/SHOP-1.json"), "utf8")).toBe(stale);
    expect(existsSync(join(root, ".peer-ai/work/SHOP-1.json"))).toBe(true);
    // A record written since it closed stands: the item is open again, from here.
    expect(closedRecord(worktree, "SHOP-1")).toBeUndefined();
    expect(nextWork(worktree, config).open.map((item) => item.id)).toContain("SHOP-1");
  });

  it("won't record done on a branch that's gone, when no working copy holds the merge yet", () => {
    const { root, config, branch } = built();
    // GitHub merged it, but this checkout's default branch hasn't been pulled since.
    git(root, "switch", "-q", branch);
    const refused = advanceWorkItem(
      root,
      config,
      "SHOP-1",
      "done",
      NOW,
      gitHubSays(branch, [{ number: 7, mergeCommit: { oid: "b".repeat(40) } }]),
    );
    expect(refused.ok ? "" : refused.error).toContain(
      "SHOP-1's branch has merged, but no working copy here holds the merge yet",
    );
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
    expect(value(loadWorkItem(root, "SHOP-1")).next).toBe(
      `Closed: done on 2026-10-03, merged in pull request #214 (${oid.slice(0, 7)}).`,
    );
  });

  it("still holds an unmerged item to the gate", () => {
    const { root, config } = built();
    git(root, "switch", "-q", "feature/SHOP-1-work");
    const moved = advanceWorkItem(root, config, "SHOP-1", "done", NOW, noGitHub);
    expect(moved.ok ? "" : moved.error).toContain("SHOP-1 can't move to done yet");
  });

  it("leaves an item kept open after its merge, closes one by one, and skips what it's told (RFC 0020)", async () => {
    const { root, config, branch } = built();
    const others = [
      addItem(root, config, "SHOP-2", "apps/web/Total.tsx"),
      addItem(root, config, "SHOP-3", "apps/web/Notes.tsx"),
      addItem(root, config, "SHOP-4", "apps/web/Device.tsx"),
    ];
    for (const each of [branch, ...others]) git(root, "merge", "-q", "--no-ff", "--no-edit", each);
    const kept = { reason: "Device checks are still owed.", by: "Ada Obi" };
    value(updateWorkItem(root, config, "SHOP-4", { keepOpen: kept }, NOW));
    expect(checkMerged(root, config)).toEqual([
      expect.objectContaining({
        status: "ok",
        message: "SHOP-4 stays open after its merge: Device checks are still owed. (decided by Ada Obi)",
      }),
      expect.objectContaining({
        status: "warn",
        message: expect.stringContaining("SHOP-1, SHOP-2, SHOP-3.") as string,
      }),
    ]);

    // Chosen one by one: SHOP-1 stays, SHOP-2 and SHOP-3 close.
    const chosen = capture();
    const answers = scripted(["choose", false, true, true]);
    expect(await runCloseMerged({ cwd: root, yes: false, now: NOW, run: noGitHub }, answers, chosen)).toBe(0);
    expect(chosen.text()).toContain("Kept open: SHOP-4, Device checks are still owed. (decided by Ada Obi)");
    expect(readHistory(root).map((line) => line.id)).toEqual(["SHOP-2", "SHOP-3"]);

    // With --yes, --skip leaves SHOP-1 open too.
    const skipped = capture();
    expect(await runCloseMerged({ cwd: root, yes: true, skip: ["SHOP-1"], run: noGitHub }, undefined, skipped)).toBe(0);
    expect(skipped.text()).toContain("Skipped: SHOP-1, as asked.");
    expect(readHistory(root).map((line) => line.id)).toEqual(["SHOP-2", "SHOP-3"]);
    // Moving the item on ends the decision to keep it open.
    expect(value(advanceWorkItem(root, config, "SHOP-4", "verify", NOW, noGitHub))).not.toHaveProperty(
      "openAfterMerge",
    );
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
    expect(await runCloseMerged({ cwd: root, yes: false, run: noGitHub }, scripted(["none"]), declined)).toBe(1);
    expect(declined.text()).toContain("  SHOP-1 (build): Work, in ");
    expect(declined.text()).toContain("Nothing was closed.");
    expect(await runCloseMerged({ cwd: root, yes: false, run: noGitHub }, undefined, capture())).toBe(2);

    const out = capture();
    expect(await runCloseMerged({ cwd: root, yes: true, now: NOW, run: noGitHub }, undefined, out)).toBe(0);
    expect(out.text()).toContain(
      "Closed 2 items, each recording how, here. Commit the records with your next pull request.",
    );
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
