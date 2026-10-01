// Reading a project's copy of v0, the playbook Peer AI was before 1.0 (RFC 0008). v0 was copied
// into a project's peer-ai/ folder and changed there, so no two copies are alike. These functions
// read what can be read with certainty, and return the rest for a person to decide; nothing here
// writes a file. peer-ai migrate puts the pieces together.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ActivityId, SkillId } from "peer-ai-workflow";
import { V0_FILES, V0_VERSIONS } from "./v0-fingerprints.ts";

export const V0_FOLDER = "peer-ai";
export const V0_STATE = ".peer-ai-state.json";

/** A file's fingerprint: its content hashed, with a byte-order mark and CRLF line endings removed. */
export function fingerprint(content: Buffer | string): string {
  let bytes = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bytes = bytes.subarray(3);
  const normalised = Buffer.from(bytes.toString("latin1").replaceAll("\r\n", "\n"), "latin1");
  return createHash("sha256").update(normalised).digest("hex").slice(0, 16);
}

/** Text without a byte-order mark, which PowerShell writes and JSON.parse refuses. */
export const withoutBom = (text: string): string => (text.startsWith("\uFEFF") ? text.slice(1) : text);

export interface Fingerprints {
  versions: { commit: string; date: string }[];
  /** For each path in the playbook: each fingerprint it had, with the versions that had it. */
  files: Record<string, Record<string, number[]>>;
}

export const V0_FINGERPRINTS: Fingerprints = { versions: V0_VERSIONS, files: V0_FILES };

// ---- The copy's files ----------------------------------------------------------------------------

/** Files v0 projects added to their copy, which migrate reads and then removes. */
export const UNDERSTOOD = [
  "phase-config.json",
  ".upstream",
  "apply-phase-config.ps1",
  "strip-model-switching.ps1",
  "check-upstream.mjs",
];

/** unchanged: v0's own file, as v0 had it. understood: a file migrate converts. own: the project's work. */
export type CopyFileKind = "unchanged" | "understood" | "own";

export interface CopyFile {
  /** The path inside peer-ai/, such as shared/rules/shared.md. */
  path: string;
  kind: CopyFileKind;
}

export interface Pin {
  commit: string;
  pulledOn?: string;
}

export interface Copy {
  files: CopyFile[];
  pin?: Pin;
  /** The v0 version most of the copy's files match, or the one its pin names. */
  version?: { commit: string; date: string };
}

/** Every file in a folder, and every symbolic link, which is listed but never followed. */
function walk(dir: string, prefix = ""): { path: string; link: boolean }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isSymbolicLink()) return [{ path, link: true }];
    if (entry.isDirectory()) return entry.name === ".git" ? [] : walk(join(dir, entry.name), path);
    return entry.isFile() ? [{ path, link: false }] : [];
  });
}

function readPin(dir: string): Pin | undefined {
  const path = join(dir, ".upstream");
  if (!existsSync(path)) return undefined;
  try {
    const pin = JSON.parse(withoutBom(readFileSync(path, "utf8"))) as { commit?: unknown; pulledOn?: unknown };
    if (typeof pin.commit !== "string" || pin.commit === "") return undefined;
    return { commit: pin.commit, ...(typeof pin.pulledOn === "string" ? { pulledOn: pin.pulledOn } : {}) };
  } catch {
    return undefined;
  }
}

