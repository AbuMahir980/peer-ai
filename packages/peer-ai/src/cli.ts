#!/usr/bin/env node
// The peer-ai command. Exit codes: 0 success, 1 refused, cancelled or problems found, 2 usage or
// config error.

import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { CLI_COMMAND_IDS, TOOL_IDS, type CliCommandId, type ToolId } from "peer-ai-workflow";
import { runAssess } from "./assess.ts";
import { runCheck } from "./check.ts";
import { runCheckDocument } from "./document.ts";
import { runDoctor } from "./doctor.ts";
import { runFeedback } from "./feedback.ts";
import { serveStdio } from "./mcp.ts";
import { runInit, type InitOptions, type Output, type Stage, type Team } from "./init.ts";
import { runMigrate } from "./migrate.ts";
import { VERSION } from "./package-info.ts";
import { createTerminalPrompter, type Prompter } from "./prompter.ts";
import { formatReport } from "./report.ts";
import { runRender } from "./render.ts";
import { runCheckReport } from "./work.ts";

const STAGES: readonly Stage[] = ["prototype", "mvp", "production"];

const HELP = `peer-ai: from a brief to a shipped product, with any AI tool

Usage:
  peer-ai init [options]      Set up Peer AI in this repository
  peer-ai migrate [options]   Move a project from its copy of v0 onto Peer AI 1.0
  peer-ai assess [options]    Map what the project has and what its stage still needs
  peer-ai render [options]    Set up each AI tool in the config: instructions and the MCP server
  peer-ai doctor [options]    Check that Peer AI is set up correctly, and how to fix it
  peer-ai check [options]     The CI gate: fail when work claims more than its record shows
  peer-ai check-report <file> Check a review's report, as the record_review tool does
  peer-ai check-document <file> --skill <skill>
                              Check a document against its skill's template, as the
                              check_document tool does
  peer-ai feedback            List the feedback drafts your AI tool wrote about Peer AI
  peer-ai feedback send <draft>
                              Send a draft as an issue on Peer AI's repository
  peer-ai feedback drop <draft>
                              Delete a draft
  peer-ai mcp                 Start the MCP server that AI tools connect to, over stdio

Options for init:
  -y, --yes                   Accept what init detects instead of asking
      --dry-run               Print the config instead of writing it
      --name <name>           The project's name
      --stage <stage>         prototype, mvp or production
      --team <team>           solo or team
      --tool <tool>           An AI tool you use; repeat for several
                              (${TOOL_IDS.join(", ")})

Options for migrate: the same as init. It never commits, and it won't start on
uncommitted changes. --dry-run prints what it would do, changing nothing.

Options for assess:
      --target <stage>        Assess against a stage other than the project's own,
                              for example production before a launch
      --json                  Print the project map as JSON instead of the report
      --dry-run               Don't write .peer-ai/map.json

Options for render:
      --check                 Change nothing; fail when a file is out of date (for CI)
      --skills                Write only the skills (what each tool's setup step runs)
      --quiet                 Print nothing unless something fails

Options for check-report:
      --skill <skill>         The skill the report is for (default: the one it names)
      --work-item <id>        The work item it's for, when there is one
      --json                  Print the result as JSON

Options for check-document:
      --skill <skill>         The document skill that wrote it, such as requirements-analysis
      --template <name>       Which of the skill's templates it follows (default: the main one)
      --json                  Print the result as JSON

Options for doctor and check:
      --json                  Print the checks as JSON

Options for check:
      --branch <branch>       The branch a pull request is for: its work item must be at
                              ship. On GitHub Actions, check reads it from the pull request.

Other:
  -h, --help                  Show this help
  -v, --version               Show the version`;

export interface Io {
  cwd: string;
  out: Output;
  /** Present when questions can be asked, which means a terminal is attached. */
  prompter?: Prompter;
}

function oneOf<T extends string>(value: string, allowed: readonly T[], flag: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`${flag} must be one of: ${allowed.join(", ")}`);
}

/** The options init and migrate share. */
function initOptions(args: string[], io: Io): InitOptions {
  const { values } = parseArgs({
    args,
    strict: true,
    options: {
      yes: { type: "boolean", short: "y" },
      "dry-run": { type: "boolean" },
      name: { type: "string" },
      stage: { type: "string" },
      team: { type: "string" },
      tool: { type: "string", multiple: true },
    },
  });
  const stage = values.stage === undefined ? undefined : oneOf(values.stage, STAGES, "--stage");
  const team = values.team === undefined ? undefined : oneOf<Team>(values.team, ["solo", "team"], "--team");
  const tools = values.tool?.map((tool) => oneOf<ToolId>(tool, TOOL_IDS, "--tool"));
  return {
    cwd: io.cwd,
    yes: values.yes === true,
    dryRun: values["dry-run"] === true,
    ...(values.name === undefined ? {} : { name: values.name }),
    ...(stage === undefined ? {} : { stage }),
    ...(team === undefined ? {} : { team }),
    ...(tools === undefined ? {} : { tools }),
  };
}

function init(args: string[], io: Io): Promise<number> {
  return runInit(initOptions(args, io), io.prompter, io.out);
}

