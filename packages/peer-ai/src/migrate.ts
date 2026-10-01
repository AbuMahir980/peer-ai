// peer-ai migrate: moves a project from its copy of v0 onto the package, as one change a person
// reviews (RFC 0008). It converts what it can read with certainty: the driver's Project settings,
// phase-config.json, the project's standards documents and the state file. Whatever needs judgement
// it copies word for word into docs/peer-ai-migration.md, with a work item that points there, so
// nothing is dropped silently. It deletes only what git can bring back, it never writes outside the
// project, and it never commits: it won't start on uncommitted changes, so the migration is one
// change of its own.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, sep } from "node:path";
import { validateConfig, type ActivityId, type WorkItem } from "peer-ai-workflow";
import { LEGACY_MARKERS, loadConfig, runAssess } from "./assess.ts";
import { CONFIG_FILE, detect, type Detected, type DetectedTrack } from "./detect.ts";
import { ask, buildConfig, defaults, type Answers, type InitOptions, type Output } from "./init.ts";
import { Cancelled, type Prompter } from "./prompter.ts";
import { runRender } from "./render.ts";
import {
  PHASE_ACTIVITY,
  V0_FINGERPRINTS,
  V0_FOLDER,
  V0_PHASES,
  V0_STATE,
  convertPhaseConfig,
  convertSettings,
  readCopy,
  readPhaseConfig,
  readState,
  splitInstructions,
  withoutBom,
  type Converted,
  type Copy,
  type Fingerprints,
  type PhaseSettings,
  type Settings,
  type V0Position,
} from "./v0.ts";
import { branchFor, createWorkItem, currentBranch, nextId, saveWorkItem } from "./work.ts";

export const NOTES_FILE = "docs/peer-ai-migration.md";
export const MIGRATION_ITEM = "migrate-v0";

/** Where v0's setup pasted its instructions. */
const INSTRUCTION_FILES = ["CLAUDE.md", "AGENTS.md", "GEMINI.md", ".github/copilot-instructions.md"];
/** The Cursor rules v0's setup wrote, one per rules file. */
const CURSOR_RULES = ["shared", "workflow-driver", "frontend", "backend", "docs-pdf-export", "dev-workflow"].map(
  (name) => `.cursor/rules/${name}.mdc`,
);
/** Files that may still name v0's folders, which migrate leaves for a person. */
const MENTIONS = [
  ".gitignore",
  ".gitattributes",
  ".prettierignore",
  ".eslintignore",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
];
/** Everything migrate, assess and render write or delete. None may lead outside the project. */
const TOUCHED = [
  CONFIG_FILE,
  ".peer-ai",
  "docs",
  NOTES_FILE,
  V0_FOLDER,
  V0_STATE,
  "package.json",
  ...INSTRUCTION_FILES,
  ".gitignore",
  ".gitattributes",
  ".mcp.json",
  ".claude",
  ".cursor",
  ".vscode",
  ".gemini",
  ".github",
  ".agents",
];
const FRONTEND_KINDS = ["web", "mobile", "desktop"];

export interface MigrateOptions extends InitOptions {
  now?: Date;
  /** The v0 fingerprints to compare against. Tests pass their own. */
  fingerprints?: Fingerprints;
}

/** What git knows about the project, read once before anything changes. */
export interface RepoState {
  /** The copy's files git tracks, which it can bring back after they're deleted. */
  tracked: string[];
  /** The copy's files git ignores, which migrate leaves where they are. */
  ignored: string[];
  /** The commit before the migration, so the notes can point at the files as they were. */
  base?: string;
}

interface Decision {
  title: string;
  body: string[];
}

interface PlannedItem {
  id?: string;
  title: string;
  stage: "prepare" | "build" | "verify";
  track?: string;
  position?: { activity: ActivityId; step: number };
  next: string;
}

export interface Plan {
  config: Record<string, unknown>;
  copy: Copy;
  converted: Converted[];
  /** Files rewritten: instructions without v0's text, package.json without v0's scripts. */
  edits: { path: string; text: string }[];
  /** Files deleted outside the copy, each quoted in the notes or rebuilt from git. */
  removals: string[];
  /** The copy's tracked files, deleted one by one; its ignored files stay. */
  copyFiles: string[];
  decisions: Decision[];
  /** Whole files kept in the notes as v0 had them, for reference. */
  kept: { path: string; text: string; info: string }[];
  items: PlannedItem[];
  base?: string;
}

const readRaw = (root: string, path: string): string | undefined => {
  const full = join(root, path);
  return existsSync(full) && lstatSync(full).isFile() ? readFileSync(full, "utf8") : undefined;
};
const read = (root: string, path: string): string | undefined => {
  const text = readRaw(root, path);
  return text === undefined ? undefined : withoutBom(text).replaceAll("\r\n", "\n");
};