/** Sorts the copy's files, and works out which v0 version it came from. */
export function readCopy(root: string, fingerprints: Fingerprints = V0_FINGERPRINTS): Copy {
  const dir = join(root, V0_FOLDER);
  if (!existsSync(dir)) return { files: [] };
  const votes = fingerprints.versions.map(() => 0);
  const files = walk(dir)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map(({ path, link }): CopyFile => {
      if (link) return { path, kind: "own" };
      const versions = fingerprints.files[path]?.[fingerprint(readFileSync(join(dir, path)))];
      if (versions !== undefined) {
        for (const index of versions) votes[index] = (votes[index] ?? 0) + 1;
        return { path, kind: "unchanged" };
      }
      return { path, kind: UNDERSTOOD.includes(path) ? "understood" : "own" };
    });
  const pin = readPin(dir);
  const pinned =
    pin === undefined
      ? undefined
      : fingerprints.versions.find(({ commit }) => commit.startsWith(pin.commit) || pin.commit.startsWith(commit));
  // The most matching files wins. On a tie, the version with the fewest files the copy lacks, since
  // a later version that only added files matches as well; then the later one.
  const sizes = fingerprints.versions.map(() => 0);
  for (const byHash of Object.values(fingerprints.files)) {
    for (const index of new Set(Object.values(byHash).flat())) sizes[index] = (sizes[index] ?? 0) + 1;
  }
  const lacking = (index: number) => (sizes[index] ?? 0) - (votes[index] ?? 0);
  let best = -1;
  votes.forEach((count, index) => {
    if (count === 0) return;
    const leader = votes[best] ?? 0;
    if (best === -1 || count > leader || (count === leader && lacking(index) <= lacking(best))) best = index;
  });
  const version = pinned ?? fingerprints.versions[best];
  return { files, ...(pin === undefined ? {} : { pin }), ...(version === undefined ? {} : { version }) };
}

// ---- Phases, activities and skills ---------------------------------------------------------------

/** The phases v0's state file allows, from September 2026 on. */
export const V0_PHASES = [
  "setup",
  "understand",
  "architect",
  "spec-system",
  "spec-api-contract",
  "rules-shared",
  "spec-pages",
  "spec-endpoints",
  "rules-track",
  "issues",
  "build",
  "review",
  "test",
  "document",
  "pr-automation",
  "done",
] as const;

export const PHASE_ACTIVITY: Partial<Record<string, ActivityId>> = {
  understand: "understand",
  architect: "architect",
  "spec-system": "specify",
  "spec-api-contract": "contract",
  "rules-shared": "standards",
  "spec-pages": "specify",
  "spec-endpoints": "contract",
  "rules-track": "standards",
  issues: "plan",
  build: "build",
  review: "verify",
  test: "test",
  document: "document",
  "pr-automation": "delivery-setup",
};

export interface PhaseFile {
  activity?: ActivityId;
  skill?: SkillId;
  /** Which part of the system the phase is for, when it is one side's. */
  side?: "frontend" | "backend";
}

/** Each v0 phase file, and the 1.0 activity and skill that do its work (RFC 0008, section 3). */
export function phaseFile(path: string): PhaseFile {
  const side = path.startsWith("frontend/") ? "frontend" : path.startsWith("backend/") ? "backend" : undefined;
  const on = (activity: ActivityId | undefined, skill?: SkillId): PhaseFile => ({
    ...(activity === undefined ? {} : { activity }),
    ...(skill === undefined ? {} : { skill }),
    ...(side === undefined ? {} : { side }),
  });
  const name = path.replace(/^(shared|frontend|backend|agents)\//, "");
  if (path.startsWith("agents/")) {
    const agent: Partial<Record<string, PhaseFile>> = {
      "review-prompt.md": on("verify", "code-review"),
      "security-audit-prompt.md": on("verify", "security-review"),
      "contract-check-prompt.md": on("verify", "contract-check"),
      "qa-prompt.md": on("test", "qa-acceptance"),
    };
    return agent[name] ?? {};
  }
  const shared: Partial<Record<string, PhaseFile>> = {
    "01-understand.md": on("understand", "requirements-analysis"),
    "02-architect.md": on("architect", "architecture"),
    "03-spec-system.md": on("specify", "system-design"),
    "04-spec-api-contract.md": on("contract", "api-design"),
    "05-rules-shared.md": on("standards"),
    "06-issues.md": on("plan", "issue-planning"),
    "07-document.md": on("document", "documentation"),
    "09-pr-automation.md": on("delivery-setup"),
  };
  const track: Partial<Record<string, PhaseFile>> = {
    "01-spec-pages.md": on("specify", "product-spec"),
    "01-spec-endpoints.md": on("contract", "api-design"),
    "02-rules.md": on("standards"),
    "03-build.md": on("build", "implement-ticket"),
    "04-review.md": on("verify", "code-review"),
    "05-test.md": on("test", "test-strategy"),
  };
  return (side === undefined ? shared[name] : track[name]) ?? {};
}

// ---- The state file -----------------------------------------------------------------------------

export interface V0Position {
  phase?: string;
  step?: number;
  phaseFile?: string;
  ticket?: string;
  notes?: string;
}

export interface V0State {
  position: V0Position;
  cycle?: string;
  milestoneBranch?: string;
  ticketTitle?: string;
  inProgress: string[];
  remaining: string[];
  pendingAgents: string[];
  notes?: string;
  /** A non-standard field some copies added, with one position per part of the system. */
  tracks: Record<string, V0Position>;
}

const asText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : typeof value === "number"
      ? String(value)
      : undefined;

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (typeof entry === "string" || typeof entry === "number") return asText(entry) ?? [];
    if (typeof entry === "object" && entry !== null) {
      const fields = entry as Record<string, unknown>;
      return asText(fields.id) ?? asText(fields.key) ?? asText(fields.number) ?? JSON.stringify(entry);
    }
    return [];
  });
}

