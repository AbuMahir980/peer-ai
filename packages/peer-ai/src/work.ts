// Work items: create them, record where work stands, verify and review them, and move them
// through their stages. Every change is validated against the work item schema before it is
// written, and a move to ship or done must pass the same gates as `peer-ai check`, so what an
// agent records is what CI will accept.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  deriveResult,
  validateReport,
  validateWorkItem,
  type ActivityId,
  type KnownMapItemId,
  type PeerAiConfig,
  type ReviewReport,
  type ReviewResult,
  type SkillId,
  type WorkItem,
} from "@peer-ai/workflow";
import { NEXT_STAGE, assess, gaps } from "./assess.ts";
import { availableSkills, skillRuleIds } from "@peer-ai/skills";
import { gateWorkItem } from "./check.ts";
import type { Stage } from "./init.ts";
import { WORK_DIR, readWorkItems } from "./state.ts";

export const WORK_ITEM_SCHEMA_URL =
  "https://raw.githubusercontent.com/AbuMahir980/peer-ai/next/packages/workflow/schemas/work-item.schema.json";

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
  const file = readWorkItems(root).find(({ path }) => path === `${WORK_DIR}/${id}.json`);
  if (file === undefined) return failed(`There is no work item "${id}".`);
  return file.item.ok ? file.item : failed(`${file.path} ${file.item.error}`);
}

function save(root: string, config: PeerAiConfig, item: WorkItem): Result<WorkItem> {
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
  const numbers = readWorkItems(root).flatMap(({ path }) => {
    const match = pattern.exec(path.slice(WORK_DIR.length + 1, -".json".length));
    return match?.[1] === undefined ? [] : [Number(match[1])];
  });
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
}

export function createWorkItem(root: string, config: PeerAiConfig, input: NewWorkItem, now: Date): Result<WorkItem> {
  const id = input.id ?? nextId(root, config);
  if (existsSync(join(root, WORK_DIR, `${id}.json`))) return failed(`A work item "${id}" already exists.`);
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
    next: input.next ?? "Read what this item needs, then plan it.",
    updatedAt: now.toISOString(),
  } as WorkItem;
  return save(root, config, item);
}