/** A fenced block that holds any text, with a fence longer than any inside it. */
export function fenced(text: string, info = ""): string[] {
  const longest = Math.max(2, ...[...text.matchAll(/`{3,}/g)].map((match) => match[0].length));
  const fence = "`".repeat(longest + 1);
  return [`${fence}${info}`, ...text.split("\n"), fence];
}

/** Inline code that holds any text, even text with backticks of its own. */
export function code(text: string): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = "`".repeat(longest + 1);
  return longest === 0 ? `${fence}${text}${fence}` : `${fence} ${text} ${fence}`;
}

/** The tracks on one side of the system: frontend is anything with a user interface. */
const onSide = (tracks: DetectedTrack[], side: "frontend" | "backend") =>
  tracks.filter((track) => (side === "frontend" ? FRONTEND_KINDS.includes(track.kind) : track.kind === "backend"));

function sideOf(phaseFile: string | undefined): "frontend" | "backend" | undefined {
  if (phaseFile === undefined) return undefined;
  return /(^|\/)frontend\//.test(phaseFile) ? "frontend" : /(^|\/)backend\//.test(phaseFile) ? "backend" : undefined;
}

/** A work item id for a v0 ticket: PROJ-14 stays, #12 becomes PREFIX-12 or ITEM-12. */
export function ticketId(ticket: string, prefix: string | undefined): string | undefined {
  const number = /^#?(\d+)$/.exec(ticket)?.[1];
  if (number !== undefined) return `${prefix ?? "ITEM"}-${number}`;
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ticket) ? ticket : undefined;
}

function stageFor(phase: string | undefined): PlannedItem["stage"] {
  const index = V0_PHASES.indexOf((phase ?? "") as (typeof V0_PHASES)[number]);
  const build = V0_PHASES.indexOf("build");
  return index === -1 || index < build ? "prepare" : index === build ? "build" : "verify";
}

function standardsDocuments(root: string, tracks: DetectedTrack[]) {
  const documents: { path: string; role: "standard" | "addendum" | "checklist"; scope?: string[] }[] = [];
  const skipped: string[] = [];
  for (const dir of ["docs/standards", "standards"]) {
    if (!existsSync(join(root, dir))) continue;
    for (const name of readdirSync(join(root, dir)).sort()) {
      if (!name.endsWith(".md") || name.toLowerCase() === "readme.md") continue;
      const path = `${dir}/${name}`;
      const lower = name.toLowerCase();
      const role = lower.includes("addendum") ? "addendum" : lower.includes("checklist") ? "checklist" : "standard";
      const side = lower.includes("frontend") ? "frontend" : lower.includes("backend") ? "backend" : undefined;
      if (side === undefined) {
        documents.push({ path, role });
        continue;
      }
      const scope = onSide(tracks, side).map((track) => track.id);
      if (scope.length === 0) skipped.push(`${code(path)}: for the ${side}, and there is no ${side} part yet.`);
      else documents.push({ path, role, scope });
    }
  }
  return { documents, skipped };
}

/** One step of a script that only runs a file inside the copy, such as `node peer-ai/check-upstream.mjs`. */
const V0_STEP = new RegExp(
  `^\\s*(node|pwsh|powershell(\\.exe)?|bash|sh)(\\s+-\\S+)*\\s+(\\.\\/)?${V0_FOLDER}\\/\\S+(\\s+\\S+)*\\s*$`,
);

export interface Scripts {
  text: string;
  removed: { name: string; command: string }[];
}

/**
 * package.json without the scripts that only run v0's files. A script that does anything else as
 * well stays as it is, and is listed for a person.
 */
export function packageScripts(text: string): { edit?: Scripts; mentions: { name: string; command: string }[] } {
  let pkg: { scripts?: Record<string, unknown> };
  try {
    pkg = JSON.parse(text) as { scripts?: Record<string, unknown> };
  } catch {
    return { mentions: [] };
  }
  const removed: { name: string; command: string }[] = [];
  const mentions: { name: string; command: string }[] = [];
  for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
    if (typeof command !== "string" || !command.includes(`${V0_FOLDER}/`)) continue;
    const steps = command.split(/&&|\|\||;/);
    if (steps.every((step) => V0_STEP.test(step))) removed.push({ name, command });
    else mentions.push({ name, command });
  }
  if (removed.length === 0) return { mentions };
  pkg.scripts = Object.fromEntries(
    Object.entries(pkg.scripts ?? {}).filter(([name]) => !removed.some((script) => script.name === name)),
  );
  const indent = /\n([ \t]+)"/.exec(text)?.[1] ?? "  ";
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const json = JSON.stringify(pkg, null, indent).replaceAll("\n", newline);
  return { edit: { text: `${json}${text.endsWith("\n") ? newline : ""}`, removed }, mentions };
}

/** How to see a file of the copy as it was, before the migration deleted it. */
const asItWas = (base: string | undefined, path: string) =>
  base === undefined ? `git log -p -- ${path}` : `git show ${base}:${path}`;

