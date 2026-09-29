// Tests how well a review finds the problems planted in a fixture (RFC 0002), and how well a
// document skill writes its document (RFC 0004). Each fixture's answer sheet lives in
// evals/<fixture>.json, outside the fixture, so the tool under test works on a copy that never
// contains the answers.
//
// By default the copy has Peer AI's skills, rendered as a person's render would, and the tool is
// asked in plain words. --baseline runs without them, to measure what a skill adds. A document is
// graded by a second run, of the tool --grader names, against the points its scenario lists.
//
//   node scripts/eval.ts <fixture> --skill <skill> [--tool claude-code|codex] [--model <model>]
//     [--grader claude-code|codex] [--grader-model <model>] [--baseline] [--runs <n>] [--record]
//   node scripts/eval.ts <fixture> --skill <document skill> --regrade <copy> [--grader …] [--record]

import { execFile, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { availableSkills, renderedName, skillRuleIds } from "@peer-ai/skills";
import { SEVERITIES, SKILL_IDS, SKILL_KINDS, validateReport, type ReviewReport, type SkillId } from "@peer-ai/workflow";
import { z } from "zod";
import { CLI, localServer, prepareFixture } from "./fixture.ts";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const EVALS = join(REPO, "evals");
const REPORT_SCHEMA = join(REPO, "packages/workflow/schemas/review-report.schema.json");

/** How far a finding's lines may be from a planted problem and still count as finding it. */
export const LINE_TOLERANCE = 3;
/** The share of planted medium problems a review must find to be ready to ship. */
export const MEDIUM_BAR = 0.8;
/** The share of its scenario's points a document must make to be ready to ship. */
export const POINTS_BAR = 0.8;

const Location = z.strictObject({
  file: z.string().min(1),
  match: z.string().min(1).describe("Exact text that appears once in the file, where the problem is."),
  lines: z.number().int().positive().optional().describe("How many lines the problem covers from the match."),
});

const Defect = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: z.enum(SEVERITIES),
  skills: z.array(z.enum(SKILL_IDS)).min(1).describe("The reviews expected to find it."),
  locations: z.array(Location).min(1).describe("Where it shows. Finding it at any one of them counts."),
  found: z.string().min(1).optional().describe("For a problem nobody planted: which review first raised it."),
});

const Point = z.strictObject({
  id: z.string().min(1),
  point: z.string().min(1).describe("What a good document does, in words a grader can check against it alone."),
  must: z.boolean().optional().describe("The document isn't ready without it."),
});

const DocumentScenario = z.strictObject({
  path: z.string().min(1).describe("Where the document should be written, relative to the project root."),
  points: z.array(Point).min(3),
});

export const SheetSchema = z.strictObject({
  fixture: z.string().min(1),
  prompts: z.partialRecord(z.enum(SKILL_IDS), z.string().min(1)),
  defects: z.array(Defect),
  documents: z
    .partialRecord(z.enum(SKILL_IDS), DocumentScenario)
    .optional()
    .describe("For document skills: what a good document makes of the prompt."),
});

export type DocumentScenario = z.output<typeof DocumentScenario>;

export interface Span {
  file: string;
  line: number;
  endLine: number;
}

export type ResolvedDefect = z.output<typeof Defect> & { spans: Span[] };

export interface Sheet {
  fixture: string;
  prompts: Partial<Record<SkillId, string>>;
  defects: ResolvedDefect[];
  documents?: Partial<Record<SkillId, DocumentScenario>>;
}

export function sheets(): string[] {
  return readdirSync(EVALS)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length));
}

/** Reads an answer sheet and finds each problem's lines from its matching text. */
export function loadSheet(name: string): Sheet {
  const path = join(EVALS, `${name}.json`);
  if (!existsSync(path)) throw new Error(`There is no answer sheet at evals/${name}.json.`);
  const parsed = SheetSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) {
    throw new Error(
      `evals/${name}.json isn't a valid answer sheet: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  const root = join(REPO, "fixtures", parsed.data.fixture);
  const defects = parsed.data.defects.map((defect) => ({
    ...defect,
    spans: defect.locations.map((location) => {
      const file = join(root, location.file);
      if (!existsSync(file))
        throw new Error(`${defect.id}: fixtures/${parsed.data.fixture}/${location.file} doesn't exist.`);
      const text = readFileSync(file, "utf8");
      const first = text.indexOf(location.match);
      if (first === -1 || text.includes(location.match, first + 1)) {
        throw new Error(
          `${defect.id}: its matching text must appear exactly once in ${location.file}, and appears ${first === -1 ? "nowhere" : "more than once"}.`,
        );
      }
      const line = text.slice(0, first).split("\n").length;
      const covered = location.lines ?? location.match.split("\n").length;
      return { file: location.file, line, endLine: line + covered - 1 };
    }),
  }));
  const { documents } = parsed.data;
  return {
    fixture: parsed.data.fixture,
    prompts: parsed.data.prompts,
    defects,
    ...(documents === undefined ? {} : { documents }),
  };
}