function asPosition(fields: Record<string, unknown>): V0Position {
  const step = typeof fields.currentStep === "number" ? fields.currentStep : undefined;
  const position: V0Position = {};
  const phase = asText(fields.currentPhase);
  if (phase !== undefined) position.phase = phase;
  if (step !== undefined) position.step = step;
  const file = asText(fields.phaseFile);
  if (file !== undefined) position.phaseFile = file;
  const ticket = asText(fields.ticket);
  if (ticket !== undefined) position.ticket = ticket;
  const notes = asText(fields.notes);
  if (notes !== undefined) position.notes = notes;
  return position;
}

/** Reads any version of v0's state file, with or without a byte-order mark. */
export function readState(text: string): { ok: true; value: V0State } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(withoutBom(text));
  } catch (error) {
    return { ok: false, error: `${V0_STATE} isn't valid JSON: ${(error as Error).message}` };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: `${V0_STATE} doesn't hold an object.` };
  }
  const fields = raw as Record<string, unknown>;
  const tracks: Record<string, V0Position> = {};
  if (typeof fields.tracks === "object" && fields.tracks !== null && !Array.isArray(fields.tracks)) {
    for (const [name, track] of Object.entries(fields.tracks as Record<string, unknown>)) {
      if (typeof track === "object" && track !== null) tracks[name] = asPosition(track as Record<string, unknown>);
    }
  }
  const state: V0State = {
    position: asPosition(fields),
    inProgress: asList(fields.ticketsInProgress),
    remaining: asList(fields.ticketsRemaining),
    pendingAgents: asList(fields.pendingAgents),
    tracks,
  };
  for (const key of ["cycle", "milestoneBranch", "ticketTitle", "notes"] as const) {
    const value = asText(fields[key]);
    if (value !== undefined) state[key] = value;
  }
  return { ok: true, value: state };
}

// ---- Markdown -----------------------------------------------------------------------------------

interface Heading {
  line: number;
  level: number;
  text: string;
}

/** The headings of a Markdown text, leaving out lines inside code fences and HTML comments. */
function headings(lines: string[]): Heading[] {
  const found: Heading[] = [];
  let fence: string | undefined;
  let comment = false;
  lines.forEach((line, index) => {
    if (fence === undefined && (comment || line.includes("<!--"))) {
      const opened = line.lastIndexOf("<!--");
      const closed = line.lastIndexOf("-->");
      comment = comment ? closed === -1 : closed < opened;
      if (comment || opened !== -1 || closed !== -1) return;
    }
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker !== undefined) {
      if (fence === undefined) fence = marker;
      else if (marker.startsWith(fence.charAt(0)) && marker.length >= fence.length) fence = undefined;
      return;
    }
    if (fence !== undefined) return;
    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading?.[1] !== undefined && heading[2] !== undefined) {
      found.push({ line: index, level: heading[1].length, text: heading[2] });
    }
  });
  return found;
}