/** Works out everything migrate will do, without changing anything. */
export function planMigration(
  root: string,
  detected: Detected,
  answers: Answers,
  fingerprints: Fingerprints,
  repo: RepoState,
): Plan {
  const copy = readCopy(root, fingerprints);
  const converted: Converted[] = [];
  const edits: Plan["edits"] = [];
  const removals: string[] = [];
  const decisions: Decision[] = [];
  const kept: Plan["kept"] = [];
  const exists = (path: string) => existsSync(join(root, path));

  // The project's instructions: v0's text moves into the notes, the project's own stays.
  let settings: Settings = new Map();
  for (const path of INSTRUCTION_FILES) {
    const text = readRaw(root, path);
    if (text === undefined) continue;
    const split = splitInstructions(text);
    if (split.settings.size > 0 && settings.size === 0) settings = split.settings;
    if (split.moved.length === 0) continue;
    if (split.kept === "") removals.push(path);
    else edits.push({ path, text: split.kept });
    decisions.push({
      title: `v0's text moved out of ${path}`,
      body: [
        `These sections came from v0 and were taken out of ${code(path)}${split.kept === "" ? ", which held nothing else, so it was deleted" : ""}. Put back anything this project still needs, in its own words; Peer AI's own instructions are in the marked block \`render\` writes.`,
        ...split.moved.flatMap((section) => ["", `**${section.heading}**`, "", ...fenced(section.text, "md")]),
      ],
    });
  }
  const rules = CURSOR_RULES.filter(exists);
  if (rules.length > 0) {
    for (const path of rules) {
      const split = splitInstructions(read(root, path) ?? "");
      if (split.settings.size > 0 && settings.size === 0) settings = split.settings;
    }
    removals.push(...rules);
    decisions.push({
      title: "v0's Cursor rules",
      body: [
        "These Cursor rules came from v0 and were deleted. Peer AI writes its own rule, `.cursor/rules/peer-ai.mdc`. Keep anything this project added to them in a rule of its own.",
        ...rules.flatMap((path) => ["", `**${path}**`, "", ...fenced(read(root, path) ?? "", "md")]),
      ],
    });
  }

  // The Project settings table.
  const fromSettings = convertSettings(settings, exists);
  // The remote comes from git itself, which knows better than a table filled in once.
  converted.push(...fromSettings.converted.filter((entry) => entry.to !== "repo.remote"));

  // phase-config.json, kept whole for reference as well.
  let phases: PhaseSettings | undefined;
  const phaseConfig = read(root, `${V0_FOLDER}/phase-config.json`);
  if (phaseConfig !== undefined) {
    kept.push({ path: `${V0_FOLDER}/phase-config.json`, text: phaseConfig, info: "json" });
    const entries = readPhaseConfig(phaseConfig);
    if (entries.ok) {
      phases = convertPhaseConfig(entries.value, (file) => read(root, `${V0_FOLDER}/${file}`));
      converted.push(...phases.converted);
    } else {
      decisions.push({
        title: "phase-config.json couldn't be read",
        body: [entries.error, "", "It is kept whole at the end of this file."],
      });
    }
  }
  if (phases !== undefined && phases.conflicts.length > 0) {
    decisions.push({
      title: "phase-config.json blocks the project has changed since",
      body: [
        "Each block below was stamped into its phase file once, and the file no longer starts the block the same way: the project changed it later. Neither version was converted. Decide which still holds, and put it in `peer-ai.config.json` or the project's own standards.",
        ...phases.conflicts.flatMap((conflict) => [
          "",
          `**${conflict.file}**. What the phase file said: \`${asItWas(repo.base, `${V0_FOLDER}/${conflict.file}`)}\`.`,
          "",
          ...fenced(conflict.block.join("\n"), "md"),
        ]),
      ],
    });
  }

  // Dormant parts: only when the line says which side, and never every part the project has.
  const dormantTracks = new Set<string>();
  const unplacedDormant: string[] = [];
  const ownTracks = answers.tracks;
  for (const { side, line, file } of phases?.dormant ?? []) {
    const tracks = side === undefined ? [] : onSide(ownTracks, side);
    const wouldLeave = ownTracks.filter((track) => !dormantTracks.has(track.id) && !tracks.includes(track));
    if (tracks.length === 0 || wouldLeave.length === 0) {
      unplacedDormant.push(`${file}: ${line}`);
      continue;
    }
    for (const track of tracks) {
      if (dormantTracks.has(track.id)) continue;
      dormantTracks.add(track.id);
      converted.push({ from: file, to: `tracks.${track.id}.status`, value: "dormant" });
    }
  }

  const unplaced = [
    ...new Set([
      ...fromSettings.unplaced.map(({ name, value }) => `${name}: ${value}`),
      ...(phases?.unplaced ?? []).map(({ file, text }) => `${file}: ${text}`),
      ...unplacedDormant.map(
        (line) =>
          `Says a part is dormant, which migrate didn't apply, since it couldn't tell which part or it was the only one left: ${line}`,
      ),
    ]),
  ];
  if (unplaced.length > 0) {
    decisions.push({
      title: "Settings migrate couldn't place",
      body: [
        "Each is quoted as v0 had it. Put it in `peer-ai.config.json`, the project's standards, or its own instructions, or drop it.",
        "",
        ...unplaced.map((line) => `- ${line}`),
      ],
    });
  }

  // The project's own standards.
  const standards = standardsDocuments(root, answers.tracks);
  for (const document of standards.documents) {
    converted.push({
      from: document.path,
      to: "standards.documents",
      value: `${document.role}${document.scope === undefined ? "" : ` for ${document.scope.join(", ")}`}`,
    });
  }
  if (standards.documents.length + standards.skipped.length > 0) {
    decisions.push({
      title: "The project's standards documents",
      body: [
        "These became `standards.documents`, which `standards_for_file` serves before editing a file. Check each one's role and the parts it covers.",
        "",
        ...standards.documents.map(
          (document) =>
            `- ${code(document.path)}: ${document.role}${document.scope === undefined ? ", for the whole project" : `, for ${document.scope.join(", ")}`}`,
        ),
        ...(standards.skipped.length === 0
          ? []
          : ["", "Left out, for now:", "", ...standards.skipped.map((line) => `- ${line}`)]),
      ],
    });
  }

  // The state file, kept whole for reference as well.
  const items: PlannedItem[] = [];
  const stateText = read(root, V0_STATE);
  if (stateText !== undefined) {
    removals.push(V0_STATE);
    kept.push({ path: V0_STATE, text: stateText, info: "json" });
    const state = readState(stateText);
    if (!state.ok) {
      decisions.push({
        title: `${V0_STATE} couldn't be read`,
        body: [state.error, "", "It is kept whole at the end of this file."],
      });
    } else {
      const prefix = fromSettings.config.tracker?.ticketPrefix;
      const notes: string[] = [];
      const positions: { name?: string; position: V0Position; track?: string }[] = [{ position: state.value.position }];
      for (const [name, position] of Object.entries(state.value.tracks)) {
        const side = name === "frontend" || name === "backend" ? name : undefined;
        const track = side === undefined ? undefined : onSide(answers.tracks, side)[0]?.id;
        positions.push({ name, position, ...(track === undefined ? {} : { track }) });
      }
      const idFor = (ticket: string): { id?: string } => {
        const id = ticketId(ticket, prefix);
        return id === undefined ? {} : { id };
      };
      const tickets = new Map<string, PlannedItem>();
      for (const { name, position, track } of positions) {
        const phase = position.phase;
        const where =
          phase === undefined
            ? ""
            : `${code(phase)}${position.step === undefined ? "" : `, step ${String(position.step)}`}`;
        if (phase !== undefined && !(V0_PHASES as readonly string[]).includes(phase)) {
          notes.push(`The phase ${code(phase)} isn't one v0 has, so it was dropped.`);
        }
        const ticket = position.ticket;
        if (ticket === undefined) {
          if (name !== undefined && (where !== "" || position.notes !== undefined)) {
            notes.push(
              `The ${name} part had no ticket in progress${where === "" ? "" : `; it was at ${where}`}${position.notes === undefined ? "." : `: ${position.notes}`}`,
            );
          }
          continue;
        }
        const activity = phase === undefined ? undefined : PHASE_ACTIVITY[phase];
        const side = sideOf(position.phaseFile);
        const itemTrack = track ?? (side === undefined ? undefined : onSide(answers.tracks, side)[0]?.id);
        tickets.set(ticket, {
          ...idFor(ticket),
          title:
            ticket === state.value.position.ticket && state.value.ticketTitle !== undefined
              ? state.value.ticketTitle
              : `${ticket} from v0`,
          stage: stageFor(phase),
          ...(itemTrack === undefined ? {} : { track: itemTrack }),
          ...(activity === undefined || position.step === undefined || position.step < 1
            ? {}
            : { position: { activity, step: position.step } }),
          next: `Carried over from v0${where === "" ? "" : `, at ${phase ?? ""}`}. Check where the work stands before going on.`.slice(
            0,
            200,
          ),
        });
        if (position.notes !== undefined && name !== undefined)
          notes.push(`The ${name} part's notes: ${position.notes}`);
      }
      for (const ticket of state.value.inProgress) {
        if (tickets.has(ticket)) continue;
        tickets.set(ticket, {
          ...idFor(ticket),
          title: `${ticket} from v0`,
          stage: "prepare",
          next: "Carried over from v0, where it was in progress. Check where the work stands before going on.",
        });
      }
      items.push(...tickets.values());
      const body = [
        ...(items.length === 0
          ? ["Nothing was in progress, so no work items were carried over."]
          : [
              `Work in progress became work items: ${items.map((item) => code(item.id ?? item.title)).join(", ")}. v0's last verify isn't carried over: run it again with \`run_verify\`.`,
            ]),
        ...(state.value.remaining.length === 0
          ? []
          : [
              "",
              `Still to do in the tracker, which keeps them; start a work item when work on one starts: ${state.value.remaining.join(", ")}.`,
            ]),
        ...notes.flatMap((note) => ["", note]),
        ...(
          [
            ["Cycle", state.value.cycle],
            ["Milestone branch", state.value.milestoneBranch],
            ["Notes", state.value.notes],
            [
              "Reviews still waiting",
              state.value.pendingAgents.length === 0 ? undefined : state.value.pendingAgents.join(", "),
            ],
          ] as const
        ).flatMap(([name, value]) => (value === undefined ? [] : ["", `${name}, as v0 had it:`, "", `> ${value}`])),
        "",
        "The whole state file is kept at the end of this file.",
      ];
      decisions.push({ title: "Work carried over from v0's state", body });
    }
  }

  // The copy: only the files git tracks are deleted, so git can bring each one back.
  const tracked = new Set(repo.tracked);
  const own = copy.files.filter((file) => file.kind === "own" && tracked.has(`${V0_FOLDER}/${file.path}`));
  if (own.length > 0) {
    decisions.push({
      title: `Files the project changed in ${V0_FOLDER}/ (${String(own.length)})`,
      body: [
        `These are v0 files the project edited, or files it added. They were deleted with the folder, and git keeps them: ${repo.base === undefined ? `\`git log -p -- ${V0_FOLDER}/<file>\` shows each one's history` : `\`git show ${repo.base}:${V0_FOLDER}/<file>\` shows each one as it was, and \`git log -p -- ${V0_FOLDER}/<file>\` what the project changed`}. Move anything still needed into the project's own standards, its instructions, or \`peer-ai.config.json\`.`,
        "",
        ...own.map((file) => `- ${code(`${V0_FOLDER}/${file.path}`)}`),
      ],
    });
  }

  // package.json scripts that only run something inside the copy.
  const leftAlone: string[] = [];
  const packageText = readRaw(root, "package.json");
  if (packageText !== undefined) {
    const scripts = packageScripts(packageText);
    if (scripts.edit !== undefined) {
      edits.push({ path: "package.json", text: scripts.edit.text });
      for (const { name } of scripts.edit.removed)
        converted.push({ from: `package.json script ${name}`, to: "removed", value: name });
      decisions.push({
        title: "package.json scripts that only ran v0's files",
        body: [
          "These scripts did nothing but run a file inside the copy, which is gone, so they were removed:",
          "",
          ...scripts.edit.removed.map(({ name, command }) => `- ${code(name)}: ${code(command)}`),
        ],
      });
    }
    for (const { name, command } of scripts.mentions) {
      leftAlone.push(`The package.json script ${code(name)} still names v0's folder: ${code(command)}`);
    }
  }

  // What migrate leaves alone, for a person to look at.
  if (repo.ignored.length > 0) {
    leftAlone.push(
      `Git ignores these files in ${code(`${V0_FOLDER}/`)}, so they were left where they are: deleting them couldn't be undone. Keep what you need, then delete them: ${repo.ignored.map(code).join(", ")}`,
    );
  }
  if (exists("CONTEXT.md")) {
    leftAlone.push(
      "`CONTEXT.md` stays, as the project's own document. v0 told the AI to read it at the start of every session, and 1.0 doesn't: to keep that, say so in the project's own instructions.",
    );
  }
  if (exists("docs/peer-ai-feedback.md")) {
    leftAlone.push(
      "`docs/peer-ai-feedback.md` is v0's local feedback log. Send each item that still applies with `draft_feedback` and `npx peer-ai feedback send`, then delete it.",
    );
  }
  if (exists(".github/workflows/ai-review.yml")) {
    leftAlone.push(
      "`.github/workflows/ai-review.yml` came from v0's PR automation. Keep it, or let Peer AI's reviews replace it.",
    );
  }
  for (const path of INSTRUCTION_FILES) {
    const text = edits.find((edit) => edit.path === path)?.text ?? read(root, path);
    if (text === undefined || removals.includes(path)) continue;
    text.split(/\r?\n/).forEach((line, index) => {
      if (line.includes(`${V0_FOLDER}/`)) {
        leftAlone.push(`${code(`${path}:${String(index + 1)}`)} still mentions v0's folder: ${code(line.trim())}`);
      }
    });
  }
  for (const path of MENTIONS) {
    const text = read(root, path);
    if (text === undefined) continue;
    text.split("\n").forEach((line, index) => {
      if (new RegExp(`(^|[^\\w-])(${V0_FOLDER}/?|docs-pdf/?)([^\\w-]|$)`).test(line)) {
        leftAlone.push(`${code(`${path}:${String(index + 1)}`)} names v0's folders: ${code(line.trim())}`);
      }
    });
  }
  if (exists("docs") && readdirSync(join(root, "docs")).some((name) => /^\d{2}-.+\.md$/.test(name))) {
    leftAlone.push(
      "v0's numbered documents in `docs/` stay where they are. `peer-ai assess` maps them like any others.",
    );
  }
  if (leftAlone.length > 0) {
    decisions.push({ title: "Left as they were", body: leftAlone.map((line) => `- ${line}`) });
  }

  // The config: init's, plus everything converted.
  const config = buildConfig(detected, answers);
  const tracks = (config.tracks as Record<string, unknown>[]).map((track) =>
    dormantTracks.has(String(track.id)) ? { ...track, status: "dormant" } : track,
  );
  const repoConfig = {
    ...(config.repo as Record<string, unknown>),
    ...(fromSettings.config.repo?.branchNaming === undefined
      ? {}
      : { branchNaming: fromSettings.config.repo.branchNaming }),
    ...(fromSettings.config.repo?.mergePolicy === undefined
      ? {}
      : { mergePolicy: fromSettings.config.repo.mergePolicy }),
  };
  const merged: Record<string, unknown> = {
    ...config,
    tracks,
    repo: repoConfig,
    ...(fromSettings.config.design === undefined ? {} : { design: fromSettings.config.design }),
    ...(fromSettings.config.tracker === undefined ? {} : { tracker: fromSettings.config.tracker }),
    ...(fromSettings.config.commands === undefined ? {} : { commands: fromSettings.config.commands }),
    ...(standards.documents.length === 0 ? {} : { standards: { documents: standards.documents, onExisting: "map" } }),
    ...(phases?.models === undefined ? {} : { models: phases.models }),
    ...(phases === undefined || Object.keys(phases.capabilities).length === 0
      ? {}
      : { capabilities: phases.capabilities }),
    ...(phases === undefined || Object.keys(phases.activities).length === 0 ? {} : { activities: phases.activities }),
  };
  return {
    config: merged,
    copy,
    converted,
    edits,
    removals,
    copyFiles: repo.tracked,
    decisions,
    kept,
    items,
    ...(repo.base === undefined ? {} : { base: repo.base }),
  };
}