type Finding = ReviewReport["findings"][number];

export interface Score {
  skill: SkillId;
  /** The planted problems this review is expected to find. */
  expected: { defect: ResolvedDefect; foundBy: string[] }[];
  /** Findings that match no planted problem, for a person to judge. */
  unmatched: Finding[];
  bySeverity: Record<(typeof SEVERITIES)[number], { found: number; of: number }>;
  ready: boolean;
  /** Why it isn't ready, in plain words. */
  reasons: string[];
}

const normalise = (file: string) => file.replace(/^\.\//, "");

/** How many lines separate a finding from a planted problem: 0 when they overlap. */
function distance(finding: Finding, span: Span): number {
  const { line, endLine } = finding.location;
  if (line === undefined) return Number.POSITIVE_INFINITY;
  const end = endLine ?? line;
  if (end < span.line) return span.line - end;
  if (line > span.endLine) return line - span.endLine;
  return 0;
}

/**
 * The planted problems a finding could be about, nearest first: those in the same file within the
 * line tolerance, at a severity no more than one level away.
 */
function candidates(finding: Finding, defects: ResolvedDefect[]): ResolvedDefect[] {
  const ranked: { defect: ResolvedDefect; lines: number; gap: number }[] = [];
  for (const defect of defects) {
    const gap = Math.abs(SEVERITIES.indexOf(finding.severity) - SEVERITIES.indexOf(defect.severity));
    if (gap > 1) continue;
    const lines = Math.min(
      ...defect.spans
        .filter((span) => normalise(finding.location.file) === span.file)
        .map((span) => distance(finding, span)),
    );
    if (lines <= LINE_TOLERANCE) ranked.push({ defect, lines, gap });
  }
  return ranked.sort((a, b) => a.lines - b.lines || a.gap - b.gap).map(({ defect }) => defect);
}

/**
 * Which planted problem each finding is about. Each finding counts for one problem at most, so a
 * single finding can't score twice when two problems sit close together. Findings are paired with
 * problems so that as many problems as possible are found: when two findings both cover the same
 * two problems, each counts for one. A finding left over after that is about its nearest problem.
 */
function matchFindings(findings: Finding[], expected: ResolvedDefect[], all: ResolvedDefect[]) {
  const options = new Map(findings.map((finding) => [finding, candidates(finding, expected)]));
  const owner = new Map<ResolvedDefect, Finding>();
  // Kuhn's algorithm: a finding takes a problem, or moves the finding that holds it to another.
  const assign = (finding: Finding, tried: Set<ResolvedDefect>): boolean => {
    for (const defect of options.get(finding) ?? []) {
      if (tried.has(defect)) continue;
      tried.add(defect);
      const holder = owner.get(defect);
      if (holder === undefined || assign(holder, tried)) {
        owner.set(defect, finding);
        return true;
      }
    }
    return false;
  };
  for (const finding of findings) assign(finding, new Set());
  const paired = new Map([...owner].map(([defect, finding]) => [finding, defect]));
  return new Map(findings.map((finding) => [finding, paired.get(finding) ?? candidates(finding, all)[0]]));
}

/** Marks a review's reports against the answer sheet. */
export function score(sheet: Sheet, skill: SkillId, reports: ReviewReport[]): Score {
  const findings = reports.filter((report) => report.skill === skill).flatMap((report) => report.findings);
  const own = sheet.defects.filter((defect) => defect.skills.includes(skill));
  const matched = matchFindings(findings, own, sheet.defects);
  const expected = own.map((defect) => ({
    defect,
    foundBy: findings.filter((finding) => matched.get(finding) === defect).map((finding) => finding.id),
  }));
  const unmatched = findings.filter((finding) => matched.get(finding) === undefined);
  const bySeverity = Object.fromEntries(
    SEVERITIES.map((severity) => {
      const planted = expected.filter(({ defect }) => defect.severity === severity);
      return [severity, { found: planted.filter(({ foundBy }) => foundBy.length > 0).length, of: planted.length }];
    }),
  ) as Score["bySeverity"];

  const reasons: string[] = [];
  if (!reports.some((report) => report.skill === skill)) reasons.push(`it wrote no valid ${skill} report`);
  for (const severity of ["critical", "high"] as const) {
    const { found, of } = bySeverity[severity];
    if (found < of) reasons.push(`it missed ${String(of - found)} ${severity} problem${of - found === 1 ? "" : "s"}`);
  }
  const medium = bySeverity.medium;
  if (medium.of > 0 && medium.found / medium.of < MEDIUM_BAR) {
    reasons.push(
      `it found ${String(medium.found)} of ${String(medium.of)} medium problems, under ${String(MEDIUM_BAR * 100)}%`,
    );
  }
  return { skill, expected, unmatched, bySeverity, ready: reasons.length === 0, reasons };
}

export interface CollectedReports {
  reports: ReviewReport[];
  invalid: { path: string; errors: string[] }[];
}

/** Every review report a run wrote, under .peer-ai/reports/. */
export function collectReports(dir: string): CollectedReports {
  const base = join(dir, ".peer-ai", "reports");
  const collected: CollectedReports = { reports: [], invalid: [] };
  const walk = (folder: string): void => {
    if (!existsSync(folder)) return;
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".json")) {
        let json: unknown;
        try {
          json = JSON.parse(readFileSync(path, "utf8"));
        } catch (error) {
          collected.invalid.push({ path: relative(dir, path), errors: [(error as Error).message] });
          continue;
        }
        const result = validateReport(json);
        if (result.ok) collected.reports.push(result.value);
        else collected.invalid.push({ path: relative(dir, path), errors: result.errors });
      }
    }
  };
  walk(base);
  return collected;
}

