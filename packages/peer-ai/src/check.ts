// peer-ai check: the gate CI runs. It fails when the setup is broken, or when a work item claims
// more than its record shows: an item at ship or done without a passing verify or reviews, or a
// gap marked done that a fresh assessment still finds. Gaps on the map never fail it; they are
// reported, so they become work items instead of blockers. The project's stage sets how strict
// it is.

import { MAP_ITEM_IDS, type KnownMapItemId, type PeerAiConfig, type WorkItem } from "@peer-ai/workflow";
import { MAP_FILE, assess, gaps, loadConfig, type Assessment } from "./assess.ts";
import { count, fail, formatChecks, ok, plural, warn, type Check } from "./checks.ts";
import { CONFIG_FILE } from "./detect.ts";
import { checkTracks, checkWorkItems } from "./doctor.ts";
import type { Output, Stage } from "./init.ts";
import { mapChanges, readMap, readWorkItems } from "./state.ts";

export interface Verdict {
  name: string;
  stage: Stage;
  ok: boolean;
  checks: Check[];
}

type Review = NonNullable<WorkItem["reviews"]>[number];

/** Work at these stages says it has been verified and reviewed. */
const CLAIMS_VERIFIED: WorkItem["stage"][] = ["ship", "done"];
const OPEN: WorkItem["stage"][] = ["prepare", "build", "verify", "ship"];
const COMMIT_MAP = `Run peer-ai assess, and commit ${MAP_FILE}.`;

const isKnownItem = (id: string): id is KnownMapItemId => (MAP_ITEM_IDS as readonly string[]).includes(id);

/** The most recent review from each skill: a later pass supersedes an earlier failure. */
function latestReviews(item: WorkItem): Review[] {
  const latest = new Map<string, Review>();
  for (const review of item.reviews ?? []) {
    const seen = latest.get(review.skill);
    if (seen === undefined || Date.parse(review.at) >= Date.parse(seen.at)) latest.set(review.skill, review);
  }
  return [...latest.values()];
}

function gateWorkItem(item: WorkItem, config: PeerAiConfig, stage: Stage, assessment: Assessment): Check[] {
  const checks: Check[] = [];
  const claim = `${item.id} is at ${item.stage}`;
  const backToBuild = "or move the item back to build.";
  const verifyCommand = config.commands?.verify ?? undefined;

  if (item.lastVerify?.result === "fail") {
    checks.push(
      fail("gates", `${claim}, but its last verify failed.`, `Fix what failed and verify again, ${backToBuild}`),
    );
  } else if (item.lastVerify === undefined && verifyCommand !== undefined) {
    checks.push(
      fail(
        "gates",
        `${claim}, but it has no recorded verify.`,
        `Run ${verifyCommand} and record the result on the work item, ${backToBuild}`,
      ),
    );
  }

  for (const review of latestReviews(item)) {
    // A prototype accepts a review that didn't cover every rule; a failed one still stops it.
    if (review.result === "pass" || (review.result === "incomplete" && stage === "prototype")) continue;
    checks.push(
      review.result === "fail"
        ? fail(
            "gates",
            `${claim}, but its latest ${review.skill} failed.`,
            `Fix the findings and review again, ${backToBuild}`,
          )
        : fail(
            "gates",
            `${claim}, but its latest ${review.skill} is incomplete: it didn't check every rule.`,
            `Review again until every rule is checked, ${backToBuild}`,
          ),
    );
  }

  if (item.kind === "gap" && item.stage === "done" && item.gap !== undefined && isKnownItem(item.gap)) {
    const status = assessment.items[item.gap].status;
    if (status !== "present" && status !== "not-applicable") {
      checks.push(
        fail(
          "gates",
          `${item.id} says the ${item.gap} gap is done, but a fresh assessment finds it ${status}.`,
          `Finish the work, ${backToBuild}`,
        ),
      );
    }
  }
  return checks;
}

function checkGates(items: WorkItem[], config: PeerAiConfig, stage: Stage, assessment: Assessment): Check[] {
  const claiming = items.filter((item) => CLAIMS_VERIFIED.includes(item.stage));
  const failures = claiming.flatMap((item) => gateWorkItem(item, config, stage, assessment));
  if (failures.length > 0) return failures;
  if (claiming.length === 0) return [ok("gates", "No work items at ship or done yet")];
  return [ok("gates", `${plural(claiming.length, "work item")} at ship or done, each verified and reviewed`)];
}

