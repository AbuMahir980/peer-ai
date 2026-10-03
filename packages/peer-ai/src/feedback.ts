// The feedback route (RFC 0007). When Peer AI gets something wrong in a project, the AI tool drafts
// a report with the draft_feedback tool, and a person decides whether it's sent: `peer-ai feedback`
// lists the drafts, `send` opens one as an issue on Peer AI's repository, `drop` deletes it. A
// report leaves the machine only when a person has read it and said yes.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { arch, platform } from "node:os";
import { basename, join } from "node:path";
import type { PeerAiConfig } from "peer-ai-workflow";
import type { Output } from "./init.ts";
import { VERSION } from "./package-info.ts";
import { Cancelled, type Prompter } from "./prompter.ts";
import type { Result } from "./work.ts";

export const FEEDBACK_DIR = ".peer-ai/feedback";
const SENT_DIR = join(FEEDBACK_DIR, "sent");
/** Where reports go. */
export const FEEDBACK_REPO = "AbuMahir980/peer-ai";

export interface FeedbackInput {
  /** One line, such as "security-review flagged a test file as production code". */
  title: string;
  /** What happened, in plain words. */
  what: string;
  /** What should have happened. */
  expected: string;
  /** The skill involved, when there is one. */
  skill?: string | undefined;
  /** The command or tool involved, when there is one. */
  command?: string | undefined;
}

/** What Peer AI knows itself, and adds to every report. */
export interface FeedbackContext {
  /** The AI tool, as it named itself when it connected. */
  tool?: string;
  node?: string;
  os?: string;
}

/**
 * What a report must never hold, with what to do instead. Project code, secrets and people's
 * details stay out of a report that becomes a public issue.
 */
const NEVER: { pattern: RegExp; problem: string }[] = [
  { pattern: /```|~~~/, problem: "It holds a block of code. Describe what the code does in words instead." },
  {
    pattern:
      /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{8,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bAKIA[0-9A-Z]{16}\b|\bxox[abprs]-[A-Za-z0-9-]{10,}|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|[A-Za-z0-9+/_=-]{40,}/,
    problem: "It holds something that looks like a key or a token. Take it out.",
  },
  {
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
    problem: "It holds an email address. Take it out, and any other detail about a person.",
  },
];

/** Why a draft can't be written as it is: empty when it can. */
export function draftProblems(input: FeedbackInput): string[] {
  const text = [input.title, input.what, input.expected, input.skill ?? "", input.command ?? ""].join("\n");
  const problems = NEVER.filter(({ pattern }) => pattern.test(text)).map(({ problem }) => problem);
  if (input.title.includes("\n")) problems.push("The title is more than one line.");
  return problems;
}

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
    .replace(/-$/, "") || "feedback";

/** The report as a person reads it and as the issue shows it. */
export function formatReport(input: FeedbackInput, config: PeerAiConfig | undefined, context: FeedbackContext): string {
  const facts: [string, string | undefined][] = [
    ["Peer AI", VERSION],
    ["AI tool", context.tool],
    ["Skill", input.skill],
    ["Command or tool", input.command],
    ["Operating system", context.os ?? `${platform()} ${arch()}`],
    ["Node", context.node ?? process.versions.node],
    ["Stage", config?.project.stage],
    ["Stack profiles", config?.standards?.profiles?.join(", ")],
  ];
  return [
    `# ${input.title.trim()}`,
    "",
    "## What happened",
    "",
    input.what.trim(),
    "",
    "## What should have happened",
    "",
    input.expected.trim(),
    "",
    "## Where",
    "",
    "| | |",
    "|-|-|",
    ...facts.flatMap(([name, value]) => (value === undefined || value === "" ? [] : [`| ${name} | ${value} |`])),
    "",
    "Drafted by an AI tool with Peer AI's draft_feedback, and sent by a person who read it.",
    "",
  ].join("\n");
}

/** A report already sent, kept in .peer-ai/feedback/sent/ with the issue it became. */
export interface SentReport {
  file: string;
  title: string;
  issue?: string;
}