export type Tool = "claude-code" | "codex";
export interface ToolRun {
  seconds: number;
  turns?: number;
  costUsd?: number;
}
export type ToolRunner = (tool: Tool, dir: string, prompt: string, log: string, model?: string) => Promise<ToolRun>;

const TOOL_NAMES: Record<Tool, string> = { "claude-code": "Claude Code", codex: "Codex" };

/**
 * The request, in plain words. With the skill installed that's all the tool gets: the skill carries
 * the report format. A review's baseline, without the skill, is also told where the format is.
 */
export function evalPrompt(sheet: Sheet, skill: SkillId, baseline = false): string {
  const ask = sheet.prompts[skill];
  if (ask === undefined) {
    const known = Object.keys(sheet.prompts).join(", ");
    throw new Error(`evals/${sheet.fixture}.json has no prompt for ${skill}. It has: ${known}.`);
  }
  if (!baseline || SKILL_KINDS[skill] !== "review") return ask;
  return `${ask}\n\nWrite the review's report as JSON in .peer-ai/reports/, following the format in .peer-ai/review-report.schema.json.`;
}

/**
 * Whether the tool opened the skill: Claude Code's Skill tool naming it, or any tool reading its
 * SKILL.md. The skill's name also appears in lists of what's installed, so that alone doesn't count.
 */
export function usedSkill(log: string, skill: SkillId): boolean {
  const name = renderedName(skill);
  return log.includes(`${name}/SKILL.md`) || new RegExp(`"skill"\\s*:\\s*"${name}"`).test(log);
}

/** How many of the rules a skill answers for its reports covered, with at least one line each. */
export function ruleCoverage(reports: ReviewReport[], skill: SkillId): { covered: number; of: number } {
  const rules = skillRuleIds(skill);
  const seen = new Set(
    reports.filter((report) => report.skill === skill).flatMap((report) => report.coverage.map((line) => line.rule)),
  );
  return { covered: rules.filter((rule) => seen.has(rule)).length, of: rules.length };
}

function run(command: string, args: string[], cwd: string, log: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = execFile(
      command,
      args,
      { cwd, maxBuffer: 256 * 1024 * 1024, timeout: 30 * 60 * 1000 },
      (error, stdout, stderr) => {
        writeFileSync(log, `${stdout}\n${stderr}`);
        if (error) reject(new Error(`${command} failed: ${error.message}. The log is at ${log}.`));
        else resolvePromise(stdout);
      },
    );
    // Nothing is typed in. Codex reads its prompt from input as well when input is left open, and
    // waits for it to end, so close it at once.
    child.stdin?.end();
  });
}

/** Runs a real AI tool headless on the copy, with only the peer-ai server and its own file tools. */
export const runTool: ToolRunner = async (tool, dir, prompt, log, model) => {
  const started = Date.now();
  const server = localServer();
  if (tool === "claude-code") {
    const out = await run(
      "claude",
      [
        "-p",
        prompt,
        ...(model === undefined ? [] : ["--model", model]),
        "--mcp-config",
        ".mcp.json",
        "--strict-mcp-config",
        "--permission-mode",
        "acceptEdits",
        "--allowedTools",
        "mcp__peer-ai",
        "Skill",
        "Bash(git:*)",
        // Every event, so the log shows which tools and skills the run used.
        "--output-format",
        "stream-json",
        "--verbose",
        "--max-turns",
        "120",
      ],
      dir,
      log,
    );
    const last = out
      .trim()
      .split("\n")
      .reverse()
      .find((line) => line.includes('"type":"result"'));
    const result = (last === undefined ? {} : JSON.parse(last)) as { num_turns?: number; total_cost_usd?: number };
    return {
      seconds: (Date.now() - started) / 1000,
      ...(result.num_turns === undefined ? {} : { turns: result.num_turns }),
      ...(result.total_cost_usd === undefined ? {} : { costUsd: result.total_cost_usd }),
    };
  }
  await run(
    "codex",
    [
      "exec",
      "--json",
      "--ephemeral",
      "--ignore-user-config",
      "--sandbox",
      "workspace-write",
      "-C",
      dir,
      "-c",
      'approval_policy="never"',
      "-c",
      `mcp_servers.peer-ai.command=${JSON.stringify(server.command)}`,
      "-c",
      `mcp_servers.peer-ai.args=${JSON.stringify(server.args)}`,
      "-c",
      'mcp_servers.peer-ai.tools.run_verify.approval_mode="approve"',
      ...(model === undefined ? [] : ["-m", model]),
      prompt,
    ],
    dir,
    log,
  );
  return { seconds: (Date.now() - started) / 1000 };
};