/** A heading's words: no numbering such as "1." or "4a.", no trailing note in brackets. */
export function headingWords(text: string): string {
  return text
    .replace(/^\d+[a-z]?\.\s*/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/[\s—–-]+$/, "")
    .trim()
    .toLowerCase();
}

/** The sections of v0's own AGENTS.md that setup copied into a project's instructions. */
export const V0_SECTIONS = [
  "on every session start",
  "the workflow",
  "core standards",
  "tool-specific config",
  "without an ai tool",
  "model recommendations",
];

/** The sections of v0's workflow driver, numbered 0 to 8 in it. */
const DRIVER_SECTIONS = [
  "project settings",
  "on every session start",
  "during work",
  "phase transitions",
  "interruptions",
  "context update",
  "mandatory gates",
  "what the state file looks like",
  "model recommendations",
  "models",
  "relationship to other rules",
];

export interface MovedSection {
  heading: string;
  text: string;
}

export interface SplitInstructions {
  /** The project's own text, which stays. */
  kept: string;
  /** v0's text, in the order it appeared, to be moved into the migration notes word for word. */
  moved: MovedSection[];
  /** The workflow driver's Project settings, read before the driver is moved. */
  settings: Settings;
}

/** The Project settings table: each row by its lowercase name, with the name as written. */
export type Settings = Map<string, { name: string; value: string }>;

/** The rows of the driver's "0. Project settings" table: each setting's name, and its value. */
function readSettings(lines: string[]): Settings {
  const settings: Settings = new Map();
  const all = headings(lines);
  const start = all.find((heading) => heading.level === 2 && /^0\.\s*project settings/i.test(heading.text));
  if (start === undefined) return settings;
  const end = all.find((heading) => heading.line > start.line)?.line ?? lines.length;
  for (const line of lines.slice(start.line + 1, end)) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 4 || cells[0] !== "") continue;
    const name = (cells[1] ?? "").replaceAll("*", "").trim();
    const value = cells.slice(2, -1).join("|").trim();
    if (name === "" || /^-+$/.test(name) || name.toLowerCase() === "setting") continue;
    settings.set(name.toLowerCase(), { name, value });
  }
  return settings;
}

/**
 * Splits a project's instructions file into its own text and v0's: the workflow driver, from
 * `# Workflow Driver` to the first section that isn't one of its own, and the sections setup
 * copied from v0's AGENTS.md, recognised by their headings since projects rewrap and number them.
 */
