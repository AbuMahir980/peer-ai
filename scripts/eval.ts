// Tests how well a review finds the problems planted in a fixture (RFC 0002). Each fixture's
// answer sheet lives in evals/<fixture>.json, outside the fixture, so the tool under test works on
// a copy that never contains the answers.
//
//   node scripts/eval.ts <fixture> --skill <skill> [--tool claude-code|codex] [--runs <n>] [--record]

import { execFile } from "node:child_process";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { SEVERITIES, SKILL_IDS, validateReport, type ReviewReport, type SkillId } from "@peer-ai/workflow";
import { z } from "zod";
import { localServer, prepareFixture } from "./fixture.ts";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const EVALS = join(REPO, "evals");
const REPORT_SCHEMA = join(REPO, "packages/workflow/schemas/review-report.schema.json");

/** How far a finding's lines may be from a planted problem and still count as finding it. */
export const LINE_TOLERANCE = 3;
/** The share of planted medium problems a review must find to be ready to ship. */
export const MEDIUM_BAR = 0.8;

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

export const SheetSchema = z.strictObject({
  fixture: z.string().min(1),
  prompts: z.partialRecord(z.enum(SKILL_IDS), z.string().min(1)),
  defects: z.array(Defect),
});

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
  return { fixture: parsed.data.fixture, prompts: parsed.data.prompts, defects };
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
 * The planted problem a finding is about: the nearest one in the same file within the line
 * tolerance, at a severity no more than one level away. Each finding counts for one problem at
 * most, so a single finding can't score twice when two problems sit close together.
 */
function bestMatch(finding: Finding, defects: ResolvedDefect[]): ResolvedDefect | undefined {
  let best: { defect: ResolvedDefect; lines: number; gap: number } | undefined;
  for (const defect of defects) {
    const gap = Math.abs(SEVERITIES.indexOf(finding.severity) - SEVERITIES.indexOf(defect.severity));
    if (gap > 1) continue;
    for (const span of defect.spans) {
      if (normalise(finding.location.file) !== span.file) continue;
      const lines = distance(finding, span);
      if (lines > LINE_TOLERANCE) continue;
      if (best === undefined || lines < best.lines || (lines === best.lines && gap < best.gap)) {
        best = { defect, lines, gap };
      }
    }
  }
  return best?.defect;
}

/** Marks a review's reports against the answer sheet. */
export function score(sheet: Sheet, skill: SkillId, reports: ReviewReport[]): Score {
  const findings = reports.filter((report) => report.skill === skill).flatMap((report) => report.findings);
  const matched = new Map(findings.map((finding) => [finding, bestMatch(finding, sheet.defects)]));
  const expected = sheet.defects
    .filter((defect) => defect.skills.includes(skill))
    .map((defect) => ({
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
export type ToolRunner = (tool: Tool, dir: string, prompt: string, log: string) => Promise<ToolRun>;

const TOOL_NAMES: Record<Tool, string> = { "claude-code": "Claude Code", codex: "Codex" };

/** Until Peer AI's skills serve it, the runner tells the tool where the report format is. */
export function evalPrompt(sheet: Sheet, skill: SkillId): string {
  const ask = sheet.prompts[skill];
  if (ask === undefined) {
    const known = Object.keys(sheet.prompts).join(", ");
    throw new Error(`evals/${sheet.fixture}.json has no prompt for ${skill}. It has: ${known}.`);
  }
  return `${ask}\n\nWrite the review's report as JSON in .peer-ai/reports/, following the format in .peer-ai/review-report.schema.json.`;
}

function run(command: string, args: string[], cwd: string, log: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, { cwd, maxBuffer: 256 * 1024 * 1024, timeout: 30 * 60 * 1000 }, (error, stdout, stderr) => {
      writeFileSync(log, `${stdout}\n${stderr}`);
      if (error) reject(new Error(`${command} failed: ${error.message}. The log is at ${log}.`));
      else resolvePromise(stdout);
    });
  });
}

/** Runs a real AI tool headless on the copy, with only the peer-ai server and its own file tools. */
export const runTool: ToolRunner = async (tool, dir, prompt, log) => {
  const started = Date.now();
  const server = localServer();
  if (tool === "claude-code") {
    const out = await run(
      "claude",
      [
        "-p",
        prompt,
        "--mcp-config",
        ".mcp.json",
        "--strict-mcp-config",
        "--permission-mode",
        "acceptEdits",
        "--allowedTools",
        "mcp__peer-ai",
        "Bash(git:*)",
        "--output-format",
        "json",
        "--max-turns",
        "80",
      ],
      dir,
      log,
    );
    const result = JSON.parse(out) as { num_turns?: number; total_cost_usd?: number };
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
      prompt,
    ],
    dir,
    log,
  );
  return { seconds: (Date.now() - started) / 1000 };
};

