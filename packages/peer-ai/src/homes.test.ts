import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PeerAiConfig } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { checkDocumentOn } from "./document.ts";
import { allWorkItems, homeOf, locate, worktrees } from "./homes.ts";
import { cleanUp, project } from "./test-helpers.ts";
import {
  advanceWorkItem,
  createWorkItem,
  nextId,
  nextWork,
  recordReview,
  runVerify,
  updateWorkItem,
  type CommandRunner,
} from "./work.ts";

const agents: string[] = [];
afterEach(() => {
  cleanUp();
  for (const agent of agents.splice(0)) rmSync(agent, { recursive: true, force: true });
});

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
const error = (result: { ok: boolean; error?: string }) => (result.ok ? undefined : result.error);

/** A shop on main, and an agent's worktree for SHOP-1's branch next to it. */
function withAgent(): { root: string; agent: string; config: PeerAiConfig } {
  const root = project(
    {
      "peer-ai.config.json": JSON.stringify({
        version: 1,
        project: { name: "Shop", stage: "mvp" },
        tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active" }],
        tracker: { kind: "linear", ticketPrefix: "SHOP" },
        repo: { branchNaming: "feature/{ticket}-{slug}" },
        commands: { verify: "npm test" },
      }),
      "apps/web/package.json": JSON.stringify({ dependencies: { react: "19.0.0" } }),
    },
    { git: true },
  );
  commitAll(root);
  const agent = `${root}-agent`;
  agents.push(agent);
  git(root, "worktree", "add", "-q", "-b", "feature/SHOP-1-cart", agent);
  const { config } = loadConfig(root);
  if (config === undefined) throw new Error("the test config is not valid");
  return { root, agent, config };
}

describe("a work item's home (RFC 0010)", () => {
  it("is where its branch is checked out, in the main working copy or a worktree", () => {
    const { root, agent } = withAgent();
    expect(worktrees(root).map((worktree) => [realpathSync(worktree.path), worktree.branch])).toEqual([
      [realpathSync(root), git(root, "branch", "--show-current")],
      [realpathSync(agent), "feature/SHOP-1-cart"],
    ]);
    expect(realpathSync(homeOf(root, "feature/SHOP-1-cart") ?? "")).toBe(realpathSync(agent));
    expect(homeOf(root, "feature/nowhere")).toBeUndefined();
  });

  it("is where the tools read and write the item, so an agent's work never touches the main working copy", () => {
    const { root, agent, config } = withAgent();
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    expect(existsSync(join(agent, ".peer-ai/work/SHOP-1.json"))).toBe(true);
    expect(existsSync(join(root, ".peer-ai/work/SHOP-1.json"))).toBe(false);

    const base = git(agent, "rev-parse", "HEAD");
    expect(value(advanceWorkItem(root, config, "SHOP-1", "build", NOW))).toMatchObject({ stage: "build", base });
    value(updateWorkItem(root, config, "SHOP-1", { next: "Write the totals test" }, NOW));
    const stored = JSON.parse(readFileSync(join(agent, ".peer-ai/work/SHOP-1.json"), "utf8")) as { next: string };
    expect(stored.next).toBe("Write the totals test");

    // The agent asks for its own branch; the main working copy still sees the item among the open ones.
    expect(nextWork(root, config, "feature/SHOP-1-cart").current?.id).toBe("SHOP-1");
    expect(nextWork(root, config).current).toBeUndefined();
    expect(nextWork(root, config).open.map((item) => item.id)).toEqual(["SHOP-1"]);
    // A new item on another branch never takes the agent's id.
    expect(nextId(root, config)).toBe("SHOP-2");
  });

  it("is the copy on the item's own branch, when an older copy sits elsewhere", () => {
    const { root, agent, config } = withAgent();
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    const older = readFileSync(join(agent, ".peer-ai/work/SHOP-1.json"), "utf8").replace('"prepare"', '"cancelled"');
    mkdirSync(join(root, ".peer-ai/work"), { recursive: true });
    writeFileSync(join(root, ".peer-ai/work/SHOP-1.json"), older);
    expect(realpathSync(locate(root, "SHOP-1")?.home ?? "")).toBe(realpathSync(agent));
    expect(allWorkItems(root).map(({ item }) => [item.id, item.stage])).toEqual([["SHOP-1", "prepare"]]);
  });

  it("is where verify runs, on a commit of the item's own branch", async () => {
    const { root, agent, config } = withAgent();
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    value(advanceWorkItem(root, config, "SHOP-1", "build", NOW));
    writeFileSync(join(agent, "apps/web/cart.ts"), "export const cart = 1;\n");
    expect(error(await runVerify(root, config, "SHOP-1", () => NOW))).toBe(
      "The verify for SHOP-1 runs on a commit, and apps/web/cart.ts isn't committed. Commit it, then verify.",
    );
    const head = commitAll(agent);
    const ranIn: string[] = [];
    const run: CommandRunner = (_command, cwd) => {
      ranIn.push(realpathSync(cwd));
      return Promise.resolve({ code: 0, output: "ok" });
    };
    const verified = value(await runVerify(root, config, "SHOP-1", () => NOW, run));
    expect(ranIn).toEqual([realpathSync(agent)]);
    expect(verified.item.lastVerify).toMatchObject({ result: "pass", commit: head });

    // Its review is recorded in its home too, from a report the agent wrote there.
    const recorded = value(recordReview(root, config, "SHOP-1", { skill: "code-review", result: "pass" }, NOW));
    expect(recorded.reviews?.[0]).toMatchObject({ skill: "code-review", commit: head });

    git(root, "worktree", "remove", "--force", agent);
    expect(error(await runVerify(root, config, "SHOP-1", () => NOW))).toContain("There is no work item");
  });

  it("is where check_document reads a document an agent wrote on its branch", () => {
    const { root, agent } = withAgent();
    writeFileSync(join(agent, "docs-requirements.md"), "# Requirements\n");
    const input = { skill: "requirements-analysis", path: "docs-requirements.md" };
    expect(checkDocumentOn(root, input)).toEqual({ ok: false, error: "There is no document at docs-requirements.md." });
    expect(checkDocumentOn(root, { ...input, branch: "feature/SHOP-1-cart" }).ok).toBe(true);
    expect(checkDocumentOn(root, { ...input, branch: "feature/nowhere" })).toEqual({
      ok: false,
      error:
        "feature/nowhere isn't checked out anywhere, so there's no copy of docs-requirements.md on it to check. Check it out, then check the document again.",
    });
  });

  it("refuses to verify a branch that isn't checked out anywhere", async () => {
    const { root, agent, config } = withAgent();
    value(createWorkItem(root, config, { title: "Cart", kind: "feature", track: "web" }, NOW));
    const file = readFileSync(join(agent, ".peer-ai/work/SHOP-1.json"), "utf8");
    git(root, "worktree", "remove", "--force", agent);
    mkdirSync(join(root, ".peer-ai/work"), { recursive: true });
    writeFileSync(join(root, ".peer-ai/work/SHOP-1.json"), file);
    commitAll(root);
    expect(error(await runVerify(root, config, "SHOP-1", () => NOW))).toBe(
      "SHOP-1's branch, feature/SHOP-1-cart, isn't checked out anywhere, so there's nothing of it to verify. Check it out, with git switch feature/SHOP-1-cart or git worktree add <folder> feature/SHOP-1-cart, then verify.",
    );
  });
});