export interface EvalOptions {
  /** Run without Peer AI's skills, to measure what a skill adds. */
  baseline?: boolean;
  /** The model to ask for, such as a fast one and a strong one; otherwise the tool's default. */
  model?: string;
}

export interface EvalRun {
  dir: string;
  score: Score;
  collected: CollectedReports;
  tool: ToolRun;
  baseline: boolean;
  model?: string;
  /** With the skill installed: whether the tool opened it. */
  skillUsed?: boolean;
  /** How many of the skill's rules the reports covered. */
  coverage: { covered: number; of: number };
}

/** One run: a fresh copy, the tool given the prompt, and its reports marked. */
export async function evaluate(
  sheet: Sheet,
  skill: SkillId,
  tool: Tool,
  runner: ToolRunner = runTool,
  into?: string,
  options: EvalOptions = {},
): Promise<EvalRun> {
  const baseline = options.baseline === true;
  if (!baseline && !availableSkills().includes(skill)) {
    throw new Error(`There's no ${skill} skill yet. Run with --baseline to measure the review without one.`);
  }
  const prompt = evalPrompt(sheet, skill, baseline);
  const dir = prepareFixture(sheet.fixture, into, { skills: !baseline });
  if (baseline) {
    mkdirSync(join(dir, ".peer-ai"), { recursive: true });
    copyFileSync(REPORT_SCHEMA, join(dir, ".peer-ai", "review-report.schema.json"));
  }
  const log = `${dir}.log`;
  const toolRun = await runner(tool, dir, prompt, log, options.model);
  const collected = collectReports(dir);
  const logText = existsSync(log) ? readFileSync(log, "utf8") : "";
  return {
    dir,
    score: score(sheet, skill, collected.reports),
    collected,
    tool: toolRun,
    baseline,
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(baseline ? {} : { skillUsed: usedSkill(logText, skill) }),
    coverage: ruleCoverage(collected.reports, skill),
  };
}

export const GradesSchema = z.array(
  z.strictObject({ id: z.string().min(1), met: z.boolean(), quote: z.string().max(1000) }),
);
export type Grade = z.output<typeof GradesSchema>[number];

/** What the grader is asked. It sees only the document and the points, never the project or the tool's run. */
export const GRADE_PROMPT = `Grade a document against a list of points. document.md is the document. points.json lists the points, each with an id.

For each point, decide whether the document makes it: clearly and in substance, not by mentioning a word in passing. Judge only from what the document says.

Write grades.json in this folder: a JSON array with one entry for each point, in the same order, such as {"id": "R1", "met": true, "quote": "..."}. The quote is the document's own words that make the point, at most 200 characters, or, when the point isn't made, what the document says instead. Change no other file.`;