export interface EvalRun {
  dir: string;
  score: Score;
  collected: CollectedReports;
  tool: ToolRun;
}

/** One run: a fresh copy, the tool given the prompt, and its reports marked. */
export async function evaluate(
  sheet: Sheet,
  skill: SkillId,
  tool: Tool,
  runner: ToolRunner = runTool,
  into?: string,
): Promise<EvalRun> {
  const prompt = evalPrompt(sheet, skill);
  const dir = prepareFixture(sheet.fixture, into);
  mkdirSync(join(dir, ".peer-ai"), { recursive: true });
  copyFileSync(REPORT_SCHEMA, join(dir, ".peer-ai", "review-report.schema.json"));
  const log = `${dir}.log`;
  const toolRun = await runner(tool, dir, prompt, log);
  const collected = collectReports(dir);
  return { dir, score: score(sheet, skill, collected.reports), collected, tool: toolRun };
}

const where = (span: Span | undefined) => (span === undefined ? "" : `${span.file}:${String(span.line)}`);

export function formatRun(sheet: Sheet, tool: Tool, run: EvalRun, index: number, of: number): string[] {
  const { score: marked, collected } = run;
  const found = marked.expected.filter(({ foundBy }) => foundBy.length > 0).length;
  const lines = [
    `${sheet.fixture} · ${marked.skill} · ${TOOL_NAMES[tool]} · run ${String(index)} of ${String(of)}`,
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
  const cost = run.tool.costUsd === undefined ? "" : ` · $${run.tool.costUsd.toFixed(2)}`;
  const turns = run.tool.turns === undefined ? "" : `${String(run.tool.turns)} turns · `;
  lines.push(`${turns}${String(Math.round(run.tool.seconds))} s${cost} · copy in ${run.dir}`);
  lines.push(
    "",
    marked.ready ? "Ready: it found every serious problem." : `Not ready yet: ${marked.reasons.join("; ")}.`,
  );
  return lines;
}

/** Adds a row to the results table, which must be the last thing in the file. */
export function appendResult(readme: string, row: string): void {
  const lastLine = readFileSync(readme, "utf8").trimEnd().split("\n").at(-1) ?? "";
  if (!lastLine.startsWith("|")) {
    throw new Error(
      `The results table must be the last thing in ${readme}, so a new row lands in it. Move anything after it above it.`,
    );
  }
  appendFileSync(readme, `${row}\n`);
}

function record(sheet: Sheet, tool: Tool, run: EvalRun): void {
  const { score: marked } = run;
  const found = marked.expected.filter(({ foundBy }) => foundBy.length > 0).length;
  const date = new Date().toISOString().slice(0, 10);
  const cost = run.tool.costUsd === undefined ? "–" : `$${run.tool.costUsd.toFixed(2)}`;
  appendResult(
    join(EVALS, "README.md"),
    `| ${date} | ${sheet.fixture} | ${marked.skill} | ${TOOL_NAMES[tool]} | ${String(found)} of ${String(marked.expected.length)} | ${String(marked.unmatched.length)} | ${marked.ready ? "Ready" : "Not ready"} | ${cost} |`,
  );
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      skill: { type: "string" },
      tool: { type: "string", default: "claude-code" },
      runs: { type: "string", default: "1" },
      record: { type: "boolean" },
    },
  });
  const [name] = positionals;
  const skill = values.skill as SkillId | undefined;
  const tool = values.tool as Tool;
  if (name === undefined || skill === undefined || !(["claude-code", "codex"] as string[]).includes(tool)) {
    console.error(
      `Usage: node scripts/eval.ts <fixture> --skill <skill> [--tool claude-code|codex] [--runs <n>] [--record]. The answer sheets are: ${sheets().join(", ")}.`,
    );
    process.exit(2);
  }
  const sheet = loadSheet(name);
  const runs = Number(values.runs);
  let allReady = true;
  for (let i = 1; i <= runs; i++) {
    const result = await evaluate(
      sheet,
      skill,
      tool,
      runTool,
      join(tmpdir(), `peer-ai-eval-${name}-${skill}-${String(Date.now())}`),
    );
    console.log(formatRun(sheet, tool, result, i, runs).join("\n"));
    if (i < runs) console.log("");
    if (values.record === true) record(sheet, tool, result);
    allReady &&= result.score.ready;
  }
  process.exitCode = allReady ? 0 : 1;
}
