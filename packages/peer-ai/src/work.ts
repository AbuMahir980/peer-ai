// Work items: create them, record where work stands, verify and review them, and move them
// through their stages. Every change is validated against the work item schema before it is
// written, and a move to ship or done must pass the same gates as `peer-ai check`, so what an
// agent records is what CI will accept.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { availableSkills, skillRuleIds } from "peer-ai-skills";
import {
  SKILL_IDS,
  deriveResult,
  openCounts,
  type OpenCounts,
  validateReport,
  validateWorkItem,
  type ActivityId,
  type KnownMapItemId,
  type PeerAiConfig,
  type ReviewReport,
  type ReviewResult,
  type SkillId,
  type WorkItem,
} from "peer-ai-workflow";
import { NEXT_STAGE, assess, gaps, loadConfig } from "./assess.ts";
import { gateWorkItem } from "./check.ts";
import { changesFor, commitExists, currentBranch, filesSince, headCommit, ownFiles } from "./commits.ts";
import { allWorkItems, homeOf, locate, worktrees, type Located } from "./homes.ts";
import { CONFIG_FILE } from "./detect.ts";
import type { Runner } from "./feedback.ts";
import { ghIn, mergeOf, type Merge } from "./merged.ts";
import { ciProblem, ciResult } from "./ci.ts";
import { whatChangedSince, type WhatChanged } from "./updates.ts";
import { diagnose } from "./doctor.ts";
import { changedFiles, gapSkills, reviewsFor, reviewsToDo } from "./routing.ts";
import type { Output, Stage } from "./init.ts";
import { WORK_DIR, readWorkItems } from "./state.ts";

export const WORK_ITEM_SCHEMA_URL =
  "https://raw.githubusercontent.com/AbuMahir980/peer-ai/main/packages/workflow/schemas/work-item.schema.json";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type ItemStage = WorkItem["stage"];
export type ItemKind = WorkItem["kind"];

/** The order work moves through. cancelled can be reached from any stage before done. */
const ORDER: ItemStage[] = ["prepare", "build", "verify", "ship", "done"];
const CLOSED: ItemStage[] = ["done", "cancelled"];
const DEFAULT_PREFIX = "ITEM";

const failed = (error: string): { ok: false; error: string } => ({ ok: false, error });
const projectStage = (config: PeerAiConfig): Stage => config.project.stage ?? "mvp";

function tracksOf(config: PeerAiConfig): string[] {
  return config.tracks.map((track) => track.id);
}

export function loadWorkItem(root: string, id: string): Result<WorkItem> {
  const located = locate(root, id);
  if (located !== undefined) return { ok: true, value: located.item };
  const file = readWorkItems(root).find(({ path }) => path === `${WORK_DIR}/${id}.json`);
  if (file === undefined) return failed(`There is no work item "${id}".`);
  return file.item.ok ? file.item : failed(`${file.path} ${file.item.error}`);
}

/** A work item and its home, the working copy where its branch is checked out (RFC 0010). */
function locateItem(root: string, id: string): Result<Located> {
  const located = locate(root, id);
  if (located !== undefined) return { ok: true, value: located };
  const loaded = loadWorkItem(root, id);
  return loaded.ok ? { ok: true, value: { home: root, item: loaded.value } } : loaded;
}

/** Writes a work item after checking it. migrate uses it to carry over an item at the stage it had. */
export function saveWorkItem(root: string, config: PeerAiConfig, item: WorkItem): Result<WorkItem> {
  const result = validateWorkItem({ $schema: WORK_ITEM_SCHEMA_URL, ...item });
  if (!result.ok) return failed(`The work item would not be valid: ${result.errors.join("; ")}`);
  if (item.track !== undefined && !tracksOf(config).includes(item.track)) {
    return failed(`There is no track "${item.track}". The tracks are: ${tracksOf(config).join(", ")}.`);
  }
  mkdirSync(join(root, WORK_DIR), { recursive: true });
  writeFileSync(join(root, WORK_DIR, `${item.id}.json`), `${JSON.stringify(result.value, null, 2)}\n`);
  return result;
}