/** The grades the grader wrote, or undefined when it wrote none that are valid. */
export function readGrades(dir: string): Grade[] | undefined {
  try {
    const parsed = GradesSchema.safeParse(JSON.parse(readFileSync(join(dir, "grades.json"), "utf8")));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export interface DocumentScore {
  skill: SkillId;
  path: string;
  /** Whether the run wrote the document, or changed it when it was already there. */
  written: boolean;
  /** What check_document said, for a document that was written. */
  check?: { ready: boolean; problems: string[] };
  graded: boolean;
  points: { id: string; point: string; must: boolean; met: boolean; quote: string }[];
  ready: boolean;
  /** Why it isn't ready, in plain words. */
  reasons: string[];
}

/**
 * Marks a document: it was written, check_document accepts it, it makes every point it must, and
 * at least 80% of all its points.
 */
export function scoreDocument(
  skill: SkillId,
  scenario: DocumentScenario,
  written: boolean,
  check: DocumentScore["check"],
  grades: Grade[] | undefined,
): DocumentScore {
  const byId = new Map((grades ?? []).map((grade) => [grade.id, grade]));
  const points = scenario.points.map(({ id, point, must }) => {
    const grade = byId.get(id);
    return { id, point, must: must === true, met: grade?.met === true, quote: grade?.quote ?? "" };
  });
  const reasons: string[] = [];
  if (!written) reasons.push(`it wrote no document at ${scenario.path}`);
  else {
    if (check !== undefined && !check.ready) reasons.push("check_document didn't accept it");
    if (grades === undefined) reasons.push("the grader gave no valid grades");
    const musts = points.filter((point) => point.must);
    const missed = musts.filter((point) => !point.met).length;
    if (missed > 0) reasons.push(`it missed ${String(missed)} of the ${String(musts.length)} points it must make`);
    const met = points.filter((point) => point.met).length;
    if (met / points.length < POINTS_BAR) {
      reasons.push(`it made ${String(met)} of ${String(points.length)} points, under ${String(POINTS_BAR * 100)}%`);
    }
  }
  return {
    skill,
    path: scenario.path,
    written,
    ...(check === undefined ? {} : { check }),
    graded: grades !== undefined,
    points,
    ready: reasons.length === 0,
    reasons,
  };
}

/** check_document's verdict on a document in the copy, from this checkout's CLI. */
function checkDocumentIn(dir: string, skill: SkillId, path: string): NonNullable<DocumentScore["check"]> {
  let out: string;
  try {
    out = execFileSync(process.execPath, [CLI, "check-document", path, "--skill", skill, "--json"], {
      cwd: dir,
      encoding: "utf8",
    });
  } catch (error) {
    // It exits with 1 when the document isn't ready, and still prints its verdict.
    const { stdout } = error as { stdout?: string | Buffer };
    out = stdout === undefined ? "" : stdout.toString();
  }
  const verdict = JSON.parse(out) as { ok: boolean; ready?: boolean; problems?: string[]; error?: string };
  return verdict.ok
    ? { ready: verdict.ready === true, problems: verdict.problems ?? [] }
    : { ready: false, problems: [verdict.error ?? "check_document couldn't check it"] };
}

export type GraderRunner = (tool: Tool, dir: string, prompt: string, log: string, model?: string) => Promise<void>;

/** Runs a tool headless to grade a document, with no MCP servers and nothing but the grading folder. */
export const runGrader: GraderRunner = async (tool, dir, prompt, log, model) => {
  const choose = model === undefined ? [] : [tool === "codex" ? "-m" : "--model", model];
  if (tool === "claude-code") {
    await run(
      "claude",
      ["-p", prompt, ...choose, "--strict-mcp-config", "--permission-mode", "acceptEdits", "--max-turns", "20"],
      dir,
      log,
    );
    return;
  }
  // The grading folder isn't a git repository, which Codex refuses to work in unless told it's fine.
  const codex = [
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--skip-git-repo-check",
    "--sandbox",
    "workspace-write",
  ];
  await run("codex", [...codex, "-C", dir, "-c", 'approval_policy="never"', ...choose, prompt], dir, log);
};

export interface GraderOptions {
  tool: Tool;
  model?: string;
}

export interface DocumentRun {
  dir: string;
  score: DocumentScore;
  tool: ToolRun;
  baseline: boolean;
  model?: string;
  skillUsed?: boolean;
  grader: GraderOptions;
  /** Graded again from an earlier run's copy, so the run's time and cost aren't known. */
  regraded?: boolean;
}

/**
 * Checks and grades the document a run left in its copy. `before` is the document as the copy
 * started, so a run that leaves an existing document unchanged hasn't written one.
 */
export async function markDocument(
  sheet: Sheet,
  skill: SkillId,
  dir: string,
  before: string | undefined,
  grade: GraderRunner,
  grader: GraderOptions,
): Promise<DocumentScore> {
  const scenario = sheet.documents?.[skill];
  if (scenario === undefined) throw new Error(`evals/${sheet.fixture}.json has no document scenario for ${skill}.`);
  const path = writtenDocument(dir, scenario.path, before);
  if (path === undefined) return scoreDocument(skill, scenario, false, undefined, undefined);
  const check = checkDocumentIn(dir, skill, path);
  const gradeDir = `${dir}-grades`;
  rmSync(gradeDir, { recursive: true, force: true });
  mkdirSync(gradeDir, { recursive: true });
  writeFileSync(join(gradeDir, "document.md"), readFileSync(join(dir, path), "utf8"));
  const points = scenario.points.map(({ id, point }) => ({ id, point }));
  writeFileSync(join(gradeDir, "points.json"), `${JSON.stringify(points, null, 2)}\n`);
  await grade(grader.tool, gradeDir, GRADE_PROMPT, `${gradeDir}.log`, grader.model);
  return { ...scoreDocument(skill, scenario, true, check, readGrades(gradeDir)), path };
}

/**
 * Where the run wrote its document: the expected path when it changed there, or else a new or
 * changed file of the same name elsewhere in the copy, such as requirements/requirements.md for
 * docs/requirements.md. The project map finds a document by its name, so either counts.
 */
export function writtenDocument(dir: string, expected: string, before: string | undefined): string | undefined {
  const target = join(dir, expected);
  if (existsSync(target) && readFileSync(target, "utf8") !== before) return expected;
  let changed: string[];
  try {
    changed = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: dir, encoding: "utf8" })
      .split("\n")
      .map((line) => line.slice(3).trim())
      .filter((line) => line !== "");
  } catch {
    return undefined;
  }
  const name = expected.split("/").at(-1)?.toLowerCase();
  return changed.find((file) => file !== expected && file.split("/").at(-1)?.toLowerCase() === name);
}

