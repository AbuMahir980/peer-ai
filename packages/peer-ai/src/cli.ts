#!/usr/bin/env node
// The peer-ai command. Exit codes: 0 success, 1 refused, cancelled or problems found, 2 usage or
// config error.

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { TOOL_IDS, type ToolId } from "@peer-ai/workflow";
import { runAssess } from "./assess.ts";
import { runCheck } from "./check.ts";
import { runDoctor } from "./doctor.ts";
import { serveStdio } from "./mcp.ts";
import { runInit, type Output, type Stage, type Team } from "./init.ts";
import { VERSION } from "./package-info.ts";
import { createTerminalPrompter, type Prompter } from "./prompter.ts";
import { formatReport } from "./report.ts";
import { runRender } from "./render.ts";

const STAGES: readonly Stage[] = ["prototype", "mvp", "production"];

const HELP = `peer-ai: from a brief to a shipped product, with any AI tool

Usage:
  peer-ai init [options]      Set up Peer AI in this repository
  peer-ai assess [options]    Map what the project has and what its stage still needs
  peer-ai render [options]    Set up each AI tool in the config: instructions and the MCP server
  peer-ai doctor [options]    Check that Peer AI is set up correctly, and how to fix it
  peer-ai check [options]     The CI gate: fail when work claims more than its record shows
  peer-ai mcp                 Start the MCP server that AI tools connect to, over stdio

Options for init:
  -y, --yes                   Accept what init detects instead of asking
      --dry-run               Print the config instead of writing it
      --name <name>           The project's name
      --stage <stage>         prototype, mvp or production
      --team <team>           solo or team
      --tool <tool>           An AI tool you use; repeat for several
                              (${TOOL_IDS.join(", ")})

Options for assess:
      --target <stage>        Assess against a stage other than the project's own,
                              for example production before a launch
      --json                  Print the project map as JSON instead of the report
      --dry-run               Don't write .peer-ai/map.json

Options for render:
      --check                 Change nothing; fail when a file is out of date (for CI)

Options for doctor and check:
      --json                  Print the checks as JSON

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

async function init(args: string[], io: Io): Promise<number> {
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
  return runInit(
    {
      cwd: io.cwd,
      yes: values.yes === true,
      dryRun: values["dry-run"] === true,
      ...(values.name === undefined ? {} : { name: values.name }),
      ...(stage === undefined ? {} : { stage }),
      ...(team === undefined ? {} : { team }),
      ...(tools === undefined ? {} : { tools }),
    },
    io.prompter,
    io.out,
  );
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
  const { values } = parseArgs({ args, strict: true, options: { json: { type: "boolean" } } });
  return runCheck({ cwd: io.cwd, json: values.json === true }, io.out);
}

function render(args: string[], io: Io): number {
  const { values } = parseArgs({ args, strict: true, options: { check: { type: "boolean" } } });
  return runRender({ cwd: io.cwd, check: values.check === true }, io.out);
}

async function mcp(args: string[], io: Io): Promise<number> {
  parseArgs({ args, strict: true, options: {} });
  await serveStdio(io.cwd);
  return 0;
}

const COMMANDS: Record<string, (args: string[], io: Io) => number | Promise<number>> = {
  init,
  assess,
  render,
  doctor,
  check,
  mcp,
};

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
  const run = COMMANDS[command];
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

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
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
