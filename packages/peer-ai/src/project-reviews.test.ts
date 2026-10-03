import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { skillRuleIds } from "peer-ai-skills";
import type { PeerAiConfig } from "peer-ai-workflow";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./assess.ts";
import { evaluate } from "./check.ts";
import { cleanUp, project } from "./test-helpers.ts";
import { createWorkItem, nextWork, recordProjectReview } from "./work.ts";

afterEach(cleanUp);

const NOW = new Date("2026-10-03T09:00:00Z");
const REPORT = ".peer-ai/reports/project/security-review-20261003T0900Z.json";

/** A shop with a whole-project security review: one critical and one high finding open. */
function reviewed(stage: string): { root: string; config: PeerAiConfig } {
  const root = project({
    "peer-ai.config.json": JSON.stringify({
      version: 1,
      project: { name: "Shop", stage },
      tracks: [{ id: "api", kind: "backend", status: "active" }],
      tracker: { kind: "linear", ticketPrefix: "SHOP" },
    }),
  });
  const [first, second, ...rest] = skillRuleIds("security-review");
  if (first === undefined || second === undefined) throw new Error("security-review has no rules");
  const finding = (id: string, rule: string, severity: string, title: string) => ({
    id,
    rule,
    severity,
    status: "open",
    title,
    location: { file: "api/orders.ts", line: 10 },
    evidence: "Seen in the code.",
  });
  const report = {
    version: 1,
    skill: "security-review",
    at: NOW.toISOString(),
    scope: { tracks: ["api"] },
    inputs: [],
    inventory: [{ id: "route:GET /orders/{id}", kind: "route" }],
    coverage: [
      { rule: first, status: "fail", finding: "F-3" },
      { rule: second, status: "fail", finding: "F-7" },
      ...rest.map((rule) => ({ rule, status: "not-applicable", reason: "Nothing here is of its kind." })),
    ],
    findings: [
      finding("F-3", first, "critical", "Any signed-in user can read another user's order"),
      finding("F-7", second, "high", "Sessions never expire"),
    ],
    result: "fail",
    summary: "Fail, with 1 critical and 1 high finding open.",
  };
  mkdirSync(join(root, ".peer-ai/reports/project"), { recursive: true });
  writeFileSync(join(root, REPORT), JSON.stringify(report));
  const { config } = loadConfig(root);
  if (config === undefined) throw new Error("the test config is not valid");
  const recorded = recordProjectReview(root, config, { skill: "security-review", report: REPORT }, NOW);
  if (!recorded.ok) throw new Error(recorded.error);
  return { root, config };
}

const projectChecks = (root: string, config: PeerAiConfig) =>
  evaluate(root, config).checks.filter((check) => check.id === "project-reviews");

describe("whole-project reviews (RFC 0015)", () => {
  it("are recorded with their open findings, and kept in sight by next_work", () => {
    const { root, config } = reviewed("mvp");
    expect(nextWork(root, config).projectFindings).toEqual({
      critical: ["security-review#F-3 (critical): Any signed-in user can read another user's order"],
      uncovered: [
        "security-review#F-3 (critical): Any signed-in user can read another user's order",
        "security-review#F-7 (high): Sessions never expire",
      ],
    });
  });

  it("warn at the gate before production, and fail it at production", () => {
    const mvp = reviewed("mvp");
    expect(projectChecks(mvp.root, mvp.config).map((check) => check.status)).toEqual(["warn", "warn"]);
    const production = reviewed("production");
    expect(projectChecks(production.root, production.config)[0]).toEqual({
      id: "project-reviews",
      status: "fail",
      message:
        "Whole-project reviews leave 1 critical finding open: security-review#F-3 (critical): Any signed-in user can read another user's order.",
      fix: "Fix each in a work item that lists it in fixes, then run the review again.",
    });
  });

  it("are covered by the work items that list them in fixes, so only the rest are listed", () => {
    const { root, config } = reviewed("mvp");
    const created = createWorkItem(
      root,
      config,
      { title: "Orders belong to their owner", kind: "bug", fixes: ["security-review#F-3"] },
      NOW,
    );
    if (!created.ok) throw new Error(created.error);
    expect(nextWork(root, config).projectFindings?.uncovered).toEqual([
      "security-review#F-7 (high): Sessions never expire",
    ]);
  });
});
