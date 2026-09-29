import { describe, expect, it } from "vitest";
import { deriveResult, validateReport, type ReviewReport } from "./index.ts";

const F1 = {
  id: "F1",
  rule: "SEC-AUTHZ-01",
  severity: "high",
  status: "open",
  title: "Any signed-in user can read another user's order",
  location: { file: "api/orders.ts", line: 58, endLine: 61 },
  evidence: "getOrder loads the order by id and never checks that it belongs to the caller.",
  fix: "Load the order by id and the caller's user id, and return 404 otherwise.",
};

/** The example from RFC 0002: one high problem, one rule not checked. */
const example = () => ({
  version: 1,
  skill: "security-review",
  workItem: "SHOP-12",
  at: "2026-10-05T10:00:00Z",
  scope: { base: "a1b2c3d", head: "e4f5a6b", tracks: ["api"] },
  inputs: ["docs/architecture.md", "docs/standards/api.md", "packs/ndpa"],
  inventory: [
    { id: "route:GET /orders/{id}", kind: "route", location: { file: "api/orders.ts", line: 58 } },
    { id: "route:POST /orders", kind: "route", location: { file: "api/orders.ts", line: 42 } },
  ],
  coverage: [
    { rule: "SEC-AUTHZ-01", item: "route:GET /orders/{id}", status: "fail", finding: "F1" },
    {
      rule: "SEC-AUTHZ-01",
      item: "route:POST /orders",
      status: "pass",
      evidence: "api/orders.ts:43 takes the owner from the session",
    },
    { rule: "SEC-RATE-01", status: "not-applicable", reason: "This change adds no public endpoint" },
    { rule: "SEC-LOG-03", status: "not-checked", reason: "Logging is set up in another repository" },
  ],
  findings: [F1],
  result: "fail",
  summary: "One high problem: any signed-in user can read another user's order.",
});

const errors = (input: unknown): string[] => {
  const result = validateReport(input);
  return result.ok ? [] : result.errors;
};

function valid(input: unknown): ReviewReport {
  const result = validateReport(input);
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.value;
}

describe("the review report", () => {
  it("accepts the example from RFC 0002", () => {
    expect(errors(example())).toEqual([]);
  });

  it("makes every check show its work: evidence for a pass, a reason for anything not checked", () => {
    const report = example();
    report.coverage = [
      { rule: "A", status: "pass" },
      { rule: "B", status: "fail" },
      { rule: "C", status: "not-applicable" },
      { rule: "D", status: "not-checked" },
    ] as never;
    report.findings = [];
    expect(errors(report)).toEqual([
      "coverage.0.evidence: a pass says what was checked",
      "coverage.1.finding: a fail names the problem it found",
      "coverage.2.reason: say why the rule doesn't apply",
      "coverage.3.reason: say why the rule wasn't checked",
    ]);
  });

  it("ties every problem to a failed check on the same rule, and every check to the inventory", () => {
    const report = example();
    report.coverage[0] = { rule: "SEC-OTHER-01", item: "route:DELETE /orders", status: "fail", finding: "F1" };
    expect(errors(report)).toEqual([
      'coverage.0.item: "route:DELETE /orders" is not in the inventory',
      'coverage.0.finding: finding "F1" is for rule SEC-AUTHZ-01, not SEC-OTHER-01',
    ]);
    const unlinked = example();
    unlinked.coverage.splice(0, 1);
    expect(errors(unlinked)).toEqual([
      'findings.0.id: no coverage entry fails for "F1"; every problem found is a failed check',
    ]);
  });

  it("needs a name and a reason for an accepted risk", () => {
    const report = example();
    report.findings[0] = { ...F1, status: "accepted" };
    expect(errors(report)).toEqual([
      "findings.0.acceptedBy: an accepted risk says who accepted it",
      "findings.0.reason: an accepted risk says why",
    ]);
  });

  it("uses only the four severity levels, and needs a line before an end line", () => {
    const report = example();
    report.findings[0] = {
      ...F1,
      severity: "severe",
      location: { file: "api/orders.ts", endLine: 3 },
    } as never;
    expect(errors(report)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^findings\.0\.severity: /) as string,
        "findings.0.location.endLine: endLine needs a line, and can't come before it",
      ]),
    );
  });
});

describe("working out a review's result", () => {
  it("fails on an open problem at or above the blocking level", () => {
    const report = valid(example());
    expect(deriveResult(report, "high")).toBe("fail");
    expect(deriveResult(report, "medium")).toBe("fail");
  });

  it("is incomplete below the blocking level when a rule wasn't checked", () => {
    expect(deriveResult(valid(example()))).toBe("incomplete");
    expect(deriveResult(valid(example()), "critical")).toBe("incomplete");
  });

  it("passes when every rule was checked and nothing blocks; fixed and accepted problems never block", () => {
    const report = example();
    report.coverage.pop();
    report.findings[0] = {
      ...F1,
      status: "accepted",
      acceptedBy: "@maintainer",
      reason: "Orders are public by design until accounts launch",
    } as never;
    expect(deriveResult(valid({ ...report, result: "pass" }), "low")).toBe("pass");
    report.findings[0] = { ...F1, status: "fixed" };
    expect(deriveResult(valid({ ...report, result: "pass" }), "low")).toBe("pass");
  });
});