/** docs/peer-ai-migration.md: what migrate did, and every decision it left. */
export function notesDocument(plan: Plan, today: string): string {
  const version = plan.copy.version;
  const lines = [
    "# Moving to Peer AI 1.0",
    "",
    `\`peer-ai migrate\` moved this project from its copy of v0 on ${today}. This file lists what it did, and the decisions it left for a person. The work item \`${MIGRATION_ITEM}\` points here: go through it with your AI tool, one decision at a time. When each one is made, delete this file.`,
  ];
  if (version !== undefined) {
    lines.push(
      "",
      `The copy came from v0 of ${version.date} (${version.commit})${plan.copy.pin === undefined ? "" : ", as its `.upstream` pin said"}.`,
    );
  }
  if (plan.base !== undefined) {
    lines.push(
      "",
      `Before the migration, the project was at commit \`${plan.base}\`. \`git show ${plan.base}:<path>\` shows any file as it was then.`,
    );
  }
  lines.push("", "## Converted", "");
  if (plan.converted.length === 0) lines.push("Nothing: the copy held no settings migrate could read.");
  for (const entry of plan.converted) {
    lines.push(
      entry.to === "removed" ? `- ${entry.from}: removed` : `- ${entry.from} → \`${entry.to}\`: ${code(entry.value)}`,
    );
  }
  lines.push("", "## Deleted", "");
  if (plan.copyFiles.length > 0) {
    lines.push(`- ${code(`${V0_FOLDER}/`)}: the ${String(plan.copyFiles.length)} files git tracks in it`);
  }
  lines.push(...plan.removals.map((path) => `- ${code(path)}`));
  lines.push("", "## Decisions");
  plan.decisions.forEach((decision, index) => {
    lines.push("", `### ${String(index + 1)}. ${decision.title}`, "", ...decision.body);
  });
  if (plan.decisions.length === 0) lines.push("", "None. Delete this file once you've read it.");
  if (plan.kept.length > 0) {
    lines.push("", "## As v0 had them", "");
    lines.push("These files are kept here whole, for reference.");
    for (const file of plan.kept) lines.push("", `**${file.path}**`, "", ...fenced(file.text.trimEnd(), file.info));
  }
  return `${lines.join("\n")}\n`;
}

