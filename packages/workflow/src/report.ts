import { z } from "zod";
import { SKILL_IDS } from "./ids.ts";

// A review report shows a review's work: what it looked at, what it read first, every rule it
// checked and how each went, and every problem it found. Peer AI works out the review's result
// from the report instead of taking the agent's word for it (RFC 0002).

/** How serious a problem is, most serious first. A review may not invent its own levels. */
export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type ReviewResult = "pass" | "fail" | "incomplete";

const Path = z.string().min(1);
const Timestamp = z.iso.datetime({ offset: true });
const Text = z.string().min(1);

const Location = z
  .strictObject({
    file: Path,
    line: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
  })
  .superRefine((location, ctx) => {
    if (location.endLine === undefined) return;
    if (location.line === undefined || location.endLine < location.line) {
      ctx.addIssue({ code: "custom", path: ["endLine"], message: "endLine needs a line, and can't come before it" });
    }
  });

const InventoryItem = z.strictObject({
  id: Text.describe("A stable id for something under review, such as route:GET /orders/{id}."),
  kind: Text.describe("What it is: a route, screen, migration, service, dependency, file and so on."),
  location: Location.optional(),
});

const Coverage = z
  .strictObject({
    rule: Text.describe("The id of the rule checked."),
    item: Text.optional().describe("The inventory id it was checked against. Omit it for the whole scope."),
    status: z.enum(["pass", "fail", "not-applicable", "not-checked"]),
    evidence: Text.optional().describe("For a pass: what was checked, and where."),
    finding: Text.optional().describe("For a fail: the id of the problem found."),
    reason: Text.optional().describe("For not-applicable or not-checked: why."),
    checkedBy: z
      .enum(["tool", "reading"])
      .optional()
      .describe(
        "For a pass of an automatic rule: whether its tool checked it, or it was checked by reading the code. Reading when left out (RFC 0019).",
      ),
  })
  .superRefine((entry, ctx) => {
    const need = (field: "evidence" | "finding" | "reason", why: string) => {
      if (entry[field] === undefined) ctx.addIssue({ code: "custom", path: [field], message: why });
    };
    if (entry.status === "pass") need("evidence", "a pass says what was checked");
    if (entry.status === "fail") need("finding", "a fail names the problem it found");
    if (entry.status === "not-applicable") need("reason", "say why the rule doesn't apply");
    if (entry.status === "not-checked") need("reason", "say why the rule wasn't checked");
  });

const Finding = z
  .strictObject({
    id: Text,
    rule: Text,
    severity: z.enum(SEVERITIES),
    status: z.enum(["open", "fixed", "accepted"]),
    title: Text,
    location: Location,
    evidence: Text.describe("What shows the problem is real."),
    fix: Text.optional().describe("A suggested fix."),
    acceptedBy: Text.optional().describe("For an accepted risk: who accepted it."),
    reason: Text.optional().describe("For an accepted risk: why it was accepted."),
  })
  .superRefine((finding, ctx) => {
    if (finding.status !== "accepted") return;
    if (finding.acceptedBy === undefined) {
      ctx.addIssue({ code: "custom", path: ["acceptedBy"], message: "an accepted risk says who accepted it" });
    }
    if (finding.reason === undefined) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "an accepted risk says why" });
    }
  });