/** One run of a document skill: a fresh copy, the tool given the prompt, and the document graded. */
export async function evaluateDocument(
  sheet: Sheet,
  skill: SkillId,
  tool: Tool,
  runner: ToolRunner,
  grade: GraderRunner,
  grader: GraderOptions,
  into: string,
  options: EvalOptions = {},
): Promise<DocumentRun> {
  const scenario = sheet.documents?.[skill];
  if (scenario === undefined) throw new Error(`evals/${sheet.fixture}.json has no document scenario for ${skill}.`);
  const baseline = options.baseline === true;
  if (!baseline && !availableSkills().includes(skill)) {
    throw new Error(`There's no ${skill} skill yet. Run with --baseline to measure the document without one.`);
  }
  const dir = prepareFixture(sheet.fixture, into, { skills: !baseline });
  const target = join(dir, scenario.path);
  const before = existsSync(target) ? readFileSync(target, "utf8") : undefined;
  const log = `${dir}.log`;
  const toolRun = await runner(tool, dir, evalPrompt(sheet, skill, baseline), log, options.model);
  const score = await markDocument(sheet, skill, dir, before, grade, grader);
  const logText = existsSync(log) ? readFileSync(log, "utf8") : "";
  return {
    dir,
    score,
    tool: toolRun,
    baseline,
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(baseline ? {} : { skillUsed: usedSkill(logText, skill) }),
    grader,
  };
}

/**
 * Grades an earlier run's document again, from its copy: when a grader failed, or for a second
 * opinion from another grader. Whether the run had the skill is read from the copy and its log.
 */
export async function regradeDocument(
  sheet: Sheet,
  skill: SkillId,
  dir: string,
  grade: GraderRunner,
  grader: GraderOptions,
  options: EvalOptions = {},
): Promise<DocumentRun> {
  const scenario = sheet.documents?.[skill];
  if (scenario === undefined) throw new Error(`evals/${sheet.fixture}.json has no document scenario for ${skill}.`);
  const original = join(REPO, "fixtures", sheet.fixture, scenario.path);
  const before = existsSync(original) ? readFileSync(original, "utf8") : undefined;
  const baseline = ![".claude/skills", ".agents/skills"].some((home) =>
    existsSync(join(dir, home, renderedName(skill))),
  );
  const log = `${dir}.log`;
  const logText = existsSync(log) ? readFileSync(log, "utf8") : "";
  return {
    dir,
    score: await markDocument(sheet, skill, dir, before, grade, grader),
    tool: { seconds: 0 },
    baseline,
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(baseline ? {} : { skillUsed: usedSkill(logText, skill) }),
    grader,
    regraded: true,
  };
}

const describeSkill = (run: { baseline: boolean; skillUsed?: boolean }) =>
  run.baseline ? "without the skill" : run.skillUsed === true ? "with the skill" : "skill installed, not used";

const where = (span: Span | undefined) => (span === undefined ? "" : `${span.file}:${String(span.line)}`);

