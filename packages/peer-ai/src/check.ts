// peer-ai check: the gate CI runs. It fails when the setup is broken, or when a work item claims
// more than its record shows: an item at ship or done without a passing verify or reviews, or a
// gap marked done that a fresh assessment still finds. Gaps on the map never fail it; they are
// reported, so they become work items instead of blockers. The project's stage sets how strict
// it is.

import { appendFileSync } from "node:fs";
import { renderedName } from "peer-ai-skills";
import {
  MAP_ITEM_IDS,
  SEVERITIES,
  describeResult,
  type KnownMapItemId,
  type PeerAiConfig,
  type WorkItem,
} from "peer-ai-workflow";
import { MAP_FILE, assess, gaps, loadConfig, type Assessment } from "./assess.ts";
import { count, fail, formatChecks, ok, plural, warn, type Check } from "./checks.ts";
import { ciProblem, ciResult } from "./ci.ts";
import { changesFor, currentBranch, ownFiles } from "./commits.ts";
import { latestReviews, staleEvidence, type GateContext } from "./evidence.ts";
import { CONFIG_FILE } from "./detect.ts";
import { checkTracks, checkWorkItems, diagnose } from "./doctor.ts";
import type { Output, Stage } from "./init.ts";
import type { Runner } from "./feedback.ts";
import { closedItems } from "./history.ts";
import { ghIn } from "./merged.ts";
import { projectFindings, readProjectReviews } from "./project-reviews.ts";
import { mapChanges, readMap, readWorkItems } from "./state.ts";

export interface Verdict {
  name: string;
  stage: Stage;
  ok: boolean;
  checks: Check[];
  /** What doctor would fail on, which fails the build too (RFC 0007), and a count of its warnings. */
  setup: Check[];
}

/** Doctor's checks that check already makes itself. */
const CHECKED_HERE = new Set(["config", "tracks", "map", "work-items"]);

/**
 * The setup checks doctor makes: every failure, and one line counting the warnings. The skills
 * are left out, since CI never has them.
 */
export function setupChecks(root: string, nodeVersion?: string, today?: Date): Check[] {
  const diagnosis = diagnose(root, nodeVersion, today, { skills: false });
  const others = diagnosis.checks.filter((check) => !CHECKED_HERE.has(check.id));
  const warnings = count(others, "warn");
  return [
    ...others.filter((check) => check.status === "fail"),
    ...(warnings === 0
      ? []
      : [warn("setup", `${plural(warnings, "setup warning")}.`, "Run npx peer-ai doctor for the details.")]),
  ];
}

/** Work at these stages says it has been verified and reviewed. */
const CLAIMS_VERIFIED: WorkItem["stage"][] = ["ship", "done"];
const OPEN: WorkItem["stage"][] = ["prepare", "build", "verify", "ship"];
const COMMIT_MAP = `Run peer-ai assess, and commit ${MAP_FILE}.`;

const isKnownItem = (id: string): id is KnownMapItemId => (MAP_ITEM_IDS as readonly string[]).includes(id);

/**
 * Whether a work item may be at ship or done. `items` are the project's other work items, for its
 * dependencies (RFC 0005): an item can't ship before the items it depends on have. The item on the
 * branch being worked on, or one moving now, is held to the strictest rules (RFC 0010); items
 * finished on other branches keep the rules they were finished under.
 */
