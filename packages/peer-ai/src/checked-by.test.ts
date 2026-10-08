import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { skillRuleIds } from "peer-ai-skills";
import { describeResult, type PeerAiConfig } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { standardsFor } from "./standards.ts";
import { unenforcedRules } from "./enforcers.ts";
import { cleanUp, project } from "./test-helpers.ts";
import { checkReport, createWorkItem, recordReview } from "./work.ts";

afterEach(cleanUp);

const NOW = "2026-10-06T09:00:00Z";
const PEER_AI_ESLINT = 'import peerAi from "peer-ai-eslint-config";\nexport default [...peerAi()];\n';

/** A new React shop, with or without Peer AI's ESLint settings. */
function shop(files: Record<string, string> = {}): { root: string; config: PeerAiConfig } {
  const root = project({
    "peer-ai.config.json": JSON.stringify({
      version: 1,
      project: { name: "Shop", stage: "mvp" },
      tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active", stack: ["typescript", "react"] }],
      standards: { profiles: ["react"] },
    }),
    "apps/web/tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
    ...files,
  });
  const { config } = loadConfig(root);
  if (config === undefined) throw new Error("the test config is not valid");
  return { root, config };
}

/** A code-review report that passes the rules given, each with how it was checked. */
function report(root: string, lines: [rule: string, checkedBy?: "tool" | "reading"][]): string {
  const path = ".peer-ai/reports/SHOP-1/code-review-20261006T0900Z.json";
  mkdirSync(join(root, ".peer-ai/reports/SHOP-1"), { recursive: true });
  writeFileSync(
    join(root, path),
    JSON.stringify({
      version: 1,
      skill: "code-review",
      workItem: "SHOP-1",
      at: NOW,
      scope: { tracks: ["web"] },
      inputs: [],
      inventory: [{ id: "screen:Booking", kind: "screen" }],
      coverage: lines.map(([rule, checkedBy]) => ({
        rule,
        status: "pass",
        evidence: "Booking.tsx:4 calls useBay by its own name.",
        ...(checkedBy === undefined ? {} : { checkedBy }),
      })),
      findings: [],
      result: "pass",
      summary: "Pass, with nothing open.",
    }),
  );
  return path;
}

const check = (root: string, config: PeerAiConfig, path: string) =>
  checkReport(root, config, { skill: "code-review", report: path }, "SHOP-1", [], ["web"]);