/** The reports sent from this project, oldest first. */
export function listSent(root: string): SentReport[] {
  const dir = join(root, SENT_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const text = readFileSync(join(dir, file), "utf8");
      const issue = /^Sent as (https:\/\/\S+)$/m.exec(text)?.[1];
      return { file, title: /^# (.+)$/m.exec(text)?.[1] ?? file, ...(issue === undefined ? {} : { issue }) };
    });
}

export interface IssueState {
  state: "open" | "closed";
  closedAt?: string;
}

/**
 * The state of each issue this person opened on Peer AI's repository, by its link, in one call to
 * gh (RFC 0014); undefined without a signed-in gh.
 */
export function issueStates(run: Runner = runQuietly): Map<string, IssueState> | undefined {
  const printed = run("gh", [
    "issue",
    "list",
    "--repo",
    FEEDBACK_REPO,
    "--author",
    "@me",
    "--state",
    "all",
    "--limit",
    "500",
    "--json",
    "url,state,closedAt",
  ]);
  if (printed === undefined) return undefined;
  try {
    const issues = JSON.parse(printed) as { url: string; state: string; closedAt?: string | null }[];
    return new Map(
      issues.map((issue) => [
        issue.url,
        {
          state: issue.state === "CLOSED" ? "closed" : "open",
          ...(issue.closedAt === undefined || issue.closedAt === null ? {} : { closedAt: issue.closedAt }),
        },
      ]),
    );
  } catch {
    return undefined;
  }
}

const words = (title: string): Set<string> =>
  new Set((title.toLowerCase().match(/[a-z0-9_]+/g) ?? []).filter((word) => word.length > 3));

/** A sent report whose title shares most of its words with a new one: likely the same report. */
export function similarSent(root: string, title: string): SentReport | undefined {
  const mine = words(title);
  let best: { report: SentReport; score: number } | undefined;
  for (const report of listSent(root)) {
    const theirs = words(report.title);
    const shared = [...mine].filter((word) => theirs.has(word)).length;
    const score = shared / Math.max(1, new Set([...mine, ...theirs]).size);
    if (score >= 0.5 && (best === undefined || score > best.score)) best = { report, score };
  }
  return best?.report;
}

/**
 * Writes a draft to .peer-ai/feedback/, or refuses it with what to take out. A draft like a report
 * already sent is still written, with a note naming that report and its state (RFC 0014).
 */
export function draftFeedback(
  root: string,
  config: PeerAiConfig | undefined,
  input: FeedbackInput,
  context: FeedbackContext,
  now: Date,
  run: Runner = runQuietly,
): Result<{ draft: string; note?: string }> {
  const problems = draftProblems(input);
  if (problems.length > 0) {
    return {
      ok: false,
      error: `Peer AI won't write this draft, since a report may become public. ${problems.join(" ")}`,
    };
  }
  const dir = join(root, FEEDBACK_DIR);
  mkdirSync(dir, { recursive: true });
  const stem = `${now.toISOString().slice(0, 10)}-${slug(input.title)}`;
  let name = `${stem}.md`;
  for (let n = 2; existsSync(join(dir, name)); n++) name = `${stem}-${String(n)}.md`;
  writeFileSync(join(dir, name), formatReport(input, config, context));
  const similar = similarSent(root, input.title);
  if (similar === undefined) return { ok: true, value: { draft: join(FEEDBACK_DIR, name) } };
  const state = similar.issue === undefined ? undefined : issueStates(run)?.get(similar.issue);
  const which = similar.issue ?? similar.file;
  const note =
    state?.state === "closed"
      ? `This looks like a report already sent, ${which}, which is closed: it may be fixed in the version this project now uses. Check before the person sends it.`
      : `This looks like a report already sent, ${which}${state === undefined ? "" : ", which is still open"}. Check it's not the same before the person sends it; if it is, drop this draft.`;
  return { ok: true, value: { draft: join(FEEDBACK_DIR, name), note } };
}

export interface Draft {
  file: string;
  title: string;
}

