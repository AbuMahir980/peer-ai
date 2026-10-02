// peer-ai init: works out what it can from the repository, asks about the rest, and writes
// peer-ai.config.json. It never overwrites an existing config, and it never assumes a stack:
// a project with nothing to detect gets a track of kind "other" until the user decides.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { TOOL_IDS, validateConfig, type ToolId } from "peer-ai-workflow";
import { assess } from "./assess.ts";
import { CONFIG_FILE, detect, type Detected, type DetectedTrack, type TrackKind } from "./detect.ts";
import { Cancelled, type Choice, type Prompter } from "./prompter.ts";
import { adopt, choose, describeUptake, suggestionsOf, takeAll, type Uptake } from "./suggestions.ts";

export const SCHEMA_URL =
  "https://raw.githubusercontent.com/AbuMahir980/peer-ai/main/packages/workflow/schemas/config.schema.json";

export type Stage = "prototype" | "mvp" | "production";
export type Team = "solo" | "team";

export interface InitOptions {
  cwd: string;
  yes: boolean;
  dryRun: boolean;
  name?: string;
  stage?: Stage;
  team?: Team;
  tools?: ToolId[];
}

export interface Output {
  log: (line: string) => void;
  error: (line: string) => void;
}

export interface Answers {
  name: string;
  description: string;
  tracks: DetectedTrack[];
  team: Team;
  stage: Stage;
  tools: ToolId[];
}

const UNDECIDED_TRACK: DetectedTrack = { id: "app", kind: "other", stack: [] };

const KIND_CHOICES: Choice<TrackKind>[] = [
  { value: "web", label: "A web app" },
  { value: "mobile", label: "A mobile app" },
  { value: "backend", label: "A backend or API" },
  { value: "desktop", label: "A desktop app" },
  { value: "cli", label: "A command-line tool" },
  { value: "library", label: "A library or SDK" },
  { value: "other", label: "Not decided yet" },
];

const STAGE_CHOICES: Choice<Stage>[] = [
  { value: "prototype", label: "Prototype", hint: "trying an idea; only the essentials are checked" },
  { value: "mvp", label: "MVP", hint: "real users soon; critical paths are tested" },
  { value: "production", label: "Production", hint: "live; everything is checked" },
];

const TOOL_LABELS: Record<ToolId, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  copilot: "GitHub Copilot",
  "gemini-cli": "Gemini CLI",
  other: "Another tool",
};

export function describeTrack(track: DetectedTrack): string {
  const where = track.path ?? "repository root";
  const stack = track.stack.length === 0 ? "" : `: ${track.stack.join(", ")}`;
  const deploy = track.deploy === undefined ? "" : `, deploys to ${track.deploy}`;
  return `${track.id} (${track.kind}, ${where}${stack}${deploy})`;
}

function parseStack(text: string): string[] {
  return text
    .split(/[,\s]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part !== "");
}

export async function ask(detected: Detected, prompter: Prompter, title = "peer-ai init"): Promise<Answers> {
  prompter.intro(title);
  if (detected.tracks.length > 0) {
    prompter.note(detected.tracks.map(describeTrack).join("\n"), "Found in this repository");
  }

  const name = await prompter.text("What are you building? Give it a name.", {
    initial: detected.name,
    required: true,
  });
  const description = await prompter.text("Describe it in one line. Optional.", {
    initial: detected.description ?? "",
  });

  let tracks = detected.tracks;
  if (tracks.length > 0 && !(await prompter.confirm("Use the parts found above?", true))) tracks = [];
  if (tracks.length === 0) {
    const kind = await prompter.select("What kind of thing is it?", KIND_CHOICES);
    const stack = await prompter.text("Which stack? For example: typescript, react. Leave empty to decide later.", {
      placeholder: "decide later",
    });
    tracks = [{ id: "app", kind, stack: parseStack(stack) }];
  }

  const team = await prompter.select<Team>(
    "Who's working on it?",
    [
      { value: "solo", label: "Just me" },
      { value: "team", label: "A team" },
    ],
    "solo",
  );
  const stage = await prompter.select("What stage is it at?", STAGE_CHOICES, "mvp");

  let tools = detected.tools;
  if (tools.length === 0) {
    tools = await prompter.multiselect(
      "Which AI tools do you use?",
      TOOL_IDS.map((id) => ({ value: id, label: TOOL_LABELS[id] })),
    );
  }
  return { name, description, tracks, team, stage, tools };
}