/** The next free id: the tracker's ticket prefix, or ITEM, and one more than the highest number. */
export function nextId(root: string, config: PeerAiConfig): string {
  const prefix = (config.tracker?.ticketPrefix ?? DEFAULT_PREFIX).replace(/-+$/, "");
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`);
  // Every working copy's items count, so two agents on two branches never take the same id.
  const numbers = worktrees(root).flatMap((worktree) =>
    readWorkItems(worktree.path).flatMap(({ path }) => {
      const match = pattern.exec(path.slice(WORK_DIR.length + 1, -".json".length));
      return match?.[1] === undefined ? [] : [Number(match[1])];
    }),
  );
  return `${prefix}-${String(Math.max(0, ...numbers) + 1)}`;
}

/** A branch name from the repo's naming pattern, when every placeholder in it is known. */
export function branchFor(pattern: string | undefined, id: string, title: string): string | undefined {
  if (pattern === undefined) return undefined;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
  const branch = pattern.replaceAll("{ticket}", id).replaceAll("{id}", id).replaceAll("{slug}", slug);
  return /[{}]/.test(branch) ? undefined : branch;
}

// Optional fields accept undefined as well as absence, as tool arguments arrive either way.
export interface NewWorkItem {
  title: string;
  kind: ItemKind;
  id?: string | undefined;
  track?: string | undefined;
  gap?: string | undefined;
  branch?: string | undefined;
  next?: string | undefined;
  goal?: string | undefined;
  acceptance?: string[] | undefined;
  sources?: string[] | undefined;
  dependsOn?: string[] | undefined;
}

export function createWorkItem(root: string, config: PeerAiConfig, input: NewWorkItem, now: Date): Result<WorkItem> {
  const id = input.id ?? nextId(root, config);
  if (existsSync(join(root, WORK_DIR, `${id}.json`)) || locate(root, id) !== undefined) {
    return failed(`A work item "${id}" already exists.`);
  }
  const ownTracks = config.tracks.filter((track) => track.status !== "external");
  // With a single track there is nothing to choose, so the item is on it.
  const track = input.track ?? (ownTracks.length === 1 ? ownTracks[0]?.id : undefined);
  const branch = input.branch ?? branchFor(config.repo?.branchNaming, id, input.title);
  const item = {
    version: 1,
    id,
    title: input.title,
    kind: input.kind,
    stage: "prepare",
    ...(track === undefined ? {} : { track }),
    ...(branch === undefined ? {} : { branch }),
    ...(input.gap === undefined ? {} : { gap: input.gap }),
    ...defined({ goal: input.goal, acceptance: input.acceptance, sources: input.sources, dependsOn: input.dependsOn }),
    next: input.next ?? "Read what this item needs, then plan it.",
    updatedAt: now.toISOString(),
  } as WorkItem;
  // The item lives on its branch: where that's checked out, or here until it is.
  const home = branch === undefined ? root : (homeOf(root, branch) ?? root);
  return saveWorkItem(home, config, item);
}

export interface WorkItemChanges {
  title?: string | undefined;
  next?: string | undefined;
  branch?: string | undefined;
  position?: { activity: ActivityId; step: number } | undefined;
  goal?: string | undefined;
  acceptance?: string[] | undefined;
  sources?: string[] | undefined;
  dependsOn?: string[] | undefined;
  /** Why the acceptance criteria change, needed after a tester's check found one not met (RFC 0015). */
  reason?: string | undefined;
  /** Who decided it: whoever agreed the criteria. */
  by?: string | undefined;
}

/** The fields that have a value, so an undefined argument never erases a stored one. */
const defined = <T extends object>(value: T): { [K in keyof T]?: Exclude<T[K], undefined> } =>
  Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };

export function updateWorkItem(
  root: string,
  config: PeerAiConfig,
  id: string,
  changes: WorkItemChanges,
  now: Date,
): Result<WorkItem> {
  const located = locateItem(root, id);
  if (!located.ok) return located;
  const { home, item } = located.value;
  const { reason, by, ...fields } = changes;
  // Criteria a tester found not met change only by the decision of whoever agreed them, with why,
  // so an item can't ship by quietly rewriting what it promised (RFC 0015).
  const changing =
    fields.acceptance !== undefined && JSON.stringify(fields.acceptance) !== JSON.stringify(item.acceptance ?? []);
  const failedAcceptance = latestReview(item, "qa-acceptance")?.result === "fail";
  if (changing && failedAcceptance && (reason === undefined || by === undefined)) {
    return failed(
      `${item.id}'s qa-acceptance found a criterion not met, so its criteria change only with why and who decided: give reason and by, from whoever agreed them. Then check it again with qa-acceptance.`,
    );
  }
  const recorded =
    changing && failedAcceptance && reason !== undefined && by !== undefined
      ? { criteriaChanged: [...(item.criteriaChanged ?? []), { at: now.toISOString(), reason, by }] }
      : {};
  return saveWorkItem(home, config, { ...item, ...defined(fields), ...recorded, updatedAt: now.toISOString() });
}