export function splitInstructions(text: string): SplitInstructions {
  const crlf = text.includes("\r\n");
  const lines = withoutBom(text).replaceAll("\r\n", "\n").split("\n");
  const all = headings(lines);
  const ranges: { start: number; end: number; heading: string; driver: boolean }[] = [];
  const isDriverSection = (heading: Heading) =>
    heading.level >= 3 ||
    (heading.level === 2 && DRIVER_SECTIONS.some((section) => headingWords(heading.text).startsWith(section)));
  for (const heading of all) {
    if (ranges.some((range) => heading.line >= range.start && heading.line < range.end)) continue;
    const words = headingWords(heading.text);
    if (heading.level === 1 && words === "workflow driver") {
      const next = all.find((other) => other.line > heading.line && !isDriverSection(other));
      ranges.push({ start: heading.line, end: next?.line ?? lines.length, heading: heading.text, driver: true });
    } else if (heading.level === 2 && V0_SECTIONS.some((section) => words.startsWith(section))) {
      const next = all.find((other) => other.line > heading.line && other.level <= 2);
      ranges.push({ start: heading.line, end: next?.line ?? lines.length, heading: heading.text, driver: false });
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const driver = ranges.find((range) => range.driver);
  const settings = driver === undefined ? (new Map() as Settings) : readSettings(lines.slice(driver.start, driver.end));
  const moved = ranges.map((range) => ({
    heading: range.heading,
    text: lines.slice(range.start, range.end).join("\n").trim(),
  }));
  const kept = ranges.length === 0 ? withoutBom(text) : keptText(lines, ranges);
  return { kept: crlf && ranges.length > 0 ? kept.replaceAll("\n", "\r\n") : kept, moved, settings };
}

const isBlank = (line: string) => line.trim() === "";
const isDivider = (line: string) => /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line);

/**
 * The lines outside the cut sections, changed only where a section was cut out: blank lines there
 * close up to one, and a divider left at the very end goes. A divider right under a line of text
 * is that line's heading underline, and stays.
 */
function keptText(lines: string[], ranges: { start: number; end: number }[]): string {
  const segments: string[][] = [];
  let at = 0;
  for (const range of ranges) {
    segments.push(lines.slice(at, range.start));
    at = Math.max(at, range.end);
  }
  segments.push(lines.slice(at));
  const trimmed = segments.map((segment, index) => {
    const kept = [...segment];
    if (index > 0) while (kept.length > 0 && isBlank(kept[0] ?? "")) kept.shift();
    if (index < segments.length - 1) while (kept.length > 0 && isBlank(kept.at(-1) ?? "")) kept.pop();
    return kept;
  });
  const lastKept = trimmed.findLastIndex((segment) => segment.some((line) => !isBlank(line)));
  if (lastKept === -1) return "";
  const last = trimmed[lastKept] ?? [];
  if (
    lastKept < trimmed.length - 1 &&
    isDivider(last.at(-1) ?? "") &&
    (last.length === 1 || isBlank(last.at(-2) ?? ""))
  ) {
    last.pop();
    while (last.length > 0 && isBlank(last.at(-1) ?? "")) last.pop();
  }
  const text = trimmed
    .filter((segment) => segment.some((line) => !isBlank(line)))
    .map((segment) => segment.join("\n"))
    .join("\n\n");
  return text.trim() === "" ? "" : text.endsWith("\n") ? text : `${text}\n`;
}

// ---- The Project settings table -----------------------------------------------------------------

/** A setting's whole text, without bold or code marks. */
export const settingText = (raw: string): string => raw.replaceAll("*", "").replaceAll("`", "").trim();

/**
 * A setting's value: its first code span, such as `npm run verify`, or its whole text. Undefined
 * when it was never filled in, or says none.
 */
export function settingValue(raw: string): string | undefined {
  if (/\[PLACEHOLDER/i.test(raw)) return undefined;
  const text = settingText(raw);
  if (text === "" || /^(none\b|n\/a\b|tbd\b|-+$|—$)/i.test(text)) return undefined;
  return /`([^`]+)`/.exec(raw)?.[1]?.trim() ?? text;
}

export interface Converted {
  /** The v0 setting or source, as the notes name it. */
  from: string;
  /** The config key it became. */
  to: string;
  value: string;
}

export interface SettingsResult {
  config: {
    commands?: { verify: string };
    tracker?: {
      kind: "none" | "github" | "gitlab" | "linear" | "jira" | "other";
      ticketPrefix?: string;
      project?: string;
    };
    repo?: { remote?: string; branchNaming?: string; mergePolicy?: "pull-request" | "local-merge" };
    design?: { status: "exists"; reference: string };
  };
  converted: Converted[];
  /** Settings with a value migrate couldn't place, word for word. */
  unplaced: { name: string; value: string }[];
}

function trackerKind(value: string): "none" | "github" | "gitlab" | "linear" | "jira" | "other" {
  const lower = value.toLowerCase();
  if (/^none\b/.test(lower)) return "none";
  for (const kind of ["github", "gitlab", "linear", "jira"] as const) if (lower.includes(kind)) return kind;
  return "other";
}

/**
 * A v0 branch pattern in 1.0's placeholders: feature/PROJ-XX-short-description is
 * feature/{ticket}-{slug}, and feature/<short-description> is feature/{slug}.
 */
export function branchPattern(value: string): string | undefined {
  let pattern = value.replace(/<[^>]*\b(ticket|issue|id|number|key)\b[^>]*>/i, "{ticket}");
  if (!pattern.includes("{ticket}")) pattern = pattern.replace(/[A-Z][A-Z0-9]*-(X+|N+|\d+)\b/, "{ticket}");
  pattern = pattern.replace(/<[^>]+>/, "{slug}");
  if (!pattern.includes("{slug}")) {
    pattern = pattern.replace(/(short-)?(description|desc|slug|summary|title)\b/i, "{slug}");
  }
  return pattern.includes("{ticket}") || pattern.includes("{slug}") ? pattern : undefined;
}

/** Turns the driver's Project settings into config keys (RFC 0008, section 3). */
export function convertSettings(settings: Settings, exists: (path: string) => boolean): SettingsResult {
  const result: SettingsResult = { config: {}, converted: [], unplaced: [] };
  const place = (name: string, to: string, value: string) => result.converted.push({ from: name, to, value });
  for (const [key, { name, value: raw }] of settings) {
    const value = settingValue(raw);
    if (value === undefined) continue;
    switch (key) {
      case "verify command":
        result.config.commands = { verify: value };
        place("Verify command", "commands.verify", value);
        break;
      case "issue tracker": {
        const kind = trackerKind(settingText(raw));
        const project = /^[\w.-]+\/[\w.-]+$/.test(value) ? value : undefined;
        result.config.tracker = { ...result.config.tracker, kind, ...(project === undefined ? {} : { project }) };
        place("Issue tracker", "tracker.kind", kind);
        if (project !== undefined) place("Issue tracker", "tracker.project", project);
        break;
      }
      case "ticket prefix":
        if (/^[A-Za-z][A-Za-z0-9]*-?$/.test(value)) {
          result.config.tracker = {
            ...result.config.tracker,
            kind: result.config.tracker?.kind ?? "other",
            ticketPrefix: value.replace(/-$/, ""),
          };
          place("Ticket prefix", "tracker.ticketPrefix", value.replace(/-$/, ""));
        } else result.unplaced.push({ name: "Ticket prefix", value: raw });
        break;
      case "remote":
        if (/^[\w.-]+$/.test(value)) {
          result.config.repo = { ...result.config.repo, remote: value };
          place("Remote", "repo.remote", value);
        } else result.unplaced.push({ name: "Remote", value: raw });
        break;
      case "design reference":
        if (!/^https?:/i.test(value) && exists(value)) {
          result.config.design = { status: "exists", reference: value };
          place("Design reference", "design.reference", value);
        } else result.unplaced.push({ name: "Design reference", value: raw });
        break;
      case "branch naming": {
        const pattern = branchPattern(value);
        if (pattern === undefined) result.unplaced.push({ name: "Branch naming", value: raw });
        else {
          result.config.repo = { ...result.config.repo, branchNaming: pattern };
          place("Branch naming", "repo.branchNaming", pattern);
        }
        break;
      }
      case "merge policy": {
        const text = settingText(raw);
        const policy = /\blocal[ -]merge\b/i.test(text)
          ? "local-merge"
          : /\bPRs?\b|pull request/i.test(text)
            ? "pull-request"
            : undefined;
        if (policy === undefined) result.unplaced.push({ name: "Merge policy", value: raw });
        else {
          result.config.repo = { ...result.config.repo, mergePolicy: policy };
          place("Merge policy", "repo.mergePolicy", policy);
        }
        break;
      }
      case "model selector":
        break;
      default:
        result.unplaced.push({ name, value: raw });
    }
  }
  // A tracker named only by its prefix is still a tracker of some kind.
  if (result.config.tracker !== undefined && !settings.has("issue tracker")) result.config.tracker.kind = "other";
  return result;
}

// ---- phase-config.json --------------------------------------------------------------------------

export interface PhaseEntry {
  file: string;
  model?: string;
  block: string[];
}

export function readPhaseConfig(text: string): { ok: true; value: PhaseEntry[] } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(withoutBom(text));
  } catch (error) {
    return { ok: false, error: `phase-config.json isn't valid JSON: ${(error as Error).message}` };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "phase-config.json doesn't hold an object." };
  }
  const entries = Object.entries(raw as Record<string, unknown>).flatMap(([file, value]): PhaseEntry[] => {
    if (file.startsWith("_") || typeof value !== "object" || value === null) return [];
    const fields = value as { model?: unknown; block?: unknown };
    const model = typeof fields.model === "string" ? modelName(fields.model) : undefined;
    const block = Array.isArray(fields.block) ? fields.block.filter((line) => typeof line === "string") : [];
    return [{ file, ...(model === undefined ? {} : { model }), block }];
  });
  return { ok: true, value: entries };
}