export function formatRun(sheet: Sheet, tool: Tool, run: EvalRun, index: number, of: number): string[] {
  const { score: marked, collected } = run;
  const found = marked.expected.filter(({ foundBy }) => foundBy.length > 0).length;
  const model = run.model === undefined ? "" : ` (${run.model})`;
  const lines = [
    `${sheet.fixture} · ${marked.skill} · ${TOOL_NAMES[tool]}${model} · ${describeSkill(run)} · run ${String(index)} of ${String(of)}`,
    "",
    `Found ${String(found)} of ${String(marked.expected.length)} problems on the answer sheet:`,
    `  ${SEVERITIES.filter((s) => marked.bySeverity[s].of > 0)
      .map((s) => `${s} ${String(marked.bySeverity[s].found)} of ${String(marked.bySeverity[s].of)}`)
      .join(" · ")}`,
  ];
  const missed = marked.expected.filter(({ foundBy }) => foundBy.length === 0);
  if (missed.length > 0) {
    lines.push("Missed:");
    for (const { defect } of missed) {
      lines.push(`  ${defect.id.padEnd(4)} ${defect.severity.padEnd(8)} ${where(defect.spans[0])}  ${defect.title}`);
    }
  }
  if (marked.unmatched.length > 0) {
    lines.push(`Raised but not on the answer sheet, for a person to judge (${String(marked.unmatched.length)}):`);
    for (const finding of marked.unmatched) {
      const at = `${finding.location.file}${finding.location.line === undefined ? "" : `:${String(finding.location.line)}`}`;
      lines.push(`  ${finding.id.padEnd(4)} ${finding.severity.padEnd(8)} ${at}  ${finding.title}`);
    }
  }
  for (const bad of collected.invalid) lines.push(`Invalid report ${bad.path}: ${bad.errors.slice(0, 3).join("; ")}`);
  lines.push(`Covered ${String(run.coverage.covered)} of the skill's ${String(run.coverage.of)} rules.`);
  const cost = run.tool.costUsd === undefined ? "" : ` · $${run.tool.costUsd.toFixed(2)}`;
  const turns = run.tool.turns === undefined ? "" : `${String(run.tool.turns)} turns · `;
  lines.push(`${turns}${String(Math.round(run.tool.seconds))} s${cost} · copy in ${run.dir}`);
  lines.push(
    "",
    marked.ready ? "Ready: it found every serious problem." : `Not ready yet: ${marked.reasons.join("; ")}.`,
  );
  return lines;
}

/** Adds a row to the end of the first table under a heading, such as "## Results". */
export function appendResult(readme: string, heading: string, row: string): void {
  const lines = readFileSync(readme, "utf8").split("\n");
  const start = lines.indexOf(heading);
  const first = lines.findIndex((line, index) => index > start && line.startsWith("|"));
  if (start === -1 || first === -1) throw new Error(`${readme} has no table under "${heading}" for the new row.`);
  let last = first;
  while (lines[last + 1]?.startsWith("|") === true) last++;
  lines.splice(last + 1, 0, row);
  writeFileSync(readme, lines.join("\n"));
}

export const REVIEW_RESULTS = "## Results";
export const DOCUMENT_RESULTS = "## Document results";

function record(sheet: Sheet, tool: Tool, run: EvalRun): void {
  const { score: marked } = run;
  const found = marked.expected.filter(({ foundBy }) => foundBy.length > 0).length;
  const date = new Date().toISOString().slice(0, 10);
  const cost = run.tool.costUsd === undefined ? "–" : `$${run.tool.costUsd.toFixed(2)}`;
  const model = run.model ?? "default";
  const skillColumn = run.baseline ? "without" : run.skillUsed === true ? "used" : "not used";
  const rules = `${String(run.coverage.covered)} of ${String(run.coverage.of)}`;
  appendResult(
    join(EVALS, "README.md"),
    REVIEW_RESULTS,
    `| ${date} | ${sheet.fixture} | ${marked.skill} | ${TOOL_NAMES[tool]} | ${model} | ${skillColumn} | ${String(found)} of ${String(marked.expected.length)} | ${rules} | ${String(marked.unmatched.length)} | ${marked.ready ? "Ready" : "Not ready"} | ${cost} |`,
  );
}

export function formatDocumentRun(sheet: Sheet, tool: Tool, run: DocumentRun, index: number, of: number): string[] {
  const { score: marked } = run;
  const model = run.model === undefined ? "" : ` (${run.model})`;
  const lines = [
    `${sheet.fixture} · ${marked.skill} · ${TOOL_NAMES[tool]}${model} · ${describeSkill(run)} · run ${String(index)} of ${String(of)}`,
    "",
  ];
  const expected = sheet.documents?.[marked.skill]?.path;
  if (marked.written && expected !== undefined && marked.path !== expected) {
    lines.push(`Written to ${marked.path}, not ${expected}.`);
  }
  if (marked.written) {
    const met = marked.points.filter((point) => point.met).length;
    const musts = marked.points.filter((point) => point.must);
    const graderModel = run.grader.model === undefined ? "" : ` (${run.grader.model})`;
    lines.push(
      `Made ${String(met)} of ${String(marked.points.length)} points, and ${String(musts.filter((point) => point.met).length)} of the ${String(musts.length)} it must make. Graded by ${TOOL_NAMES[run.grader.tool]}${graderModel}; check the quotes:`,
    );
    for (const point of marked.points) {
      const quote = point.quote === "" ? "" : ` "${point.quote}"`;
      lines.push(
        `  ${point.met ? "✓" : "✗"} ${point.id.padEnd(5)}${point.must ? "must " : "     "}${point.point}${quote}`,
      );
    }
    const check = marked.check;
    if (check !== undefined) {
      lines.push(
        check.ready ? "check_document accepted it." : `check_document refused it: ${check.problems.join(" ")}`,
      );
    }
  }
  const cost = run.tool.costUsd === undefined ? "" : ` · $${run.tool.costUsd.toFixed(2)}`;
  const turns = run.tool.turns === undefined ? "" : `${String(run.tool.turns)} turns · `;
  lines.push(
    run.regraded === true
      ? `Graded again from the copy in ${run.dir}`
      : `${turns}${String(Math.round(run.tool.seconds))} s${cost} · copy in ${run.dir}`,
  );
  lines.push("", marked.ready ? "Ready: it made every point it must." : `Not ready yet: ${marked.reasons.join("; ")}.`);
  return lines;
}