/** The latest review an item recorded from a skill. */
const latestReview = (item: WorkItem, skill: SkillId) =>
  (item.reviews ?? []).filter((review) => review.skill === skill).at(-1);

export interface ReviewInput {
  skill: SkillId;
  /** Needed without a report. With one, it must match the result the report supports. */
  result?: ReviewResult | undefined;
  /** The review report, relative to the project root. */
  report?: string | undefined;
  summary?: string | undefined;
}

/** Reads a review report inside the project and checks it is valid. */
function readReport(root: string, path: string): Result<ReviewReport> {
  const full = resolve(root, path);
  const inside = relative(root, full);
  if (inside === "" || inside.startsWith("..") || isAbsolute(inside)) {
    return failed(`${path} is outside the project. Save the report under .peer-ai/reports/.`);
  }
  if (!existsSync(full)) return failed(`There is no report at ${path}.`);
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(full, "utf8"));
  } catch (error) {
    return failed(`${path} is not valid JSON: ${(error as Error).message}`);
  }
  const report = validateReport(json);
  return report.ok ? report : failed(`${path} is not a valid review report:\n- ${report.errors.join("\n- ")}`);
}

/**
 * Records a review. With a report, Peer AI works the result out from it and refuses a result the
 * report doesn't support (RFC 0002). Without one, the agent's result is recorded as unproven.
 */
export interface CheckedReport {
  skill: SkillId;
  result: ReviewResult;
  /** What the report leaves open, by severity; left out when nothing is (RFC 0015). */
  open?: OpenCounts;
  report: string;
  summary: string;
}

/**
 * Checks a review's report: that it's valid, is for this skill (and work item, when there is one),
 * gives every rule the skill answers for a line (RFC 0004), and claims the result its findings and
 * coverage support.
 */
