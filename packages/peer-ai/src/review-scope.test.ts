import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { skillRuleIds } from "peer-ai-skills";
import type { PeerAiConfig, WorkItem } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { cleanUp, project } from "./test-helpers.ts";
import { advanceWorkItem, createWorkItem, recordReview, reviewRules } from "./work.ts";

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

/** An item on its branch, built, whose commit changes the files given. */
function changing(files: Record<string, string>): { root: string; config: PeerAiConfig; item: WorkItem } {
  const root = project(
    {
      "peer-ai.config.json": JSON.stringify({
        version: 1,
        project: { name: "Shop", stage: "mvp" },
        tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active" }],
        tracker: { kind: "linear", ticketPrefix: "SHOP" },
        repo: { branchNaming: "feature/{ticket}-{slug}" },
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
  git(root, "switch", "-qc", "feature/SHOP-1-change");
  value(createWorkItem(root, config, { title: "Change", kind: "feature", track: "web" }, NOW));
  value(advanceWorkItem(root, config, "SHOP-1", "build", NOW));
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  git(root, "add", "-A");
  git(root, "commit", "-qm", "change");
  return { root, config, item: value(advanceWorkItem(root, config, "SHOP-1", "verify", NOW)) };
}

describe("a review's scope follows its change (RFC 0016)", { timeout: 20_000 }, () => {
  it("answers only for the rules that can apply to the files the change touched", () => {
    const docs = changing({ "docs/notes.md": "# Notes\n" });
    expect(reviewRules(docs.root, docs.config, docs.item, "security-review")).toEqual([]);
    const screen = changing({ "apps/web/Cart.tsx": "export const Cart = () => <main>Cart</main>;\n" });
    const rules = reviewRules(screen.root, screen.config, screen.item, "security-review");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.length).toBeLessThan(skillRuleIds("security-review").length);
  });

  it("accepts a report that answers for that scope, and refuses one that leaves part of it out", () => {
    const { root, config, item } = changing({ "apps/web/Cart.tsx": "export const Cart = () => <main>Cart</main>;\n" });
    const rules = reviewRules(root, config, item, "security-review");
    const report = (covered: string[]) => ({
      version: 1,
      skill: "security-review",
      workItem: "SHOP-1",
      at: NOW.toISOString(),
      scope: { tracks: ["web"] },
      inputs: [],
      inventory: [{ id: "screen:Cart", kind: "screen" }],
      coverage: covered.map((rule) => ({
        rule,
        status: "not-applicable",
        reason: "The cart shows no data of its own.",
      })),
      findings: [],
      result: "pass",
      summary: "Pass, with nothing open.",
    });
    const path = ".peer-ai/reports/SHOP-1/security-review.json";
    mkdirSync(join(root, ".peer-ai/reports/SHOP-1"), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(report(rules)));
    expect(
      value(recordReview(root, config, "SHOP-1", { skill: "security-review", report: path }, NOW)).reviews,
    ).toEqual([expect.objectContaining({ skill: "security-review", result: "pass" })]);
    writeFileSync(join(root, path), JSON.stringify(report(rules.slice(1))));
    const refused = recordReview(root, config, "SHOP-1", { skill: "security-review", report: path }, NOW);
    expect(refused.ok ? "" : refused.error).toContain(
      `The report leaves out 1 of security-review's rules: ${rules[0] ?? ""}.`,
    );
  });
});