export function gateWorkItem(
  item: WorkItem,
  config: PeerAiConfig,
  stage: Stage,
  assessment: Assessment,
  items: WorkItem[] = [],
  context: GateContext = {},
): Check[] {
  const checks: Check[] = [];
  const claim = `${item.id} is at ${item.stage}`;
  const moving = context.moving !== undefined;
  const current = moving || (context.branch !== undefined && item.branch === context.branch);
  const backToBuild = "or move the item back to build.";
  const verifyCommand = config.commands?.verify ?? undefined;

  for (const id of item.dependsOn ?? []) {
    const dependency = items.find((other) => other.id === id);
    if (dependency !== undefined && CLAIMS_VERIFIED.includes(dependency.stage)) continue;
    checks.push(
      fail(
        "gates",
        dependency === undefined
          ? `${claim}, but it depends on ${id}, which isn't a work item.`
          : dependency.stage === "cancelled"
            ? `${claim}, but it depends on ${id}, which was cancelled.`
            : `${claim}, but it depends on ${id}, which is only at ${dependency.stage}.`,
        dependency?.stage === "cancelled" || dependency === undefined
          ? `Remove ${id} from its dependsOn, ${backToBuild}`
          : `Ship ${id} first, ${backToBuild}`,
      ),
    );
  }

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

  // A verify taken from CI is confirmed with GitHub for the change being made now (RFC 0013): a
  // record claiming a run that didn't pass fails, so it's better evidence than a verify here.
  const ci = item.lastVerify?.ci;
  const verifiedCommit = item.lastVerify?.commit;
  if (current && ci !== undefined && verifiedCommit !== undefined && context.ciResult !== undefined) {
    const found = context.ciResult(verifiedCommit, ci.check);
    const claimed = `${claim}, and its verify says CI's ${ci.check} passed on ${verifiedCommit.slice(0, 7)}`;
    if (found.status === "fail" || found.status === "missing") {
      checks.push(
        fail(
          "gates",
          `${claimed}, but GitHub says ${found.status === "fail" ? "it failed" : "no such check ran there"}.`,
          `Take the verify from CI again, or verify here, ${backToBuild}`,
        ),
      );
    } else if (found.status !== "pass") {
      checks.push(
        warn(
          "gates",
          `${claimed}, which couldn't be confirmed: ${ciProblem(found, ci.check, verifiedCommit) ?? ""}`,
          "Confirm it once GitHub can be asked, through gh.",
        ),
      );
    }
  }

  // The reviews the change needs (RFC 0004): a failure in production, and at the MVP stage for the
  // change being made now (RFC 0010); a warning for an MVP item finished before. A prototype is
  // only told, by next_work.
  // A light review covers a light requirement; a full one covers either. A waiver covers one too,
  // except a full requirement at production (RFC 0016).
  const recorded = new Map(latestReviews(item).map((review) => [review.skill, review]));
  const waived = new Set((item.waived ?? []).map((waiver) => waiver.skill));
  for (const required of item.requiredReviews ?? []) {
    if (stage === "prototype") continue;
    const review = recorded.get(required.skill);
    if (review !== undefined && (required.depth === "light" || review.depth !== "light")) continue;
    if (waived.has(required.skill) && (stage !== "production" || required.depth === "light")) continue;
    const message =
      review === undefined
        ? `${claim}, but it has no ${required.skill}, which it needs because ${required.reason}.`
        : `${claim}, but its ${required.skill} was a light review, and it needs a full one because ${required.reason}.`;
    const fix = `Use the ${renderedName(required.skill)} skill and record its review, ${backToBuild}`;
    checks.push(stage === "production" || current ? fail("gates", message, fix) : warn("gates", message, fix));
  }

  // Open high findings below the blocking level don't fail a review, so they're said here, before a
  // release, rather than hidden behind a pass (RFC 0015).
  const blocking = SEVERITIES.indexOf(config.gates?.blockOn ?? "critical");
  for (const review of latestReviews(item)) {
    const serious = SEVERITIES.filter(
      (severity, index) =>
        index > blocking && index <= SEVERITIES.indexOf("high") && (review.open?.[severity] ?? 0) > 0,
    );
    if (serious.length === 0) continue;
    checks.push(
      warn(
        "gates",
        `${claim}, and its ${review.skill} is ${describeResult(review.result, review.open, review.readOnly)}.`,
        "Fix them, or accept each in the report with its reason. To have them block, set gates.blockOn to high.",
      ),
    );
  }

  // At ship, the evidence must be from the latest commit; done is past the branch, so it isn't asked.
  const shipping = context.moving === "ship" || (!moving && item.stage === "ship");
  if (current && shipping) checks.push(...staleEvidence(item, claim, context, moving));

  for (const review of latestReviews(item)) {
    // A prototype accepts a review that didn't cover every rule; a failed one still stops it.
    const allowed = review.result === "pass" || (review.result === "incomplete" && stage === "prototype");
    if (!allowed) {
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
    } else if (review.report === undefined && stage !== "prototype") {
      // Without a report, the result is the agent's word (RFC 0002): a warning for an MVP, a
      // failure in production.
      const message = `${claim}, but its latest ${review.skill} has no report, so its result is unproven.`;
      const fix = "Write the review's report, and record the review again with it.";
      checks.push(stage === "production" ? fail("gates", message, fix) : warn("gates", message, fix));
    }
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

function checkGates(
  items: WorkItem[],
  config: PeerAiConfig,
  stage: Stage,
  assessment: Assessment,
  context: GateContext,
  known: WorkItem[] = items,
): Check[] {
  // An item closed because its branch was already merged claims no verify or reviews: it's listed,
  // so the record says what it holds (RFC 0013).
  const byMerge = items.filter((item) => item.stage === "done" && item.closed?.by === "merge");
  const claiming = items.filter((item) => CLAIMS_VERIFIED.includes(item.stage) && !byMerge.includes(item));
  const results = claiming.flatMap((item) => gateWorkItem(item, config, stage, assessment, known, context));
  // Every waiver is listed, with why and who decided, so no review is skipped silently (RFC 0016).
  const waivers = claiming.flatMap((item) =>
    (item.waived ?? []).map((waiver) =>
      ok("gates", `${item.id} waived its ${waiver.skill}: ${waiver.reason} (decided by ${waiver.by})`),
    ),
  );
  // So is each review that passed automatic rules by reading only, so it isn't taken for a tool's (RFC 0019).
  const read = claiming.flatMap((item) =>
    latestReviews(item)
      .filter((review) => (review.readOnly ?? 0) > 0)
      .map((review) =>
        ok("gates", `${item.id}'s ${review.skill} is ${describeResult(review.result, review.open, review.readOnly)}`),
      ),
  );
  const failures = results.filter((check) => check.status === "fail");
  const warnings = results.filter((check) => check.status === "warn");
  const merged =
    byMerge.length === 0
      ? []
      : [
          ok(
            "gates",
            `${plural(byMerge.length, "work item")} closed because ${byMerge.length === 1 ? "its branch was" : "their branches were"} already merged, without the ship gate: ${byMerge.map((item) => item.id).join(", ")}`,
          ),
        ];
  if (failures.length > 0) return [...failures, ...warnings, ...merged, ...waivers, ...read];
  if (claiming.length === 0) return [ok("gates", "No work items at ship or done yet"), ...merged];
  return [
    ok("gates", `${plural(claiming.length, "work item")} at ship or done, each verified and reviewed`),
    ...warnings,
    ...merged,
    ...waivers,
    ...read,
  ];
}

/**
 * What whole-project reviews leave open (RFC 0015): an open critical finding fails at production,
 * where it stops a release, and warns before; one no work item fixes is listed, so none is dropped.
 */
function checkProjectReviews(root: string, items: WorkItem[], stage: Stage): Check[] {
  const reviews = readProjectReviews(root);
  if (reviews.length === 0) return [];
  const { critical, uncovered } = projectFindings(reviews, items);
  const listed = (lines: string[]) =>
    lines.length <= 3 ? lines.join("; ") : `${lines.slice(0, 3).join("; ")}; and ${String(lines.length - 3)} more`;
  const checks: Check[] = [];
  if (critical.length > 0) {
    const message = `Whole-project reviews leave ${plural(critical.length, "critical finding")} open: ${listed(critical)}.`;
    const fix = "Fix each in a work item that lists it in fixes, then run the review again.";
    checks.push(stage === "production" ? fail("project-reviews", message, fix) : warn("project-reviews", message, fix));
  }
  if (uncovered.length > 0) {
    checks.push(
      warn(
        "project-reviews",
        `${plural(uncovered.length, "open finding")} from whole-project reviews ${uncovered.length === 1 ? "is" : "are"} in no work item's fixes: ${listed(uncovered)}.`,
        "Create work items for them, each listing the findings it fixes, as skill#finding.",
      ),
    );
  }
  return checks.length === 0
    ? [ok("project-reviews", `${plural(reviews.length, "whole-project review")} recorded, with nothing critical open`)]
    : checks;
}

/** Every dependency names a work item that exists, and no items wait on each other in a loop (RFC 0005). */
function checkDependencies(items: WorkItem[]): Check[] {
  const ids = new Set(items.map((item) => item.id));
  const problems: Check[] = [];
  for (const item of items) {
    for (const id of item.dependsOn ?? []) {
      if (!ids.has(id)) {
        problems.push(
          fail("plans", `${item.id} depends on ${id}, which isn't a work item.`, `Remove ${id} from its dependsOn.`),
        );
      }
    }
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  const reported = new Set<string>();
  for (const start of items) {
    // Follow the dependencies depth first; meeting an item already on the path is a loop.
    const path: string[] = [];
    const visit = (id: string): string[] | undefined => {
      if (path.includes(id)) return [...path.slice(path.indexOf(id)), id];
      if (reported.has(id)) return undefined;
      path.push(id);
      for (const next of byId.get(id)?.dependsOn ?? []) {
        const loop = visit(next);
        if (loop !== undefined) return loop;
      }
      path.pop();
      return undefined;
    };
    const loop = visit(start.id);
    if (loop !== undefined && !loop.some((id) => reported.has(id))) {
      for (const id of loop) reported.add(id);
      problems.push(
        fail(
          "plans",
          `Work items wait on each other in a loop: ${loop.join(" → ")}.`,
          "Remove one of the dependencies.",
        ),
      );
    }
  }
  if (problems.length > 0) return problems;
  const planned = items.filter((item) => (item.dependsOn ?? []).length > 0).length;
  return planned === 0 ? [] : [ok("plans", `${plural(planned, "work item")} with dependencies, each on a real item`)];
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

/**
 * On a pull request, the branch's work item must be at ship or done, so a change can't merge
 * before it's verified and reviewed (RFC 0010). A branch with no work item, such as a dependency
 * update, passes, and says so. A prototype is only told.
 */
function checkPullRequest(items: WorkItem[], branch: string, stage: Stage): Check {
  const item = items.find((candidate) => candidate.branch === branch && candidate.stage !== "cancelled");
  if (item === undefined) return ok("pull-request", `No work item is on ${branch}, so there's no record to hold it to`);
  if (CLAIMS_VERIFIED.includes(item.stage)) return ok("pull-request", `${item.id}, on ${branch}, is at ${item.stage}`);
  const message = `${item.id} is at ${item.stage}, so the change on ${branch} isn't verified and reviewed yet.`;
  const fix = `Move ${item.id} to ship before this merges: verify it, record the reviews it needs, then advance it.`;
  return stage === "prototype" ? warn("pull-request", message, fix) : fail("pull-request", message, fix);
}

export interface EvaluateOptions {
  /** The branch a pull request is for, when the check runs on one. */
  pullRequest?: string | undefined;
  /** gh, to confirm a verify taken from CI with GitHub (RFC 0013). */
  run?: Runner | undefined;
}

export type { GateContext };

export function evaluate(root: string, config: PeerAiConfig, options: EvaluateOptions = {}): Verdict {
  const stage = config.project.stage ?? "mvp";
  const assessment = assess(root, config, stage);
  const trackFailures = checkTracks(root, config).filter((check) => check.status === "fail");
  const items = readWorkItems(root).flatMap(({ item }) => (item.ok ? [item.value] : []));
  // Closed items have left the tree (RFC 0017), but what depends on them, or fixes a finding, still counts.
  const known = [...items, ...closedItems(root)];
  const checks = [
    ok("config", `${CONFIG_FILE} is valid`),
    ...(trackFailures.length > 0 ? trackFailures : [ok("tracks", "Every track's folder exists")]),
    checkMap(root, assessment),
    ...checkWorkItems(root, config),
    ...checkDependencies(known),
    ...checkProjectReviews(root, known, stage),
    ...checkGates(
      items,
      config,
      stage,
      assessment,
      {
        branch: options.pullRequest ?? currentBranch(root),
        changedSince: changesFor(root),
        ownFiles: ownFiles(root, config.repo?.defaultBranch),
        ciResult: (commit, check) => ciResult(commit, check, options.run ?? ghIn(root)),
      },
      known,
    ),
    ...(options.pullRequest === undefined ? [] : [checkPullRequest(items, options.pullRequest, stage)]),
    ...checkVerifyCommand(config, stage),
    checkGapsTracked(assessment, stage, items),
  ];
  const setup = setupChecks(root);
  return {
    name: config.project.name,
    stage,
    ok: count(checks, "fail") + count(setup, "fail") === 0,
    checks,
    setup,
  };
}

export function formatVerdict(verdict: Verdict): string[] {
  const all = [...verdict.checks, ...verdict.setup];
  const failures = count(all, "fail");
  const warnings = count(all, "warn");
  const andWarnings = warnings === 0 ? "" : `, and ${plural(warnings, "warning")}`;
  return [
    `Peer AI check: ${verdict.name} (stage: ${verdict.stage})`,
    "",
    ...formatChecks(verdict.checks),
    ...(verdict.setup.length === 0 ? [] : ["", "Setup, as peer-ai doctor checks it:", ...formatChecks(verdict.setup)]),
    "",
    failures > 0
      ? `Failed: ${plural(failures, "problem")}${andWarnings}.`
      : `Passed${warnings === 0 ? "" : `, with ${plural(warnings, "warning")}`}.`,
  ];
}

export interface CheckOptions {
  cwd: string;
  json: boolean;
  /** The branch a pull request is for: --branch, or GITHUB_HEAD_REF on GitHub Actions. */
  branch?: string | undefined;
  /** The job's summary on GitHub Actions, GITHUB_STEP_SUMMARY, where the gate says what it's waiting for. */
  summary?: string | undefined;
}

/**
 * What the gate found, for the job's summary on GitHub, which shows on the pull request's checks:
 * what failed or warns, each with its fix, so nobody has to read the log (RFC 0013).
 */
export function verdictSummary(verdict: Verdict): string {
  const problems = [...verdict.checks, ...verdict.setup].filter(
    (check) => check.status === "fail" || check.status === "warn",
  );
  const failures = count(problems, "fail");
  const heading =
    failures > 0
      ? `### peer-ai check failed: ${plural(failures, "problem")} to fix before this merges`
      : "### peer-ai check passed";
  return [
    heading,
    "",
    ...(problems.length === 0
      ? ["Every work item's record holds up."]
      : problems.map(
          (check) =>
            `- ${check.status === "fail" ? "**Fails:**" : "Warns:"} ${check.message}${check.fix === undefined ? "" : ` ${check.fix}`}`,
        )),
    "",
  ].join("\n");
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
  const verdict = evaluate(options.cwd, config, { pullRequest: options.branch });
  if (options.json) out.log(JSON.stringify(verdict, null, 2));
  else for (const line of formatVerdict(verdict)) out.log(line);
  if (options.summary !== undefined && options.summary !== "") appendFileSync(options.summary, verdictSummary(verdict));
  return verdict.ok ? 0 : 1;
}
