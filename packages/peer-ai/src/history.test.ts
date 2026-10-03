import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PeerAiConfig, WorkItem } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { evaluate } from "./check.ts";
import { closeIntoHistory, readHistory } from "./history.ts";
import { runRender } from "./render.ts";
import { capture, cleanUp, project } from "./test-helpers.ts";
import { checkTidy, runTidy } from "./tidy.ts";
import { advanceWorkItem, createWorkItem, loadWorkItem, recordReview, saveWorkItem } from "./work.ts";

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
function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const CONFIG = JSON.stringify({
  version: 1,
  project: { name: "Shop", stage: "mvp" },
  tools: ["claude-code"],
  tracks: [{ id: "web", kind: "web", status: "active" }],
  tracker: { kind: "linear", ticketPrefix: "SHOP" },
});

function shop(options: { git?: boolean } = {}): { root: string; config: PeerAiConfig } {
  const root = project({ "peer-ai.config.json": CONFIG }, options);
  const { config } = loadConfig(root);
  if (config === undefined) throw new Error("the test config is not valid");
  return { root, config };
}

/** An item at ship, verified, with a report in its folder. */
function shipped(root: string, config: PeerAiConfig, id: string, extra: Partial<WorkItem> = {}): WorkItem {
  const created = value(createWorkItem(root, config, { id, title: `Work ${id}`, kind: "feature" }, NOW));
  mkdirSync(join(root, ".peer-ai/reports", id), { recursive: true });
  writeFileSync(join(root, ".peer-ai/reports", id, "code-review.json"), "{}");
  return value(
    saveWorkItem(root, config, {
      ...created,
      ...extra,
      stage: "ship",
      lastVerify: { result: "pass", at: NOW.toISOString() },
    }),
  );
}

describe("closed work leaves the tree (RFC 0017)", () => {
  it("becomes one line in the month's history, with its file and reports gone, and is still read by id", () => {
    const { root, config } = shop();
    shipped(root, config, "SHOP-1");
    expect(value(advanceWorkItem(root, config, "SHOP-1", "done", NOW)).stage).toBe("done");
    expect(existsSync(join(root, ".peer-ai/work/SHOP-1.json"))).toBe(false);
    expect(existsSync(join(root, ".peer-ai/reports/SHOP-1"))).toBe(false);
    expect(readFileSync(join(root, ".peer-ai/history/2026-10.jsonl"), "utf8").trim().split("\n")).toHaveLength(1);
    expect(readHistory(root)).toEqual([
      expect.objectContaining({ id: "SHOP-1", stage: "done", by: "ship", verify: { result: "pass" } }),
    ]);
    expect(value(loadWorkItem(root, "SHOP-1"))).toMatchObject({ id: "SHOP-1", stage: "done", title: "Work SHOP-1" });

    value(createWorkItem(root, config, { id: "SHOP-2", title: "Dropped", kind: "chore" }, NOW));
    value(advanceWorkItem(root, config, "SHOP-2", "cancelled", NOW));
    expect(readHistory(root).map((line) => [line.id, line.by])).toEqual([
      ["SHOP-1", "ship"],
      ["SHOP-2", "cancel"],
    ]);
  });

  it("still counts for the items that depend on it", () => {
    const { root, config } = shop();
    shipped(root, config, "SHOP-1");
    value(advanceWorkItem(root, config, "SHOP-1", "done", NOW));
    shipped(root, config, "SHOP-2", { dependsOn: ["SHOP-1"] });
    expect(evaluate(root, config).checks.filter((check) => check.status === "fail")).toEqual([]);
    expect(value(advanceWorkItem(root, config, "SHOP-2", "done", NOW)).stage).toBe("done");
  });

  it("merges without conflict when two branches each close an item", () => {
    const { root, config } = shop({ git: true });
    git(root, "symbolic-ref", "HEAD", "refs/heads/main");
    runRender({ cwd: root, check: false, quiet: true }, capture());
    expect(readFileSync(join(root, ".gitattributes"), "utf8")).toContain("/.peer-ai/history/*.jsonl merge=union");
    shipped(root, config, "SHOP-1");
    shipped(root, config, "SHOP-2");
    value(advanceWorkItem(root, config, "SHOP-1", "done", NOW));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "start");
    git(root, "switch", "-qc", "one");
    value(advanceWorkItem(root, config, "SHOP-2", "done", NOW));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "close SHOP-2");
    git(root, "switch", "-q", "main");
    value(createWorkItem(root, config, { id: "SHOP-4", title: "Other", kind: "chore" }, NOW));
    value(advanceWorkItem(root, config, "SHOP-4", "cancelled", NOW));
    git(root, "add", "-A");
    git(root, "commit", "-qm", "cancel SHOP-4");
    git(root, "merge", "-q", "--no-edit", "one");
    expect(
      readHistory(root)
        .map((line) => line.id)
        .sort(),
    ).toEqual(["SHOP-1", "SHOP-2", "SHOP-4"]);
  });

  it("is what peer-ai tidy does for closed items already in the tree, keeping whole-project reports", async () => {
    const { root, config } = shop();
    const done = shipped(root, config, "SHOP-1");
    value(saveWorkItem(root, config, { ...done, stage: "done" }));
    mkdirSync(join(root, ".peer-ai/reports/SHOP-9"), { recursive: true });
    mkdirSync(join(root, ".peer-ai/reports/project"), { recursive: true });
    writeFileSync(join(root, ".peer-ai/reports/project/security-review.json"), "{}");
    expect(checkTidy(root)).toEqual([
      expect.objectContaining({
        status: "warn",
        message: "Found 1 closed work item still in .peer-ai/work/, and 1 report folder of items that are gone.",
      }),
    ]);
    const out = capture();
    expect(await runTidy({ cwd: root, yes: true }, undefined, out)).toBe(0);
    expect(out.text()).toContain("Moved 1 closed item into .peer-ai/history/, and removed 1 report folder.");
    expect(readHistory(root).map((line) => line.id)).toEqual(["SHOP-1"]);
    expect(existsSync(join(root, ".peer-ai/reports/SHOP-9"))).toBe(false);
    expect(existsSync(join(root, ".peer-ai/reports/project/security-review.json"))).toBe(true);
    expect(checkTidy(root)).toEqual([]);
  });

  it("keeps one report per review: recording a skill again removes the report it replaces", () => {
    const { root, config } = shop();
    const item = shipped(root, config, "SHOP-1");
    const old = ".peer-ai/reports/SHOP-1/code-review.json";
    value(
      saveWorkItem(root, config, {
        ...item,
        reviews: [{ skill: "code-review", result: "fail", report: old, at: NOW.toISOString() }],
      }),
    );
    value(recordReview(root, config, "SHOP-1", { skill: "code-review", result: "pass" }, NOW));
    expect(existsSync(join(root, old))).toBe(false);
    expect(value(loadWorkItem(root, "SHOP-1")).reviews).toEqual([
      expect.objectContaining({ skill: "code-review", result: "pass", unproven: true }),
    ]);
  });

  it("writes a valid line even with nothing to remove", () => {
    const { root } = shop();
    const item: WorkItem = {
      version: 1,
      id: "SHOP-7",
      title: "Gone",
      kind: "chore",
      stage: "cancelled",
      next: "Closed",
      updatedAt: NOW.toISOString(),
    };
    expect(closeIntoHistory(root, item, "cancel", NOW)).toMatchObject({ id: "SHOP-7", by: "cancel" });
  });
});