export function defaults(detected: Detected, options: InitOptions): Answers {
  return {
    name: options.name ?? detected.name,
    description: detected.description ?? "",
    tracks: detected.tracks.length > 0 ? detected.tracks : [UNDECIDED_TRACK],
    team: options.team ?? "solo",
    stage: options.stage ?? "mvp",
    tools: options.tools ?? detected.tools,
  };
}

export function buildConfig(detected: Detected, answers: Answers): Record<string, unknown> {
  return {
    $schema: SCHEMA_URL,
    version: 1,
    project: {
      name: answers.name,
      ...(answers.description === "" ? {} : { description: answers.description }),
      stage: answers.stage,
      origin: detected.origin,
      team: answers.team,
    },
    ...(answers.tools.length === 0 ? {} : { tools: answers.tools }),
    tracks: answers.tracks.map((track) => ({
      id: track.id,
      kind: track.kind,
      ...(track.path === undefined ? {} : { path: track.path }),
      ...(track.stack.length === 0 ? {} : { stack: track.stack }),
      ...(track.deploy === undefined ? {} : { deploy: { target: track.deploy } }),
      status: "active",
      ...(track.kind === "other" && track.stack.length === 0
        ? { note: "Set the kind and stack once they are decided." }
        : {}),
    })),
    repo: { ...(detected.repo.host === undefined ? {} : { host: detected.repo.host }), remote: detected.repo.remote },
    ...(detected.delivery === undefined ? {} : { delivery: detected.delivery }),
    // An existing codebase adopts enforcement in stages: it reports first, and blocks once the code
    // passes. A new one enforces from the first commit (RFC 0011).
    standards: { enforcement: detected.origin === "existing" ? "report" : "enforce" },
  };
}

export async function runInit(options: InitOptions, prompter: Prompter | undefined, out: Output): Promise<number> {
  const detected = detect(options.cwd);
  if (detected.hasConfig) {
    out.error(`${CONFIG_FILE} already exists. init never overwrites it: edit it, or delete it and run init again.`);
    return 1;
  }
  if (!options.yes && prompter === undefined) {
    out.error("init asks a few questions, so it needs a terminal. To accept what it detects instead, pass --yes.");
    return 2;
  }

  const invalid = (errors: string[]): number => {
    out.error("The config init built is not valid. This is a bug in peer-ai; please report it with these details:");
    for (const error of errors) out.error(`  ${error}`);
    return 2;
  };
  let answers: Answers;
  let config: Record<string, unknown>;
  let uptake: Uptake;
  try {
    answers = options.yes || prompter === undefined ? defaults(detected, options) : await ask(detected, prompter);
    const built = validateConfig(buildConfig(detected, answers));
    if (!built.ok) return invalid(built.errors);
    // The profiles and traits that fit the code found, taken up unless the person says no (RFC 0011).
    const suggestions = suggestionsOf(assess(options.cwd, built.value, answers.stage));
    uptake = options.yes || prompter === undefined ? takeAll(suggestions) : await choose(suggestions, prompter);
    config = adopt(buildConfig(detected, answers), uptake);
  } catch (error) {
    if (error instanceof Cancelled) {
      out.error("Cancelled. Nothing was written.");
      return 1;
    }
    throw error;
  }
  const result = validateConfig(config);
  if (!result.ok) return invalid(result.errors);

  const json = `${JSON.stringify(config, null, 2)}\n`;
  if (options.dryRun) {
    out.log(json.trimEnd());
    return 0;
  }
  writeFileSync(join(options.cwd, CONFIG_FILE), json, { flag: "wx" });
  const summary = `Wrote ${CONFIG_FILE}: ${String(answers.tracks.length)} ${answers.tracks.length === 1 ? "part" : "parts"}, ${answers.stage} stage.`;
  for (const line of describeUptake(uptake)) out.log(line);
  if (prompter !== undefined && !options.yes) prompter.outro(summary);
  else out.log(summary);
  out.log("Edit it any time. Your editor checks it against the schema as you type.");
  out.log("Next: peer-ai assess to map the project, then peer-ai render to set up your AI tools.");
  return 0;
}