function git(root: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return undefined;
  }
}

const list = (output: string | undefined) => (output ?? "").split("\0").filter((path) => path !== "");

/** Every change git sees, untracked files included, whatever the repository's own settings say. */
function gitChanges(root: string): string[] | undefined {
  return git(root, ["status", "--porcelain", "--untracked-files=all", "--ignore-submodules=none"])
    ?.split("\n")
    .filter((line) => line.trim() !== "");
}

/** A path that leads outside the project, through a symbolic link on the way or at the end. */
export function escapes(root: string, path: string): boolean {
  const base = realpathSync(root);
  let current = join(root, path);
  for (;;) {
    let present = true;
    try {
      lstatSync(current);
    } catch {
      present = false;
    }
    if (present) {
      try {
        const real = realpathSync(current);
        return real !== base && !real.startsWith(`${base}${sep}`);
      } catch {
        return true;
      }
    }
    const parent = dirname(current);
    if (parent === current) return true;
    current = parent;
  }
}

/** Deletes the copy's tracked files, then any folder they leave empty. Ignored files stay. */
function deleteCopy(root: string, files: string[]): void {
  const folders = new Set<string>();
  for (const file of files) {
    rmSync(join(root, file), { force: true });
    for (let dir = dirname(file); dir !== "." && dir !== ""; dir = dirname(dir)) folders.add(dir);
  }
  for (const dir of [...folders].sort((a, b) => b.length - a.length)) {
    const full = join(root, dir);
    if (existsSync(full) && readdirSync(full).length === 0) rmdirSync(full);
  }
}