/** The drafts waiting for a person's decision, oldest first. */
export function listDrafts(root: string): Draft[] {
  const dir = join(root, FEEDBACK_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => ({
      file,
      title: /^# (.+)$/m.exec(readFileSync(join(dir, file), "utf8"))?.[1] ?? file,
    }));
}

/** A draft by its file name or its path, never a file outside the drafts folder. */
function findDraft(root: string, draft: string): Result<string> {
  const file = basename(draft);
  const path = join(root, FEEDBACK_DIR, file);
  if (!file.endsWith(".md") || !existsSync(path)) {
    const waiting = listDrafts(root).map((d) => d.file);
    return {
      ok: false,
      error: `There's no draft ${file}.${waiting.length === 0 ? " No drafts are waiting." : ` Waiting: ${waiting.join(", ")}.`}`,
    };
  }
  return { ok: true, value: path };
}

/** Runs a command and returns what it printed, or undefined when it failed. */
export type Runner = (command: string, args: string[]) => string | undefined;

export const runQuietly: Runner = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    return undefined;
  }
};

/** A link that opens a new issue with the report filled in, for a person to submit. */
export function issueLink(title: string, body: string): string {
  const params = new URLSearchParams({ title, body, labels: "feedback" });
  return `https://github.com/${FEEDBACK_REPO}/issues/new?${params.toString()}`;
}

export type Sent = { issue: string } | { link: string };

/**
 * Opens a draft as an issue on Peer AI's repository, through the GitHub CLI when it's signed in,
 * under the person's own account, then moves the draft to sent/. Without the CLI, returns a link
 * for the person to open and submit, and keeps the draft.
 */