describe("a review says how it checked an automatic rule (RFC 0019)", () => {
  it("has standards_for_file say whether each rule's tool enforces it for the file", () => {
    const off = shop();
    const brief = (root: string, config: PeerAiConfig) =>
      standardsFor(
        config,
        root,
        "apps/web/src/Booking.tsx",
        undefined,
        unenforcedRules(root, config),
      )?.peerAiRules.find((rule) => rule.id === "REACT-11");
    expect(brief(off.root, off.config)).toMatchObject({ enforced: false, notEnforced: "There's no ESLint config." });
    const on = shop({ "eslint.config.mjs": PEER_AI_ESLINT });
    expect(brief(on.root, on.config)).toMatchObject({ enforced: true });
    expect(brief(on.root, on.config)).not.toHaveProperty("notEnforced");
  });

  it("never calls a rule enforced for a file in no part, which Peer AI's settings don't check (#223)", () => {
    const on = shop({ "eslint.config.mjs": PEER_AI_ESLINT });
    const rules = standardsFor(
      on.config,
      on.root,
      "eslint.config.mjs",
      undefined,
      unenforcedRules(on.root, on.config),
    )?.peerAiRules.filter((rule) => rule.enforced !== undefined);
    expect(rules?.length).toBeGreaterThan(0);
    for (const rule of rules ?? []) {
      expect(rule).toMatchObject({
        enforced: false,
        notEnforced: "This file is in no part of the project, and Peer AI's settings check only the parts' files.",
      });
    }
  });

  it("refuses a tool's word for a rule its tool doesn't enforce, and takes it where it does", () => {
    const off = shop();
    const claimed = check(off.root, off.config, report(off.root, [["REACT-11", "tool"]]));
    expect(claimed.ok ? "" : claimed.error).toBe(
      "REACT-11 can't have been checked by its tool in web: There's no ESLint config. Check it by reading the code, and say checkedBy: reading.",
    );
    // A core rule a profile's tool carries out is held to that tool too.
    const carried = check(off.root, off.config, report(off.root, [["CODE-16", "tool"]]));
    expect(carried.ok ? "" : carried.error).toContain("CODE-16 can't have been checked by its tool, through REACT-");
    expect(check(off.root, off.config, report(off.root, [["REACT-11", "reading"]])).ok).toBe(true);

    const on = shop({ "eslint.config.mjs": PEER_AI_ESLINT });
    const enforced = check(on.root, on.config, report(on.root, [["REACT-11", "tool"]]));
    expect(enforced.ok ? enforced.value : undefined).not.toHaveProperty("readOnly");
  });

  it("counts the automatic rules passed by reading, and every result says so", () => {
    const { root, config } = shop();
    const read = check(root, config, report(root, [["REACT-11"], ["REACT-01", "reading"], ["CODE-16"]]));
    // CODE-16 is reviewed by an AI, not a tool, so it isn't counted.
    expect(read.ok ? read.value.readOnly : undefined).toBe(2);
    expect(describeResult("pass", { high: 1 }, 2)).toBe("pass, 1 high open, 2 automatic rules checked by reading only");
    expect(describeResult("pass", undefined, 1)).toBe("pass, 1 automatic rule checked by reading only");
    expect(describeResult("fail", { critical: 1, low: 2 })).toBe("fail, 1 critical and 2 low open");
  });

  it("judges a review by the config of the worktree its branch is in (#236)", () => {
    const git = (cwd: string, ...args: string[]) =>
      execFileSync(
        "git",
        ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args],
        { cwd, stdio: "ignore" },
      );
    const settings = (enforcement: "report" | "enforce") =>
      JSON.stringify({
        version: 1,
        project: { name: "Shop", stage: "mvp" },
        tracks: [{ id: "web", kind: "web", path: "apps/web", status: "active", stack: ["typescript", "react"] }],
        tracker: { kind: "linear", ticketPrefix: "SHOP" },
        standards: { profiles: ["react"], enforcement },
      });
    // The main checkout only reports; the item's branch, in its own worktree, enforces.
    const root = project(
      { "peer-ai.config.json": settings("report"), "eslint.config.mjs": PEER_AI_ESLINT },
      { git: true },
    );
    git(root, "symbolic-ref", "HEAD", "refs/heads/main");
    git(root, "add", "-A");
    git(root, "commit", "-qm", "start");
    git(root, "switch", "-qc", "feature/SHOP-1-cart");
    writeFileSync(join(root, "peer-ai.config.json"), settings("enforce"));
    git(root, "commit", "-qam", "enforce");
    git(root, "switch", "-q", "main");
    const worktree = join(mkdtempSync(join(tmpdir(), "peer-ai-worktree-")), "cart");
    git(root, "worktree", "add", "-q", worktree, "feature/SHOP-1-cart");
    const { config } = loadConfig(root);
    if (config === undefined) throw new Error("the test config is not valid");
    const created = createWorkItem(
      root,
      config,
      { id: "SHOP-1", title: "Cart", kind: "feature", branch: "feature/SHOP-1-cart" },
      new Date(NOW),
    );
    if (!created.ok) throw new Error(created.error);
    const path = ".peer-ai/reports/SHOP-1/code-review-20261006T0900Z.json";
    mkdirSync(join(worktree, ".peer-ai/reports/SHOP-1"), { recursive: true });
    writeFileSync(
      join(worktree, path),
      JSON.stringify({
        version: 1,
        skill: "code-review",
        workItem: "SHOP-1",
        at: NOW,
        scope: { tracks: ["web"] },
        inputs: [],
        inventory: [{ id: "screen:Booking", kind: "screen" }],
        coverage: [
          ...skillRuleIds("code-review").map((rule) => ({
            rule,
            status: "not-applicable",
            reason: "Not in this change.",
          })),
          { rule: "REACT-11", status: "pass", evidence: "ESLint's react-hooks/hooks ran clean.", checkedBy: "tool" },
        ],
        findings: [],
        result: "pass",
        summary: "Pass, with nothing open.",
      }),
    );
    const recorded = recordReview(root, config, "SHOP-1", { skill: "code-review", report: path }, new Date(NOW));
    expect(recorded.ok ? "" : recorded.error).toBe("");
  });
});