/** The model a v0 model line names: "> **Model: Opus** — implementation." is Opus. */
export function modelName(line: string): string | undefined {
  const name = /Model:\s*([^*.—–(]+)/i.exec(line)?.[1]?.trim();
  return name === undefined || name === "" ? undefined : name;
}

/** A list item that starts by naming an add-on: "- `engineering:architecture` — options". */
const ADD_ON_ITEM = /^[-*]\s+`(\/[a-z0-9-]+|[a-z0-9-]+:[a-z0-9-]+)`/;
const DORMANT = /\bdormant until\b/i;

/** Which side of the system a line is about, from its own words; undefined when it's unclear. */
export function lineSide(line: string): "frontend" | "backend" | undefined {
  const backend = /\b(backend|back-end|server|api)\b/i.test(line);
  const frontend = /\b(frontend|front-end|web app|mobile app|ui)\b/i.test(line);
  return backend === frontend ? undefined : backend ? "backend" : "frontend";
}

/**
 * Lines as notes, one note per thought: a line that introduces a list ("Review against, in this
 * order:") takes the items under it, and an item on its own loses its bullet.
 */
export function joinLists(lines: string[]): string[] {
  const joined: string[] = [];
  let open = false;
  let fresh = false;
  for (const line of lines) {
    const item = /^[-*]\s+(.*)$/.exec(line)?.[1];
    if (item !== undefined && open && joined.length > 0) {
      joined[joined.length - 1] = `${joined.at(-1) ?? ""}${fresh ? " " : "; "}${item}`;
      fresh = false;
      continue;
    }
    joined.push(item ?? line);
    open = item === undefined && /:\**\s*$/.test(line);
    fresh = open;
  }
  return joined;
}

/** A block line without its quote mark: "> - text" is "- text". */
const unquoted = (line: string) => line.replace(/^\s*>\s?/, "").trim();

export interface PhaseSettings {
  models?: { policy: "pinned"; default: string; byActivity?: Partial<Record<ActivityId, string>> };
  capabilities: Partial<Record<SkillId, { also?: string[]; notes?: string[] }>>;
  activities: Partial<Record<ActivityId, { notes?: string[] }>>;
  /** Lines that say a side of the system is dormant, such as the backend; side is unclear when undefined. */
  dormant: { side?: "frontend" | "backend"; line: string; file: string }[];
  converted: Converted[];
  /** Blocks whose first line is no longer in their phase file: the project changed it since. */
  conflicts: { file: string; block: string[] }[];
  /** Anything else that needs a person: model disagreements, lines with no 1.0 home. */
  unplaced: { file: string; text: string }[];
}

/**
 * Turns phase-config.json into config keys (RFC 0008, section 3). `phaseText` returns the phase
 * file's text in the copy, so a block the project has since overwritten is caught, not converted.
 */
export function convertPhaseConfig(
  entries: PhaseEntry[],
  phaseText: (file: string) => string | undefined,
): PhaseSettings {
  const result: PhaseSettings = {
    capabilities: {},
    activities: {},
    dormant: [],
    converted: [],
    conflicts: [],
    unplaced: [],
  };
  const add = (list: string[] | undefined, item: string) =>
    list?.includes(item) === true ? list : [...(list ?? []), item];

  // Models: the one most phases name is the default; an activity whose phases all name another gets it.
  const modelled = entries.filter((entry) => entry.model !== undefined);
  const counts = new Map<string, number>();
  for (const entry of modelled) counts.set(entry.model ?? "", (counts.get(entry.model ?? "") ?? 0) + 1);
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  const defaultModel = ranked[0]?.[0];
  if (defaultModel !== undefined) {
    const byActivity: Partial<Record<ActivityId, string>> = {};
    const seen = new Map<ActivityId, Set<string>>();
    for (const entry of modelled) {
      const activity = phaseFile(entry.file).activity;
      if (activity === undefined || entry.model === undefined) continue;
      seen.set(activity, (seen.get(activity) ?? new Set()).add(entry.model));
    }
    for (const [activity, models] of seen) {
      const [model] = [...models];
      if (models.size > 1) {
        result.unplaced.push({
          file: "phase-config.json",
          text: `Phases for ${activity} name different models: ${[...models].join(", ")}. ${defaultModel === model ? "" : `${model ?? ""} was used.`}`.trim(),
        });
      }
      if (model !== undefined && model !== defaultModel) byActivity[activity] = model;
    }
    result.models = {
      policy: "pinned",
      default: defaultModel,
      ...(Object.keys(byActivity).length === 0 ? {} : { byActivity }),
    };
    result.converted.push({ from: "phase-config.json model lines", to: "models", value: `${defaultModel} by default` });
    for (const [activity, model] of Object.entries(byActivity)) {
      result.converted.push({
        from: "phase-config.json model lines",
        to: `models.byActivity.${activity}`,
        value: model,
      });
    }
  }

  for (const entry of entries) {
    const lines = entry.block.map(unquoted).filter((line) => line !== "");
    if (lines.length === 0) continue;
    const text = phaseText(entry.file);
    const first = lines[0] ?? "";
    if (text !== undefined && !text.split("\n").some((line) => unquoted(line) === first)) {
      result.conflicts.push({ file: entry.file, block: entry.block });
      continue;
    }
    const phase = phaseFile(entry.file);
    const side = phase.side === undefined ? "" : `${phase.side === "frontend" ? "Frontend" : "Backend"}: `;
    for (const line of lines) {
      const addOn = ADD_ON_ITEM.exec(line)?.[1];
      if (addOn !== undefined && phase.skill !== undefined) {
        const capability = (result.capabilities[phase.skill] ??= {});
        capability.also = add(capability.also, addOn);
        result.converted.push({ from: entry.file, to: `capabilities.${phase.skill}.also`, value: addOn });
      }
      if (DORMANT.test(line)) {
        const dormantSide = lineSide(line) ?? phase.side;
        result.dormant.push({ ...(dormantSide === undefined ? {} : { side: dormantSide }), line, file: entry.file });
      }
    }
    // Every line stays as a note, add-ons and all, so nothing the block said is lost.
    for (const line of joinLists(lines)) {
      const note = `${side}${line}`;
      if (phase.skill !== undefined) {
        const capability = (result.capabilities[phase.skill] ??= {});
        capability.notes = add(capability.notes, note);
        result.converted.push({ from: entry.file, to: `capabilities.${phase.skill}.notes`, value: note });
      } else if (phase.activity !== undefined) {
        const activity = (result.activities[phase.activity] ??= {});
        activity.notes = add(activity.notes, note);
        result.converted.push({ from: entry.file, to: `activities.${phase.activity}.notes`, value: note });
      } else {
        result.unplaced.push({ file: entry.file, text: line });
      }
    }
  }
  return result;
}