export function checkReport(
  root: string,
  config: PeerAiConfig,
  review: ReviewInput & { report: string },
  workItem?: string,
): Result<CheckedReport> {
  const read = readReport(root, review.report);
  if (!read.ok) return read;
  const report = read.value;
  if (report.skill !== review.skill) {
    return failed(`The report is for ${report.skill}, not ${review.skill}.`);
  }
  if (workItem !== undefined && report.workItem !== undefined && report.workItem !== workItem) {
    return failed(`The report is for work item ${report.workItem}, not ${workItem}.`);
  }
  // Silence is never an answer (RFC 0004): every rule the skill answers for gets a line, even
  // one that doesn't apply here.
  if (availableSkills().includes(review.skill)) {
    const covered = new Set(report.coverage.map((line) => line.rule));
    const missing = skillRuleIds(review.skill).filter((rule) => !covered.has(rule));
    if (missing.length > 0) {
      const shown =
        missing.length > 12
          ? `${missing.slice(0, 12).join(", ")} and ${String(missing.length - 12)} more`
          : missing.join(", ");
      return failed(
        `The report leaves out ${String(missing.length)} of ${review.skill}'s rules: ${shown}. Give every rule a coverage line: mark one that doesn't apply as not-applicable, with the reason.`,
      );
    }
  }
  const blockOn = config.gates?.blockOn ?? "critical";
  const worked = deriveResult(report, blockOn);
  if (report.result !== worked) {
    return failed(
      `The report says ${report.result}, but its findings and coverage make it ${worked} (blocking level: ${blockOn}). Correct the report's result.`,
    );
  }
  if (review.result !== undefined && review.result !== worked) {
    return failed(`You gave ${review.result}, but the report makes it ${worked}.`);
  }
  const open = openCounts(report);
  return {
    ok: true,
    value: {
      skill: review.skill,
      result: worked,
      ...(Object.keys(open).length === 0 ? {} : { open }),
      report: review.report,
      summary: review.summary ?? report.summary,
    },
  };
}

export interface CheckReportOptions {
  cwd: string;
  /** The report's path, relative to the project root. */
  report: string;
  /** The skill it's for. Defaults to the skill the report names. */
  skill?: string | undefined;
  /** The work item it's for, when there is one. */
  workItem?: string | undefined;
  json: boolean;
}

/**
 * peer-ai check-report: the same checks as the record_review tool, for a model or a person that
 * works in a shell. Exit code 0 when the report passes them; 1 when it doesn't; 2 without a config.
 */
export function runCheckReport(options: CheckReportOptions, out: Output): number {
  const { config, errors } = loadConfig(options.cwd);
  if (config === undefined) {
    out.error(
      errors === undefined ? `There is no ${CONFIG_FILE}. Run peer-ai init first.` : `${CONFIG_FILE} is not valid.`,
    );
    return 2;
  }
  let skill = options.skill;
  if (skill === undefined) {
    try {
      const named = (JSON.parse(readFileSync(resolve(options.cwd, options.report), "utf8")) as { skill?: unknown })
        .skill;
      if (typeof named === "string") skill = named;
    } catch {
      // Unreadable or not JSON: checkReport says which.
    }
  }
  if (skill === undefined || !(SKILL_IDS as readonly string[]).includes(skill)) {
    const problem = `The report doesn't name one of Peer AI's skills as its "skill", such as "security-review": give it with --skill, and put it in the report.`;
    if (options.json) out.log(JSON.stringify({ ok: false, error: problem }, null, 2));
    else out.error(`✗ ${problem}`);
    return 1;
  }
  const checked = checkReport(
    options.cwd,
    config,
    { skill: skill as SkillId, report: options.report },
    options.workItem,
  );
  if (options.json) {
    out.log(JSON.stringify(checked.ok ? { ok: true, ...checked.value } : { ok: false, error: checked.error }, null, 2));
  } else if (checked.ok) {
    out.log(`✓ ${options.report} passes Peer AI's checks. Its result is ${checked.value.result}.`);
  } else {
    out.error(`✗ ${checked.error}`);
  }
  return checked.ok ? 0 : 1;
}

const REPORTS_DIR = ".peer-ai/reports";