const quiet: Output = { log: () => undefined, error: () => undefined };

/**
 * Exit code 0 when migrated, or with --dry-run; 1 when it refuses, or when the migration was applied
 * but a step after it didn't finish; 2 on a usage error.
 */
export async function runMigrate(
  options: MigrateOptions,
  prompter: Prompter | undefined,
  out: Output,
): Promise<number> {
  const root = options.cwd;
  if (existsSync(join(root, CONFIG_FILE))) {
    out.error(
      `${CONFIG_FILE} already exists, so this project is on 1.0 already, or partly migrated. migrate changes nothing.`,
    );
    return 1;
  }
  if (!LEGACY_MARKERS.some((marker) => existsSync(join(root, marker))) && !existsSync(join(root, V0_STATE))) {
    out.error(
      `There's no copy of v0 here: no ${V0_FOLDER}/ folder from v0, and no ${V0_STATE}. To start with Peer AI, run peer-ai init.`,
    );
    return 1;
  }
  const changes = gitChanges(root);
  const top = git(root, ["rev-parse", "--show-toplevel"])?.trim();
  if (changes === undefined || top === undefined) {
    out.error("migrate needs the project in git, so the change it makes can be reviewed and undone.");
    return 1;
  }
  if (realpathSync(top) !== realpathSync(root)) {
    out.error(`Run migrate from the repository's top folder, ${top}, where v0's copy sits.`);
    return 1;
  }
  if (existsSync(join(root, V0_FOLDER, ".git"))) {
    out.error(
      `${V0_FOLDER}/ is a git repository of its own, so this project's history doesn't hold its files, and deleting it couldn't be undone. Copy out anything the project needs, delete ${V0_FOLDER}/.git and commit the folder, then run migrate again.`,
    );
    return 1;
  }
  const outside = TOUCHED.filter((path) => escapes(root, path));
  if (outside.length > 0) {
    out.error(
      `These lead outside the project through a symbolic link, so migrate would change files it can't undo: ${outside.join(", ")}. Replace each link with the file itself, then run migrate again.`,
    );
    return 1;
  }
  if (changes.length > 0 && !options.dryRun) {
    out.error("There are uncommitted changes. Commit or stash them first, so the migration is a change of its own:");
    for (const line of changes.slice(0, 10)) out.error(`  ${line}`);
    if (changes.length > 10) out.error(`  and ${String(changes.length - 10)} more`);
    return 1;
  }
  if (!options.yes && !options.dryRun && prompter === undefined) {
    out.error("migrate asks init's questions, so it needs a terminal. To accept what it finds instead, pass --yes.");
    return 2;
  }

  const detected = detect(root);
  let answers: Answers;
  try {
    answers =
      options.yes || options.dryRun || prompter === undefined
        ? defaults(detected, options)
        : await ask(detected, prompter, "peer-ai migrate");
  } catch (error) {
    if (error instanceof Cancelled) {
      out.error("Cancelled. Nothing was changed.");
      return 1;
    }
    throw error;
  }

  const base = git(root, ["rev-parse", "--short", "HEAD"])?.trim();
  const repo: RepoState = {
    tracked: list(git(root, ["ls-files", "-z", "--", V0_FOLDER])),
    ignored: list(git(root, ["ls-files", "-z", "--others", "--ignored", "--exclude-standard", "--", V0_FOLDER])),
    ...(base === undefined || base === "" ? {} : { base }),
  };
  const plan = planMigration(root, detected, answers, options.fingerprints ?? V0_FINGERPRINTS, repo);
  const valid = validateConfig(plan.config);
  if (!valid.ok) {
    out.error("The config migrate built is not valid. This is a bug in peer-ai; please report it with these details:");
    for (const error of valid.errors) out.error(`  ${error}`);
    return 2;
  }

  if (options.dryRun) {
    const say = (...lines: string[]) => {
      for (const line of lines) out.log(line);
    };
    say("Peer AI migrate (dry run): nothing is changed.");
    if (plan.copy.version !== undefined)
      say(`The copy came from v0 of ${plan.copy.version.date} (${plan.copy.version.commit}).`);
    say("", `Would write ${CONFIG_FILE}:`, ...JSON.stringify(plan.config, null, 2).split("\n"));
    say(
      "",
      "Would convert:",
      ...(plan.converted.length === 0
        ? ["  nothing"]
        : plan.converted.map((entry) => `  ${entry.from} → ${entry.to}: ${entry.value}`)),
    );
    if (plan.edits.length > 0) say("", "Would rewrite:", ...plan.edits.map((edit) => `  ${edit.path}`));
    say(
      "",
      "Would delete:",
      ...(plan.copyFiles.length === 0 ? [] : [`  ${V0_FOLDER}/ (${String(plan.copyFiles.length)} files)`]),
      ...plan.removals.map((path) => `  ${path}`),
    );
    say(
      "",
      "Would create work items:",
      ...[...plan.items.map((item) => item.id ?? item.title), MIGRATION_ITEM].map((id) => `  ${id}`),
    );
    say(
      "",
      `Would leave ${String(plan.decisions.length)} decisions in ${NOTES_FILE}:`,
      ...plan.decisions.map((decision, index) => `  ${String(index + 1)}. ${decision.title}`),
    );
    if (changes.length > 0) say("", "There are uncommitted changes: commit or stash them before migrating.");
    return 0;
  }

  const now = options.now ?? new Date();
  writeFileSync(join(root, CONFIG_FILE), `${JSON.stringify(plan.config, null, 2)}\n`, { flag: "wx" });
  for (const edit of plan.edits) writeFileSync(join(root, edit.path), edit.text);
  for (const path of plan.removals) rmSync(join(root, path), { force: true });
  deleteCopy(root, plan.copyFiles);
  mkdirSync(dirname(join(root, NOTES_FILE)), { recursive: true });
  writeFileSync(join(root, NOTES_FILE), notesDocument(plan, now.toISOString().slice(0, 10)));

  const problems: string[] = [];
  const { config } = loadConfig(root);
  if (config === undefined) throw new Error(`${CONFIG_FILE} was written but can't be read back.`);
  const created: string[] = [];
  for (const planned of plan.items) {
    const id = planned.id ?? nextId(root, config);
    if (existsSync(join(root, ".peer-ai/work", `${id}.json`))) {
      problems.push(`The work item ${id} already exists, so "${planned.title}" wasn't carried over.`);
      continue;
    }
    const branch = branchFor(config.repo?.branchNaming, id, planned.title);
    const item = {
      version: 1,
      id,
      title: planned.title,
      kind: "feature",
      stage: planned.stage,
      ...(planned.track === undefined ? {} : { track: planned.track }),
      ...(branch === undefined ? {} : { branch }),
      ...(planned.position === undefined ? {} : { position: planned.position }),
      next: planned.next,
      updatedAt: now.toISOString(),
    } as WorkItem;
    const saved = saveWorkItem(root, config, item);
    if (saved.ok) created.push(id);
    else problems.push(`"${planned.title}" wasn't carried over: ${saved.error}`);
  }
  const branch = currentBranch(root);
  const migration = createWorkItem(
    root,
    config,
    {
      id: MIGRATION_ITEM,
      title: "Finish the move from v0",
      kind: "migration",
      next: `Go through ${NOTES_FILE} with the person, one decision at a time.`,
      acceptance: [
        ...plan.decisions.slice(0, 19).map((decision) => `Decided: ${decision.title}.`.slice(0, 300)),
        `Every decision in ${NOTES_FILE} is made, and the file is deleted.`,
      ],
      sources: [NOTES_FILE],
      ...(branch === undefined ? {} : { branch }),
    },
    now,
  );
  if (!migration.ok) problems.push(`The work item ${MIGRATION_ITEM} wasn't created: ${migration.error}`);

  if (runAssess({ cwd: root, json: false, dryRun: false, now }, quiet, () => []) !== 0) {
    problems.push("The project map wasn't written: run npx peer-ai assess.");
  }
  if (runRender({ cwd: root, check: false, quiet: true }, out) !== 0) {
    problems.push("Some AI tool files weren't set up: run npx peer-ai render to see which.");
  }

  out.log(`Peer AI migrate: ${answers.name}`);
  out.log("");
  out.log(
    `  ✓ Wrote ${CONFIG_FILE}, converting ${String(plan.converted.length)} ${plan.converted.length === 1 ? "setting" : "settings"} from v0.`,
  );
  const instructions = plan.edits.filter((edit) => edit.path !== "package.json").map((edit) => edit.path);
  if (instructions.length > 0) out.log(`  ✓ Took v0's text out of ${instructions.join(", ")}.`);
  if (plan.edits.some((edit) => edit.path === "package.json"))
    out.log("  ✓ Removed the package.json scripts that only ran v0's files.");
  const deleted = [...(plan.copyFiles.length === 0 ? [] : [`${V0_FOLDER}/`]), ...plan.removals];
  if (deleted.length > 0) out.log(`  ✓ Deleted ${deleted.join(", ")}.`);
  if (created.length > 0) out.log(`  ✓ Carried over the work in progress: ${created.join(", ")}.`);
  out.log("  ✓ Mapped the project, and set up the AI tools.");
  out.log("");
  out.log(
    plan.decisions.length === 0
      ? `Nothing needs a decision. ${NOTES_FILE} lists what changed.`
      : `${String(plan.decisions.length)} ${plan.decisions.length === 1 ? "decision is" : "decisions are"} left in ${NOTES_FILE}. The work item ${MIGRATION_ITEM} brings them up in your next session.`,
  );
  out.log(
    "Review the change, commit it on a branch, and open a pull request. To undo it instead: git stash --include-untracked",
  );
  if (problems.length > 0) {
    out.error("");
    out.error("The migration was applied, but some steps didn't finish:");
    for (const problem of problems) out.error(`  ${problem}`);
    return 1;
  }
  return 0;
}