export const ReviewReportSchema = z
  .strictObject({
    $schema: z.string().optional(),
    version: z.literal(1),
    skill: z.enum(SKILL_IDS),
    workItem: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
      .optional()
      .describe("The work item reviewed. Omit it for a review of the whole project."),
    at: Timestamp,
    scope: z
      .strictObject({
        base: Text.optional().describe("The commit the change starts from."),
        head: Text.optional().describe("The commit reviewed."),
        tracks: z.array(Text).optional(),
        files: z.array(Path).optional(),
      })
      .describe("What was reviewed."),
    inputs: z.array(Text).describe("Every document, profile, rule pack and decision the review read first."),
    inventory: z.array(InventoryItem).describe("Everything under review."),
    coverage: z.array(Coverage).min(1).describe("How each rule went. A rule is never left out silently."),
    findings: z.array(Finding),
    result: z.enum(["pass", "fail", "incomplete"]).describe("Must agree with the findings and coverage."),
    depth: z
      .enum(["light", "full"])
      .optional()
      .describe("light: the changed lines only, for a weak trigger (RFC 0016). Full when left out."),
    summary: z.string().min(1).max(500).describe("A short summary for people."),
  })
  .superRefine((report, ctx) => {
    const items = new Set<string>();
    report.inventory.forEach((item, i) => {
      if (items.has(item.id))
        ctx.addIssue({ code: "custom", path: ["inventory", i, "id"], message: `duplicate id "${item.id}"` });
      items.add(item.id);
    });
    const findings = new Map<string, string>();
    report.findings.forEach((finding, i) => {
      if (findings.has(finding.id)) {
        ctx.addIssue({ code: "custom", path: ["findings", i, "id"], message: `duplicate id "${finding.id}"` });
      }
      findings.set(finding.id, finding.rule);
    });
    const failed = new Set<string>();
    report.coverage.forEach((entry, i) => {
      if (entry.item !== undefined && !items.has(entry.item)) {
        ctx.addIssue({
          code: "custom",
          path: ["coverage", i, "item"],
          message: `"${entry.item}" is not in the inventory`,
        });
      }
      if (entry.finding === undefined) return;
      const rule = findings.get(entry.finding);
      if (rule === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["coverage", i, "finding"],
          message: `"${entry.finding}" is not a finding`,
        });
      } else if (rule !== entry.rule) {
        ctx.addIssue({
          code: "custom",
          path: ["coverage", i, "finding"],
          message: `finding "${entry.finding}" is for rule ${rule}, not ${entry.rule}`,
        });
      }
      failed.add(entry.finding);
    });
    report.findings.forEach((finding, i) => {
      if (!failed.has(finding.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["findings", i, "id"],
          message: `no coverage entry fails for "${finding.id}"; every problem found is a failed check`,
        });
      }
    });
  })
  .meta({
    title: "Peer AI review report",
    description:
      ".peer-ai/reports/<work item>/<skill>-<time>.json: what a review looked at, every rule it checked, and every problem it found.",
  });

export type ReviewReport = z.output<typeof ReviewReportSchema>;

/**
 * The result a report supports: fail when an open problem is at or above the blocking level,
 * incomplete when a rule wasn't checked, pass otherwise. Fixed and accepted problems don't block.
 * A tester's check of acceptance criteria fails on any criterion that doesn't hold, whatever its
 * finding's severity: that is the one question it answers (RFC 0015).
 */
export function deriveResult(report: ReviewReport, blockOn: Severity = "critical"): ReviewResult {
  const blocking = SEVERITIES.indexOf(blockOn);
  if (
    report.findings.some((finding) => finding.status === "open" && SEVERITIES.indexOf(finding.severity) <= blocking)
  ) {
    return "fail";
  }
  if (report.skill === "qa-acceptance" && unmetCriteria(report).length > 0) return "fail";
  if (report.coverage.some((entry) => entry.status === "not-checked")) return "incomplete";
  return "pass";
}

/** The acceptance criteria a qa-acceptance report found not met: its failed lines on a criterion. */
export function unmetCriteria(report: ReviewReport): string[] {
  return report.coverage
    .filter((entry) => entry.status === "fail" && entry.item?.startsWith("criterion:") === true)
    .map((entry) => entry.item ?? "");
}

/** How many problems a report leaves open at each severity, leaving out those with none (RFC 0015). */
export type OpenCounts = Partial<Record<Severity, number | undefined>>;

export function openCounts(report: ReviewReport): OpenCounts {
  const counts: OpenCounts = {};
  for (const finding of report.findings) {
    if (finding.status === "open") counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
  }
  return counts;
}

/**
 * A result with what it leaves open, the most serious first, and the automatic rules it only read
 * (RFC 0019): "pass, 7 high and 3 medium open, 2 automatic rules checked by reading only".
 */
export function describeResult(result: ReviewResult, open: OpenCounts | undefined, readOnly = 0): string {
  const parts = SEVERITIES.flatMap((severity) => {
    const count = open?.[severity] ?? 0;
    return count === 0 ? [] : [`${String(count)} ${severity}`];
  });
  const listed = parts.length <= 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1) ?? ""}`;
  const read =
    readOnly === 0
      ? []
      : [`${String(readOnly)} automatic ${readOnly === 1 ? "rule" : "rules"} checked by reading only`];
  return [result, ...(listed === undefined ? [] : [`${listed} open`]), ...read].join(", ");
}