function recordDocument(sheet: Sheet, tool: Tool, run: DocumentRun): void {
  const { score: marked } = run;
  const date = new Date().toISOString().slice(0, 10);
  const cost = run.tool.costUsd === undefined ? "–" : `$${run.tool.costUsd.toFixed(2)}`;
  const skillColumn = run.baseline ? "without" : run.skillUsed === true ? "used" : "not used";
  const met = marked.points.filter((point) => point.met).length;
  const musts = marked.points.filter((point) => point.must);
  const check = marked.check === undefined ? "–" : marked.check.ready ? "Accepted" : "Refused";
  const grader = `${TOOL_NAMES[run.grader.tool]}${run.grader.model === undefined ? "" : ` ${run.grader.model}`}`;
  appendResult(
    join(EVALS, "README.md"),
    DOCUMENT_RESULTS,
    `| ${date} | ${sheet.fixture} | ${marked.skill} | ${TOOL_NAMES[tool]} | ${run.model ?? "default"} | ${skillColumn} | ${marked.written ? `${String(met)} of ${String(marked.points.length)}` : "No document"} | ${String(musts.filter((point) => point.met).length)} of ${String(musts.length)} | ${check} | ${marked.ready ? "Ready" : "Not ready"} | ${grader} | ${cost} |`,
  );
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      skill: { type: "string" },
      tool: { type: "string", default: "claude-code" },
      model: { type: "string" },
      baseline: { type: "boolean" },
      runs: { type: "string", default: "1" },
      record: { type: "boolean" },
      grader: { type: "string", default: "codex" },
      "grader-model": { type: "string" },
      regrade: { type: "string" },
    },
  });
  const [name] = positionals;
  const skill = values.skill as SkillId | undefined;
  const tool = values.tool as Tool;
  const graderTool = values.grader as Tool;
  const tools: string[] = ["claude-code", "codex"];
  if (name === undefined || skill === undefined || !tools.includes(tool) || !tools.includes(graderTool)) {
    console.error(
      `Usage: node scripts/eval.ts <fixture> --skill <skill> [--tool claude-code|codex] [--model <model>] [--grader claude-code|codex] [--grader-model <model>] [--baseline] [--runs <n>] [--regrade <copy>] [--record]. The answer sheets are: ${sheets().join(", ")}.`,
    );
    process.exit(2);
  }
  const sheet = loadSheet(name);
  const runs = Number(values.runs);
  let allReady = true;
  const into = () =>
    // Unique for each run, since runs on different tools may start in the same millisecond.
    join(tmpdir(), `peer-ai-eval-${name}-${skill}-${tool}-${String(Date.now())}-${randomUUID().slice(0, 8)}`);
  const options = {
    baseline: values.baseline === true,
    ...(values.model === undefined ? {} : { model: values.model }),
  };
  const regrade = values.regrade;
  if (regrade !== undefined) {
    const grader = {
      tool: graderTool,
      ...(values["grader-model"] === undefined ? {} : { model: values["grader-model"] }),
    };
    const result = await regradeDocument(sheet, skill, resolve(regrade), runGrader, grader, options);
    console.log(formatDocumentRun(sheet, tool, result, 1, 1).join("\n"));
    if (values.record === true) recordDocument(sheet, tool, result);
    allReady &&= result.score.ready;
  }
  for (let i = 1; i <= runs && regrade === undefined && SKILL_KINDS[skill] === "document"; i++) {
    const grader = {
      tool: graderTool,
      ...(values["grader-model"] === undefined ? {} : { model: values["grader-model"] }),
    };
    const result = await evaluateDocument(sheet, skill, tool, runTool, runGrader, grader, into(), options);
    console.log(formatDocumentRun(sheet, tool, result, i, runs).join("\n"));
    if (i < runs) console.log("");
    if (values.record === true) recordDocument(sheet, tool, result);
    allReady &&= result.score.ready;
  }
  for (let i = 1; i <= runs && regrade === undefined && SKILL_KINDS[skill] !== "document"; i++) {
    const result = await evaluate(sheet, skill, tool, runTool, into(), options);
    console.log(formatRun(sheet, tool, result, i, runs).join("\n"));
    if (i < runs) console.log("");
    if (values.record === true) record(sheet, tool, result);
    allReady &&= result.score.ready;
  }
  process.exitCode = allReady ? 0 : 1;
}