/** Whether a report's path is inside .peer-ai/reports/, as the project root sees it. */
function isReportPath(path: string): boolean {
  const normalised = path.replaceAll("\\", "/").replace(/^\.\//, "");
  return normalised.startsWith(`${REPORTS_DIR}/`) && !normalised.split("/").includes("..");
}

export function recordReview(
  root: string,
  config: PeerAiConfig,
  id: string,
  review: ReviewInput,
  now: Date,
): Result<WorkItem> {
  const located = locateItem(root, id);
  if (!located.ok) return located;
  const { home, item } = located.value;
  const at = now.toISOString();
  const commit = headCommit(home);
  let entry: NonNullable<WorkItem["reviews"]>[number];

  if (review.report === undefined) {
    if (review.result === undefined) return failed("Give the review's result, or the report to work it out from.");
    const summary = review.summary === undefined ? {} : { summary: review.summary };
    entry = { skill: review.skill, result: review.result, ...summary, unproven: true, at };
  } else {
    // A report kept anywhere else, such as in a worktree that will be removed, would leave the
    // record pointing at nothing (RFC 0010).
    if (!isReportPath(review.report)) {
      return failed(
        `${review.report} isn't under ${REPORTS_DIR}/. Save the report there, in the work item's folder, and record it from there.`,
      );
    }
    const checked = checkReport(home, config, { ...review, report: review.report }, id);
    if (!checked.ok) return checked;
    entry = { ...checked.value, at };
  }
  if (commit !== undefined) entry = { ...entry, commit };
  // One review per skill: recording a skill again replaces the earlier entry, which git keeps.
  const reviews = [...(item.reviews ?? []).filter((recorded) => recorded.skill !== review.skill), entry];
  return saveWorkItem(home, config, { ...item, reviews, updatedAt: at });
}

export function recordVerify(
  root: string,
  config: PeerAiConfig,
  id: string,
  result: "pass" | "fail",
  now: Date,
  commit?: string,
): Result<WorkItem> {
  const located = locateItem(root, id);
  if (!located.ok) return located;
  const { home, item } = located.value;
  const at = now.toISOString();
  const lastVerify = { result, at, ...(commit === undefined ? {} : { commit }) };
  return saveWorkItem(home, config, { ...item, lastVerify, updatedAt: at });
}

/**
 * Takes CI's verify as the item's (RFC 0013): the result of commands.verifyCheck on the item's
 * latest commit, read from GitHub, recorded with a link to the run. CI can only have run what's
 * committed and pushed, so uncommitted changes are refused, as for a verify here.
 */
export function verifyFromCi(
  root: string,
  config: PeerAiConfig,
  id: string,
  now: Date,
  run?: Runner,
): Result<WorkItem> {
  const located = locateItem(root, id);
  if (!located.ok) return located;
  const { home, item } = located.value;
  const check = config.commands?.verifyCheck;
  if (check === undefined) {
    return failed(
      "There is no CI check to take the verify from. Set commands.verifyCheck in peer-ai.config.json to the check that runs the verify command on every pull request, or verify here.",
    );
  }
  const commit = headCommit(home);
  if (commit === undefined) return failed(`${item.id} has no commit for CI to have verified.`);
  const uncommitted = uncommittedFiles(home);
  if (uncommitted.length > 0) {
    return failed(
      `CI verifies commits, and ${uncommitted.slice(0, 3).join(", ")} isn't committed. Commit and push it, then ask again.`,
    );
  }
  const result = ciResult(commit, check, run ?? ghIn(home));
  if (result.status !== "pass" && result.status !== "fail") return failed(ciProblem(result, check, commit) ?? "");
  const at = now.toISOString();
  const lastVerify = { result: result.status, at, commit, ci: { check, url: result.url } };
  return saveWorkItem(home, config, { ...item, lastVerify, updatedAt: at });
}

/**
 * Moves a work item to `to`, or to the stage after its current one. It can move back to any
 * earlier stage. A move to ship or done is refused, with what to fix, when the gates fail.
 */
/** Whether an item's verify is on its latest commit, or one with no change since outside .peer-ai/. */
function verifiedAtHead(home: string, item: WorkItem): boolean {
  const commit = item.lastVerify?.commit;
  if (commit === undefined) return false;
  const changed = changesFor(home)?.(commit);
  return changed?.length === 0;
}

export function advanceWorkItem(
  root: string,
  config: PeerAiConfig,
  id: string,
  to: ItemStage | undefined,
  now: Date,
  run?: Runner,
): Result<WorkItem> {
  const located = locateItem(root, id);
  if (!located.ok) return located;
  const { home } = located.value;
  let { item } = located.value;
  if (CLOSED.includes(item.stage) && (to === undefined || to === item.stage)) {
    return failed(`${item.id} is already ${item.stage}.`);
  }
  const target = to ?? ORDER[ORDER.indexOf(item.stage) + 1];
  if (target === undefined) return failed(`${item.id} has no stage after ${item.stage}.`);
  if (target === "verify") {
    // The reviews it needs are worked out once, from what the change touched, and kept on the item
    // so CI can hold it to them without the branch's history.
    const read = (file: string) => {
      try {
        return readFileSync(join(home, file), "utf8");
      } catch {
        return "";
      }
    };
    // From the item's own commits when it knows where it started, so a stacked branch isn't asked
    // for its parents' reviews and a merge can't erase them (RFC 0010).
    const touched =
      item.base !== undefined && commitExists(home, item.base) ? filesSince(home, item.base) : changedFiles(home);
    const requiredReviews = reviewsFor(touched, config, projectStage(config), read, undefined, item);
    return saveWorkItem(home, config, { ...item, stage: target, requiredReviews, updatedAt: now.toISOString() });
  }
  let fromCi: string | undefined;
  if (target === "ship" && config.commands?.verifyCheck !== undefined && !verifiedAtHead(home, item)) {
    // With a CI check that runs the verify, its result on the latest commit is the verify (RFC 0013).
    const verified = verifyFromCi(root, config, id, now, run);
    if (verified.ok) item = verified.value;
    else fromCi = verified.error;
  }
  if (target === "ship" || target === "done") {
    const moved = { ...item, stage: target };
    const stage = projectStage(config);
    const others = allWorkItems(root).map((other) => other.item);
    const failures = gateWorkItem(moved, config, stage, assess(home, config, stage), others, {
      moving: target,
      branch: currentBranch(home),
      changedSince: changesFor(home),
      ownFiles: ownFiles(home, config.repo?.defaultBranch),
      ciResult: (commit, check) => ciResult(commit, check, run ?? ghIn(home)),
    }).filter((check) => check.status === "fail");
    if (failures.length > 0) {
      // Work whose branch is already merged closes saying so, rather than being verified again (RFC 0013).
      const merge = target === "done" ? mergeOf(home, item, config.repo?.defaultBranch, run ?? ghIn(home)) : undefined;
      if (merge !== undefined) return closeByMerge(home, config, item, merge, now);
      const reasons = [
        ...failures.map((check) => `- ${check.message} ${check.fix ?? ""}`.trimEnd()),
        ...(fromCi === undefined ? [] : [`- ${fromCi}`]),
      ];
      return failed(`${item.id} can't move to ${target} yet:\n${reasons.join("\n")}`);
    }
  }
  // Build starts the change: the commit it starts from is the item's base, so its required reviews
  // come from its own commits, not a parent branch's (RFC 0010).
  const base = target === "build" && item.base === undefined ? headCommit(home) : undefined;
  return saveWorkItem(home, config, {
    ...item,
    stage: target,
    ...(base === undefined ? {} : { base }),
    updatedAt: now.toISOString(),
  });
}

/** Closes an item whose branch is already merged, saying how, without the ship gate (RFC 0013). */
export function closeByMerge(
  home: string,
  config: PeerAiConfig,
  item: WorkItem,
  merge: Merge,
  now: Date,
): Result<WorkItem> {
  const closed = {
    by: "merge" as const,
    ...(merge.commit === undefined ? {} : { commit: merge.commit }),
    ...(merge.pullRequest === undefined ? {} : { pullRequest: merge.pullRequest }),
    at: now.toISOString(),
  };
  return saveWorkItem(home, config, { ...item, stage: "done", closed, updatedAt: now.toISOString() });
}

/** Every open item whose branch is merged, with how, and its home: what close-merged closes. */
export function mergedItems(root: string, config: PeerAiConfig, run?: Runner): (Located & { merge: Merge })[] {
  return allWorkItems(root).flatMap((located) => {
    if (CLOSED.includes(located.item.stage)) return [];
    const merge = mergeOf(located.home, located.item, config.repo?.defaultBranch, run);
    return merge === undefined ? [] : [{ ...located, merge }];
  });
}

export interface CommandResult {
  code: number | null;
  /** The end of the combined output, which is where test runners report what failed. */
  output: string;
}

export type CommandRunner = (command: string, cwd: string) => Promise<CommandResult>;

const OUTPUT_KEPT = 4000;
const VERIFY_TIMEOUT_MS = 30 * 60 * 1000;

/** Runs a command from the project's config through the shell, as a person would type it. */
export const runCommand: CommandRunner = (command, cwd) =>
  new Promise((resolve) => {
    let output = "";
    const keep = (chunk: Buffer) => {
      output = (output + chunk.toString("utf8")).slice(-OUTPUT_KEPT);
    };
    // stdin is closed, so a command that waits for input ends instead of hanging until the
    // timeout; output is piped, never inherited, because stdout carries the MCP protocol.
    const child = spawn(command, { cwd, shell: true, timeout: VERIFY_TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    child.on("error", (error) => {
      resolve({ code: null, output: `${output}\n${error.message}`.trim() });
    });
    child.on("close", (code) => {
      resolve({ code, output });
    });
  });

export interface VerifyOutcome {
  item: WorkItem;
  command: string;
  result: "pass" | "fail";
  output: string;
}

/** Runs commands.verify and records the result, so a pass is proven rather than claimed. */
/** Changes not yet committed in a working copy, outside .peer-ai/. */
function uncommittedFiles(home: string): string[] {
  try {
    return execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", ".", ":(exclude).peer-ai"], {
      cwd: home,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => line.slice(3).split(" -> ").at(-1) ?? line);
  } catch {
    return [];
  }
}

export async function runVerify(
  root: string,
  config: PeerAiConfig,
  id: string,
  now: () => Date,
  run: CommandRunner = runCommand,
): Promise<Result<VerifyOutcome>> {
  const located = locateItem(root, id);
  if (!located.ok) return located;
  const { home, item } = located.value;
  const command = config.commands?.verify ?? undefined;
  if (command === undefined) {
    return failed(
      "There is no verify command. Set commands.verify in peer-ai.config.json to the command that checks the project, such as its tests and linter.",
    );
  }
  // In git, a verify proves a commit on the item's own branch (RFC 0010): it runs where that branch
  // is checked out, on nothing that isn't committed.
  const commit = headCommit(home);
  if (commit !== undefined) {
    if (item.branch !== undefined && homeOf(root, item.branch) === undefined) {
      return failed(
        `${item.id}'s branch, ${item.branch}, isn't checked out anywhere, so there's nothing of it to verify. Check it out, with git switch ${item.branch} or git worktree add <folder> ${item.branch}, then verify.`,
      );
    }
    const uncommitted = uncommittedFiles(home);
    if (uncommitted.length > 0) {
      const shown =
        uncommitted.length <= 3
          ? uncommitted.join(", ")
          : `${uncommitted.slice(0, 3).join(", ")} and ${String(uncommitted.length - 3)} more`;
      return failed(
        `The verify for ${item.id} runs on a commit, and ${shown} isn't committed. Commit it, then verify.`,
      );
    }
  }
  const { code, output } = await run(command, home);
  const result = code === 0 ? "pass" : "fail";
  const recorded = recordVerify(root, config, id, result, now(), commit);
  return recorded.ok ? { ok: true, value: { item: recorded.value, command, result, output } } : recorded;
}

/** The checked-out branch, even before the first commit; undefined when detached or not in git. */

/** A setup problem doctor finds, for the AI tool to fix or tell the person about before other work. */
export interface SetupProblem {
  check: string;
  status: "fail" | "warn";
  message: string;
  fix?: string;
}

/** An open work item in one line (RFC 0012): work_item gives the whole item. */
export interface WorkSummary {
  id: string;
  title: string;
  stage: WorkItem["stage"];
  branch?: string;
  track?: string;
  /** Its next action. */
  next: string;
  /** The items it depends on that haven't shipped, so it can't ship before them (RFC 0005). */
  waitingFor?: string[];
}

/** The most open items next_work lists, so its reply fits what an AI tool can take in (RFC 0012). */
export const LISTED = 50;

export interface NextWork {
  /** Every setup problem doctor finds (RFC 0007). Absent when there is none. */
  setup?: { problems: SetupProblem[] };
  /** What changed in Peer AI since this person last worked here, for the AI tool to tell them, once (RFC 0014). */
  whatChanged?: WhatChanged;
  branch?: string;
  /** The open work item for the current branch, in full. */
  current?: WorkItem;
  /** Open work items in one line each, most recently updated first, at most LISTED of them. */
  open: WorkSummary[];
  /** How many more open items there are than open lists. */
  more?: number;
  /** The current item's required reviews, by the names their skills are installed under. */
  reviews?: ReturnType<typeof reviewsToDo>;
  /**
   * When nothing is open: what the project's stage still needs, to start as gap work items, and
   * the skill to use for each gap that has one.
   */
  gaps?: {
    stage: Stage;
    needed: KnownMapItemId[];
    later: KnownMapItemId[];
    useSkill: Partial<Record<KnownMapItemId, string>>;
  };
}

/** Doctor's failures and warnings, as next_work reports them. */
export function setupProblems(root: string, nodeVersion?: string, today?: Date): SetupProblem[] {
  return diagnose(root, nodeVersion, today).checks.flatMap((check) =>
    check.status === "fail" || check.status === "warn"
      ? [
          {
            check: check.id,
            status: check.status,
            message: check.message,
            ...(check.fix === undefined ? {} : { fix: check.fix }),
          },
        ]
      : [],
  );
}

export function nextWork(root: string, config: PeerAiConfig, onBranch?: string): NextWork {
  const problems = setupProblems(root);
  // An agent in a worktree of its own names its branch; otherwise it's the one checked out here.
  const branch = onBranch ?? currentBranch(root);
  const items = allWorkItems(root).map((located) => located.item);
  const open = items
    .filter((item) => !CLOSED.includes(item.stage))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const current = branch === undefined ? undefined : open.find((item) => item.branch === branch);
  const reviews = current === undefined ? [] : reviewsToDo(current);
  const shipped = new Set(items.flatMap((item) => (item.stage === "ship" || item.stage === "done" ? [item.id] : [])));
  const summary = (item: WorkItem): WorkSummary => {
    const waitingFor = (item.dependsOn ?? []).filter((id) => !shipped.has(id));
    return {
      id: item.id,
      title: item.title,
      stage: item.stage,
      ...(item.branch === undefined ? {} : { branch: item.branch }),
      ...(item.track === undefined ? {} : { track: item.track }),
      next: item.next,
      ...(waitingFor.length === 0 ? {} : { waitingFor }),
    };
  };
  const changed = whatChangedSince(root);
  const result: NextWork = {
    ...(problems.length === 0 ? {} : { setup: { problems } }),
    ...(changed === undefined ? {} : { whatChanged: changed }),
    ...(branch === undefined ? {} : { branch }),
    ...(current ? { current } : {}),
    ...(reviews.length > 0 ? { reviews } : {}),
    open: open.slice(0, LISTED).map(summary),
    ...(open.length > LISTED ? { more: open.length - LISTED } : {}),
  };
  if (open.length > 0) return result;
  const stage = projectStage(config);
  const assessment = assess(root, config, stage);
  const next = NEXT_STAGE[stage];
  const needed = gaps(assessment, stage);
  const later = next === undefined ? [] : gaps(assessment, next).filter((id) => !needed.includes(id));
  return { ...result, gaps: { stage, needed, later, useSkill: gapSkills([...needed, ...later]) } };
}

export { currentBranch };