function migrate(args: string[], io: Io): Promise<number> {
  return runMigrate(initOptions(args, io), io.prompter, io.out);
}

function assess(args: string[], io: Io): number {
  const { values } = parseArgs({
    args,
    strict: true,
    options: {
      target: { type: "string" },
      json: { type: "boolean" },
      "dry-run": { type: "boolean" },
    },
  });
  const target = values.target === undefined ? undefined : oneOf(values.target, STAGES, "--target");
  return runAssess(
    {
      cwd: io.cwd,
      json: values.json === true,
      dryRun: values["dry-run"] === true,
      ...(target === undefined ? {} : { target }),
    },
    io.out,
    formatReport,
  );
}

function doctor(args: string[], io: Io): number {
  const { values } = parseArgs({ args, strict: true, options: { json: { type: "boolean" } } });
  return runDoctor({ cwd: io.cwd, json: values.json === true }, io.out);
}

function check(args: string[], io: Io): number {
  const { values } = parseArgs({
    args,
    strict: true,
    options: { json: { type: "boolean" }, branch: { type: "string" } },
  });
  // On a pull request in GitHub Actions, the branch it's for (RFC 0010).
  const fromActions = process.env.GITHUB_HEAD_REF;
  const branch = values.branch ?? (fromActions === undefined || fromActions === "" ? undefined : fromActions);
  return runCheck(
    { cwd: io.cwd, json: values.json === true, branch, summary: process.env.GITHUB_STEP_SUMMARY },
    io.out,
  );
}

function checkReportCommand(args: string[], io: Io): number {
  const { values, positionals } = parseArgs({
    args,
    strict: true,
    allowPositionals: true,
    options: { skill: { type: "string" }, "work-item": { type: "string" }, json: { type: "boolean" } },
  });
  const [report] = positionals;
  if (report === undefined)
    throw new TypeError(
      "Give the report's path, such as peer-ai check-report .peer-ai/reports/project/security-review.json",
    );
  return runCheckReport(
    { cwd: io.cwd, report, skill: values.skill, workItem: values["work-item"], json: values.json === true },
    io.out,
  );
}

function checkDocumentCommand(args: string[], io: Io): number {
  const { values, positionals } = parseArgs({
    args,
    strict: true,
    allowPositionals: true,
    options: { skill: { type: "string" }, template: { type: "string" }, json: { type: "boolean" } },
  });
  const [path] = positionals;
  if (path === undefined || values.skill === undefined)
    throw new TypeError(
      "Give the document's path and its skill, such as peer-ai check-document docs/requirements.md --skill requirements-analysis",
    );
  return runCheckDocument(
    { cwd: io.cwd, path, skill: values.skill, template: values.template, json: values.json === true },
    io.out,
  );
}

function render(args: string[], io: Io): number {
  const { values } = parseArgs({
    args,
    strict: true,
    options: { check: { type: "boolean" }, skills: { type: "boolean" }, quiet: { type: "boolean" } },
  });
  return runRender(
    { cwd: io.cwd, check: values.check === true, skills: values.skills === true, quiet: values.quiet === true },
    io.out,
  );
}

function feedback(args: string[], io: Io): number {
  const { positionals } = parseArgs({ args, strict: true, allowPositionals: true, options: {} });
  const [action, draft] = positionals;
  return runFeedback({ cwd: io.cwd, action, draft }, io.out);
}

async function mcp(args: string[], io: Io): Promise<number> {
  parseArgs({ args, strict: true, options: {} });
  await serveStdio(io.cwd);
  return 0;
}

const COMMANDS: Record<CliCommandId, (args: string[], io: Io) => number | Promise<number>> = {
  init,
  migrate,
  assess,
  render,
  doctor,
  check,
  "check-report": checkReportCommand,
  "check-document": checkDocumentCommand,
  feedback,
  mcp,
};

const isCommand = (value: string): value is CliCommandId => (CLI_COMMAND_IDS as readonly string[]).includes(value);

export async function main(argv: string[], io: Io): Promise<number> {
  const [command, ...rest] = argv;
  if (command === undefined || command === "-h" || command === "--help" || command === "help") {
    io.out.log(HELP);
    return 0;
  }
  if (command === "-v" || command === "--version") {
    io.out.log(VERSION);
    return 0;
  }
  const run = isCommand(command) ? COMMANDS[command] : undefined;
  if (run === undefined) {
    io.out.error(`Unknown command "${command}". Run peer-ai --help to see the commands.`);
    return 2;
  }
  try {
    return await run(rest, io);
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.message.startsWith("--"))) {
      io.out.error(`${error.message}. Run peer-ai --help for usage.`);
      return 2;
    }
    throw error;
  }
}

// An installed peer-ai runs through a link in node_modules/.bin, so compare the file the link points to.
const invokedDirectly =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  process.exitCode = await main(process.argv.slice(2), {
    cwd: process.cwd(),
    out: {
      log: (line) => {
        console.log(line);
      },
      error: (line) => {
        console.error(line);
      },
    },
    ...(interactive ? { prompter: createTerminalPrompter() } : {}),
  });
}