function checkVerifyCommand(config: PeerAiConfig, stage: Stage): Check[] {
  if (stage === "prototype" || (config.commands?.verify ?? undefined) !== undefined) return [];
  return [
    warn(
      "verify",
      "No verify command is set, so nothing is verified before work is called done.",
      `Set commands.verify in ${CONFIG_FILE}, for example "npm test" or "make check".`,
    ),
  ];
}

function checkMap(root: string, assessment: Assessment): Check {
  const read = readMap(root);
  if (read === undefined) return warn("map", "There is no project map yet.", COMMIT_MAP);
  if (!read.ok) return fail("map", `${MAP_FILE} ${read.error}`, COMMIT_MAP);
  const changed = mapChanges(read.value, assessment);
  if (changed.length > 0) return warn("map", `The project map is out of date: ${changed.join(", ")}.`, COMMIT_MAP);
  return ok("map", "The project map is up to date");
}

/** What the stage needs and is missing should each have an open gap work item. */
function checkGapsTracked(assessment: Assessment, stage: Stage, items: WorkItem[]): Check {
  if (stage === "prototype") return ok("gaps", "Nothing on the map is required at the prototype stage");
  const needed = gaps(assessment, stage);
  if (needed.length === 0) return ok("gaps", `Everything the ${stage} stage needs is in place`);
  const tracked = new Set(items.filter((item) => item.kind === "gap" && OPEN.includes(item.stage)).map((i) => i.gap));
  const untracked = needed.filter((id) => !tracked.has(id));
  if (untracked.length === 0) return ok("gaps", `${plural(needed.length, "gap")} for ${stage}, each with a work item`);
  return warn(
    "gaps",
    `${plural(untracked.length, "gap")} for ${stage} with no work item: ${untracked.join(", ")}.`,
    "Add a gap work item for each, so they are planned rather than forgotten.",
  );
}

export function evaluate(root: string, config: PeerAiConfig): Verdict {
  const stage = config.project.stage ?? "mvp";
  const assessment = assess(root, config, stage);
  const trackFailures = checkTracks(root, config).filter((check) => check.status === "fail");
  const items = readWorkItems(root).flatMap(({ item }) => (item.ok ? [item.value] : []));
  const checks = [
    ok("config", `${CONFIG_FILE} is valid`),
    ...(trackFailures.length > 0 ? trackFailures : [ok("tracks", "Every track's folder exists")]),
    checkMap(root, assessment),
    ...checkWorkItems(root, config),
    ...checkGates(items, config, stage, assessment),
    ...checkVerifyCommand(config, stage),
    checkGapsTracked(assessment, stage, items),
  ];
  return { name: config.project.name, stage, ok: count(checks, "fail") === 0, checks };
}

export function formatVerdict(verdict: Verdict): string[] {
  const failures = count(verdict.checks, "fail");
  const warnings = count(verdict.checks, "warn");
  const andWarnings = warnings === 0 ? "" : `, and ${plural(warnings, "warning")}`;
  return [
    `Peer AI check: ${verdict.name} (stage: ${verdict.stage})`,
    "",
    ...formatChecks(verdict.checks),
    "",
    failures > 0
      ? `Failed: ${plural(failures, "problem")}${andWarnings}.`
      : `Passed${warnings === 0 ? "" : `, with ${plural(warnings, "warning")}`}.`,
  ];
}

export interface CheckOptions {
  cwd: string;
  json: boolean;
}

/** Exit code 0 when it passes, even with warnings; 1 when it fails; 2 without a valid config. */
export function runCheck(options: CheckOptions, out: Output): number {
  const { config, errors } = loadConfig(options.cwd);
  if (config === undefined) {
    if (errors === undefined) out.error(`There is no ${CONFIG_FILE}. Run peer-ai init first.`);
    else {
      out.error(`${CONFIG_FILE} is not valid:`);
      for (const error of errors) out.error(`  ${error}`);
    }
    return 2;
  }
  const verdict = evaluate(options.cwd, config);
  if (options.json) out.log(JSON.stringify(verdict, null, 2));
  else for (const line of formatVerdict(verdict)) out.log(line);
  return verdict.ok ? 0 : 1;
}
