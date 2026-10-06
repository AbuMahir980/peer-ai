// A review says how it checked an automatic rule: by its tool, or by reading the code (RFC 0019).
// A tool counts as evidence only where it enforces the rule, as doctor finds it, so a report can't
// claim a tool that isn't running. And a result says how many automatic rules were passed by
// reading only, so a pass by eye is never taken for one a tool enforces.

import { CORE_RULES, PROFILES } from "peer-ai-standards";
import type { PeerAiConfig, ReviewReport } from "peer-ai-workflow";
import { unenforcedRules, whyUnenforced } from "./enforcers.ts";

const PROFILE_RULES = PROFILES.flatMap((profile) => profile.rules);

/** Rules meant to be enforced by a tool: the core's automatic rules, and the profiles'. */
const AUTOMATIC = new Set(
  [...CORE_RULES, ...PROFILE_RULES].filter((rule) => rule.check === "auto").map((rule) => rule.id),
);

/** The profile rules a tool checks that carry out a rule: the rule itself, for a profile's rule. */
const toolRules = (id: string): string[] =>
  PROFILE_RULES.filter((rule) => rule.enforcer !== undefined && (rule.id === id || rule.carries === id)).map(
    (rule) => rule.id,
  );

/** How many automatic rules the report passes by reading rather than by their tools. */
export function readOnlyCount(report: ReviewReport): number {
  const read = report.coverage.filter(
    (line) => line.status === "pass" && line.checkedBy !== "tool" && AUTOMATIC.has(line.rule),
  );
  return new Set(read.map((line) => line.rule)).size;
}

/**
 * Why a report's claim that a tool checked a rule can't hold, or undefined when every claim can:
 * the tool doesn't enforce it in a part the review covers. The parts are the tracks of the files in
 * scope; without them, the whole project.
 */
export function toolClaimProblem(
  root: string,
  config: PeerAiConfig,
  report: ReviewReport,
  parts?: readonly (string | undefined)[],
  today: Date = new Date(),
): string | undefined {
  const claims = report.coverage.filter((line) => line.status === "pass" && line.checkedBy === "tool");
  if (claims.length === 0) return undefined;
  const gaps = unenforcedRules(root, config, today);
  const scope = parts ?? [...config.tracks.map((track) => track.id), undefined];
  for (const line of claims) {
    for (const tool of toolRules(line.rule)) {
      for (const part of scope) {
        const why = whyUnenforced(gaps, tool, part);
        if (why === undefined) continue;
        const which = tool === line.rule ? "its tool" : `its tool, through ${tool}`;
        return `${line.rule} can't have been checked by ${which}${part === undefined ? "" : ` in ${part}`}: ${why} Check it by reading the code, and say checkedBy: reading.`;
      }
    }
  }
  return undefined;
}