export function sendDraft(root: string, draft: string, run: Runner = runQuietly): Result<Sent> {
  const found = findDraft(root, draft);
  if (!found.ok) return found;
  const report = readFileSync(found.value, "utf8");
  const title = /^# (.+)$/m.exec(report)?.[1] ?? basename(found.value, ".md");
  const body = report.replace(/^# .+\n+/, "");
  if (run("gh", ["auth", "status"]) !== undefined) {
    const create = ["issue", "create", "--repo", FEEDBACK_REPO, "--title", title, "--body", body];
    // The label helps the maintainer sort reports; an issue without it is still a report.
    const printed = run("gh", [...create, "--label", "feedback"]) ?? run("gh", create);
    const issue = printed?.trim().split("\n").at(-1);
    if (issue?.startsWith("https://") === true) {
      mkdirSync(join(root, SENT_DIR), { recursive: true });
      writeFileSync(found.value, `${report.trimEnd()}\n\nSent as ${issue}\n`);
      renameSync(found.value, join(root, SENT_DIR, basename(found.value)));
      return { ok: true, value: { issue } };
    }
  }
  return { ok: true, value: { link: issueLink(title, body) } };
}

/** Deletes a draft the person decided not to send. */
export function dropDraft(root: string, draft: string): Result<{ dropped: string }> {
  const found = findDraft(root, draft);
  if (!found.ok) return found;
  rmSync(found.value);
  return { ok: true, value: { dropped: basename(found.value) } };
}

export interface FeedbackOptions {
  cwd: string;
  action?: string | undefined;
  draft?: string | undefined;
  run?: Runner;
}

/** `peer-ai feedback [send|drop <draft>]`. Exit code 0 done, 1 refused, 2 a usage error. */
export function runFeedback(options: FeedbackOptions, out: Output): number {
  const { cwd, action, draft } = options;
  if (action === undefined) {
    const drafts = listDrafts(cwd);
    if (drafts.length === 0) out.log("No feedback drafts are waiting.");
    else {
      out.log(`Feedback drafts waiting for your decision, in ${FEEDBACK_DIR}/:`);
      for (const { file, title } of drafts) out.log(`  ${file}: ${title}`);
      out.log("");
      out.log("Read one, then run peer-ai feedback send <draft> or peer-ai feedback drop <draft>.");
    }
    const sent = listSent(cwd);
    if (sent.length > 0) {
      const states = issueStates(options.run);
      out.log("");
      out.log(`Sent, in ${SENT_DIR}/:`);
      for (const report of sent) out.log(`  ${report.file}: ${report.title}${describeState(report, states)}`);
      if (states === undefined) out.log("Sign in to the GitHub CLI, gh, to see which are fixed.");
      else if (sent.some((report) => closed(report, states))) {
        out.log("Run peer-ai feedback prune to clear the ones that are closed.");
      }
    }
    return 0;
  }
  if ((action !== "send" && action !== "drop") || draft === undefined) {
    out.error(
      "Use peer-ai feedback, peer-ai feedback send <draft>, peer-ai feedback drop <draft> or peer-ai feedback prune.",
    );
    return 2;
  }
  if (action === "drop") {
    const dropped = dropDraft(cwd, draft);
    if (!dropped.ok) {
      out.error(dropped.error);
      return 1;
    }
    out.log(`Dropped ${dropped.value.dropped}.`);
    return 0;
  }
  const sent = sendDraft(cwd, draft, options.run);
  if (!sent.ok) {
    out.error(sent.error);
    return 1;
  }
  if ("issue" in sent.value) out.log(`Sent: ${sent.value.issue}`);
  else {
    out.log("The GitHub CLI isn't signed in here, so open this link to submit the report yourself:");
    out.log(sent.value.link);
    out.log(`Once it's submitted, run peer-ai feedback drop ${basename(draft)}.`);
  }
  return 0;
}

const closed = (report: SentReport, states: Map<string, IssueState> | undefined): boolean =>
  report.issue !== undefined && states?.get(report.issue)?.state === "closed";

function describeState(report: SentReport, states: Map<string, IssueState> | undefined): string {
  if (report.issue === undefined) return "";
  const state = states?.get(report.issue);
  if (state === undefined) return ` (${report.issue})`;
  return state.state === "open"
    ? ` (${report.issue}, open)`
    : ` (${report.issue}, closed${state.closedAt === undefined ? "" : ` on ${state.closedAt.slice(0, 10)}`})`;
}

export interface PruneOptions {
  cwd: string;
  yes: boolean;
  run?: Runner;
}

/**
 * `peer-ai feedback prune`: removes the sent reports whose issues are closed, after listing them
 * and asking (RFC 0014). The issues stay on GitHub; open ones stay here. Exit code 0 done or
 * nothing to do, 1 declined or gh not signed in, 2 without a terminal and --yes.
 */
export async function runPrune(options: PruneOptions, prompter: Prompter | undefined, out: Output): Promise<number> {
  const states = issueStates(options.run);
  if (states === undefined) {
    out.error("Pruning needs to know which issues are closed: sign in to the GitHub CLI with gh auth login.");
    return 1;
  }
  const done = listSent(options.cwd).filter((report) => closed(report, states));
  if (done.length === 0) {
    out.log("No sent report's issue is closed yet.");
    return 0;
  }
  out.log("These sent reports' issues are closed:");
  for (const report of done) out.log(`  ${report.file}: ${report.title}${describeState(report, states)}`);
  if (!options.yes) {
    if (prompter === undefined) {
      out.error(
        "prune asks before it removes anything, so it needs a terminal. To remove them without asking, pass --yes.",
      );
      return 2;
    }
    try {
      if (
        !(await prompter.confirm(
          `Remove ${done.length === 1 ? "it" : `all ${String(done.length)}`}? The issues stay on GitHub.`,
          true,
        ))
      ) {
        out.log("Nothing was removed.");
        return 1;
      }
    } catch (error) {
      if (error instanceof Cancelled) {
        out.log("Cancelled. Nothing was removed.");
        return 1;
      }
      throw error;
    }
  }
  for (const report of done) rmSync(join(options.cwd, SENT_DIR, report.file));
  out.log(`Removed ${String(done.length)} sent ${done.length === 1 ? "report" : "reports"} whose issues are closed.`);
  return 0;
}