export interface WorkItemChanges {
  title?: string | undefined;
  next?: string | undefined;
  branch?: string | undefined;
  position?: { activity: ActivityId; step: number } | undefined;
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
  const loaded = loadWorkItem(root, id);
  if (!loaded.ok) return loaded;
  return save(root, config, { ...loaded.value, ...defined(changes), updatedAt: now.toISOString() });
}

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
export function recordReview(
  root: string,
  config: PeerAiConfig,
  id: string,
  review: ReviewInput,
  now: Date,
): Result<WorkItem> {
  const loaded = loadWorkItem(root, id);
  if (!loaded.ok) return loaded;
  const at = now.toISOString();
  const summary = review.summary === undefined ? {} : { summary: review.summary };
  let entry: NonNullable<WorkItem["reviews"]>[number];

  if (review.report === undefined) {
    if (review.result === undefined) return failed("Give the review's result, or the report to work it out from.");
    entry = { skill: review.skill, result: review.result, ...summary, unproven: true, at };
  } else {
    const read = readReport(root, review.report);
    if (!read.ok) return read;
    const report = read.value;
    if (report.skill !== review.skill) {
      return failed(`The report is for ${report.skill}, not ${review.skill}.`);
    }
    if (report.workItem !== undefined && report.workItem !== id) {
      return failed(`The report is for work item ${report.workItem}, not ${id}.`);
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
    entry = {
      skill: review.skill,
      result: worked,
      report: review.report,
      summary: review.summary ?? report.summary,
      at,
    };
  }
  const reviews = [...(loaded.value.reviews ?? []), entry];
  return save(root, config, { ...loaded.value, reviews, updatedAt: at });
}

export function recordVerify(
  root: string,
  config: PeerAiConfig,
  id: string,
  result: "pass" | "fail",
  now: Date,
): Result<WorkItem> {
  const loaded = loadWorkItem(root, id);
  if (!loaded.ok) return loaded;
  const at = now.toISOString();
  return save(root, config, { ...loaded.value, lastVerify: { result, at }, updatedAt: at });
}

/**
 * Moves a work item to `to`, or to the stage after its current one. It can move back to any
 * earlier stage. A move to ship or done is refused, with what to fix, when the gates fail.
 */
export function advanceWorkItem(
  root: string,
  config: PeerAiConfig,
  id: string,
  to: ItemStage | undefined,
  now: Date,
): Result<WorkItem> {
  const loaded = loadWorkItem(root, id);
  if (!loaded.ok) return loaded;
  const item = loaded.value;
  if (CLOSED.includes(item.stage) && (to === undefined || to === item.stage)) {
    return failed(`${item.id} is already ${item.stage}.`);
  }
  const target = to ?? ORDER[ORDER.indexOf(item.stage) + 1];
  if (target === undefined) return failed(`${item.id} has no stage after ${item.stage}.`);
  if (target === "ship" || target === "done") {
    const moved = { ...item, stage: target };
    const stage = projectStage(config);
    const failures = gateWorkItem(moved, config, stage, assess(root, config, stage)).filter(
      (check) => check.status === "fail",
    );
    if (failures.length > 0) {
      const reasons = failures.map((check) => `- ${check.message} ${check.fix ?? ""}`.trimEnd());
      return failed(`${item.id} can't move to ${target} yet:\n${reasons.join("\n")}`);
    }
  }
  return save(root, config, { ...item, stage: target, updatedAt: now.toISOString() });
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
export async function runVerify(
  root: string,
  config: PeerAiConfig,
  id: string,
  now: () => Date,
  run: CommandRunner = runCommand,
): Promise<Result<VerifyOutcome>> {
  const loaded = loadWorkItem(root, id);
  if (!loaded.ok) return loaded;
  const command = config.commands?.verify ?? undefined;
  if (command === undefined) {
    return failed(
      "There is no verify command. Set commands.verify in peer-ai.config.json to the command that checks the project, such as its tests and linter.",
    );
  }
  const { code, output } = await run(command, root);
  const result = code === 0 ? "pass" : "fail";
  const recorded = recordVerify(root, config, id, result, now());
  return recorded.ok ? { ok: true, value: { item: recorded.value, command, result, output } } : recorded;
}

/** The checked-out branch, even before the first commit; undefined when detached or not in git. */
export function currentBranch(root: string): string | undefined {
  try {
    const branch = execFileSync("git", ["symbolic-ref", "--short", "-q", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return branch === "" ? undefined : branch;
  } catch {
    return undefined;
  }
}

export interface NextWork {
  branch?: string;
  /** The open work item for the current branch. */
  current?: WorkItem;
  /** Every open work item, most recently updated first. */
  open: WorkItem[];
  /** When nothing is open: what the project's stage still needs, to start as gap work items. */
  gaps?: { stage: Stage; needed: KnownMapItemId[]; later: KnownMapItemId[] };
}

export function nextWork(root: string, config: PeerAiConfig): NextWork {
  const branch = currentBranch(root);
  const open = readWorkItems(root)
    .flatMap(({ item }) => (item.ok && !CLOSED.includes(item.value.stage) ? [item.value] : []))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const current = branch === undefined ? undefined : open.find((item) => item.branch === branch);
  const result: NextWork = { ...(branch === undefined ? {} : { branch }), ...(current ? { current } : {}), open };
  if (open.length > 0) return result;
  const stage = projectStage(config);
  const assessment = assess(root, config, stage);
  const next = NEXT_STAGE[stage];
  const needed = gaps(assessment, stage);
  const later = next === undefined ? [] : gaps(assessment, next).filter((id) => !needed.includes(id));
  return { ...result, gaps: { stage, needed, later } };
}
