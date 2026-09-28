// peer-ai doctor: checks that Peer AI is set up correctly in a repository, and says how to fix
// what isn't. It only reads; it never changes a file. A failure stops Peer AI working as
// intended; a warning is something to tidy up. Every check reports, including the ones it had
// to skip, so a clean report means everything was looked at.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { MAP_ITEM_IDS, validateMap, validateWorkItem, type PeerAiConfig } from "@peer-ai/workflow";
import { LEGACY_MARKERS, MAP_FILE, assess, loadConfig } from "./assess.ts";
import { CONFIG_FILE, detectName, detectTools, detectTracks } from "./detect.ts";
import type { Output } from "./init.ts";
import { MIN_NODE_MAJOR } from "./package-info.ts";

export const WORK_DIR = ".peer-ai/work";

export type CheckStatus = "ok" | "warn" | "fail" | "skip";

export interface Check {
  id: string;
  status: CheckStatus;
  message: string;
  fix?: string;
}

export interface Diagnosis {
  name: string;
  ok: boolean;
  checks: Check[];
}

const ok = (id: string, message: string): Check => ({ id, status: "ok", message });
const skip = (id: string, message: string): Check => ({ id, status: "skip", message });
const warn = (id: string, message: string, fix: string): Check => ({ id, status: "warn", message, fix });
const fail = (id: string, message: string, fix: string): Check => ({ id, status: "fail", message, fix });

const NEEDS_CONFIG = `needs a valid ${CONFIG_FILE}`;
const isDirectory = (path: string) => statSync(path, { throwIfNoEntry: false })?.isDirectory() === true;
const isUrl = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
const normalise = (path: string) => path.replace(/^\.\//, "").replace(/\/+$/, "");
const plural = (count: number, word: string) => `${String(count)} ${word}${count === 1 ? "" : "s"}`;

function readJson(path: string): { value?: unknown; error?: string } {
  try {
    return { value: JSON.parse(readFileSync(path, "utf8")) };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

function checkNode(version: string): Check {
  const major = Number(version.split(".")[0]);
  if (major >= MIN_NODE_MAJOR) return ok("node", `Node.js ${version}`);
  return fail(
    "node",
    `Node.js ${version} is older than ${String(MIN_NODE_MAJOR)}, which Peer AI needs.`,
    `Install Node.js ${String(MIN_NODE_MAJOR)} or later.`,
  );
}

function checkConfig(root: string): { check: Check; config?: PeerAiConfig } {
  if (!existsSync(join(root, CONFIG_FILE))) {
    return { check: fail("config", `No ${CONFIG_FILE} in this folder.`, "Run peer-ai init.") };
  }
  const { config, errors = [] } = loadConfig(root);
  if (config === undefined) {
    return {
      check: fail(
        "config",
        `${CONFIG_FILE} is not valid: ${errors.join("; ")}`,
        `Correct ${CONFIG_FILE}. An editor that reads its $schema shows each error in place.`,
      ),
    };
  }
  return { check: ok("config", `${CONFIG_FILE} is valid`), config };
}

/** Each track's folder exists, and every part found in the repository belongs to a track. */
function checkTracks(root: string, config: PeerAiConfig): Check[] {
  const checks: Check[] = [];
  for (const track of config.tracks) {
    // A dormant track hasn't been started, so its folder may not exist yet.
    if (track.path === undefined || track.status === "dormant" || track.status === "external") continue;
    if (!isDirectory(join(root, track.path))) {
      checks.push(
        fail(
          "tracks",
          `Track "${track.id}" points to ${track.path}, which doesn't exist.`,
          `Correct its path in ${CONFIG_FILE}, or remove the track.`,
        ),
      );
    }
  }
  // A track with no path is the repository root, so it covers a part found at the root and no
  // other: a part in a subfolder of a monorepo needs a track of its own, or one whose folder holds it.
  const paths = config.tracks
    .filter((track) => track.status !== "external")
    .map((track) => (track.path === undefined ? undefined : normalise(track.path)));
  const covered = (found: string | undefined) =>
    paths.some((path) =>
      path === undefined || found === undefined ? path === found : found === path || found.startsWith(`${path}/`),
    );
  for (const found of detectTracks(root, detectName(root))) {
    if (covered(found.path)) continue;
    checks.push(
      warn(
        "tracks",
        `Found ${found.path ?? "a part at the repository root"} (${found.kind}), which isn't in the config.`,
        `Add it to tracks in ${CONFIG_FILE}, or set the path of the track it belongs to.`,
      ),
    );
  }
  if (checks.length > 0) return checks;
  return [ok("tracks", `${plural(config.tracks.length, "track")}, matching the repository`)];
}

/** Files the config points to, as sources to read. Destinations such as docs.dir may not exist yet. */
function referencedFiles(config: PeerAiConfig): { field: string; path: string }[] {
  const refs: { field: string; path: string | undefined }[] = [
    { field: "design.reference", path: config.design?.reference },
    { field: "design.tokens", path: config.design?.tokens },
    { field: "delivery.pipeline", path: config.delivery?.pipeline },
    { field: "compliance.dataInventory", path: config.compliance?.dataInventory },
    ...(config.apis ?? []).map((api) => ({ field: `apis "${api.id}" contract`, path: api.contract?.location })),
    ...(config.standards?.documents ?? []).map((doc) => ({ field: "standards.documents", path: doc.path })),
    ...(config.rules ?? []).map((rule) => ({ field: "rules", path: rule.path })),
    ...Object.entries(config.capabilities ?? {}).flatMap(([skill, capability]) =>
      (capability.checklists ?? []).map((path) => ({ field: `capabilities.${skill}.checklists`, path })),
    ),
    ...Object.entries(config.activities ?? {}).flatMap(([activity, settings]) =>
      (settings.inputs ?? []).map((path) => ({ field: `activities.${activity}.inputs`, path })),
    ),
  ];
  return refs.filter(
    (ref): ref is { field: string; path: string } =>
      ref.path !== undefined && !isUrl(ref.path) && !/[*?]/.test(ref.path),
  );
}

function checkReferences(root: string, config: PeerAiConfig): Check[] {
  const refs = referencedFiles(config);
  const missing = refs.filter((ref) => !existsSync(join(root, ref.path)));
  if (missing.length === 0) {
    return [
      ok(
        "references",
        refs.length === 0
          ? "The config names no other files"
          : `The ${plural(refs.length, "file")} the config names exist`,
      ),
    ];
  }
  return missing.map((ref) =>
    ref.path.startsWith("/")
      ? warn(
          "references",
          `${ref.field} is ${ref.path}, which is neither a path in the repository nor a full URL.`,
          `Use a path relative to the project root, or a full URL starting with https://.`,
        )
      : warn(
          "references",
          `${ref.field} points to ${ref.path}, which doesn't exist.`,
          `Create it, or correct the path in ${CONFIG_FILE}.`,
        ),
  );
}

function checkTools(root: string, config: PeerAiConfig): Check {
  const listed = config.tools ?? [];
  const unlisted = detectTools(root).filter((tool) => !listed.includes(tool));
  if (unlisted.length > 0) {
    return warn(
      "tools",
      `Set up in this repository, but not listed in the config: ${unlisted.join(", ")}.`,
      `Add ${unlisted.map((tool) => `"${tool}"`).join(", ")} to tools in ${CONFIG_FILE}.`,
    );
  }
  if (listed.length === 0) {
    return warn(
      "tools",
      "No AI tools are listed, so Peer AI doesn't know which tools to write instructions for.",
      `Add the tools you use to ${CONFIG_FILE}, for example "tools": ["claude-code"].`,
    );
  }
  return ok("tools", `AI tools: ${listed.join(", ")}`);
}

/** The map is valid, and still says what a fresh assessment would. */
function checkMap(root: string, config: PeerAiConfig | undefined): Check {
  const path = join(root, MAP_FILE);
  if (!existsSync(path)) return warn("map", "There is no project map yet.", "Run peer-ai assess.");
  const rewrite = "Run peer-ai assess to write it again.";
  const { value, error } = readJson(path);
  if (error !== undefined) return fail("map", `${MAP_FILE} is not valid JSON: ${error}`, rewrite);
  const result = validateMap(value);
  if (!result.ok) return fail("map", `${MAP_FILE} is not valid: ${result.errors.join("; ")}`, rewrite);
  const map = result.value;
  const date = map.assessedAt.slice(0, 10);
  if (config === undefined) return skip("map", `The project map from ${date} is valid; not compared, ${NEEDS_CONFIG}`);

  const fresh = assess(root, config, config.project.stage ?? "mvp");
  const changed = MAP_ITEM_IDS.filter((id) => map.items[id]?.status !== fresh.items[id].status).map(
    (id) => `${id} (${map.items[id]?.status ?? "not recorded"} → ${fresh.items[id].status})`,
  );
  if (changed.length > 0) {
    return warn("map", `The project map from ${date} is out of date: ${changed.join(", ")}.`, "Run peer-ai assess.");
  }
  return ok("map", `The project map from ${date} is up to date`);
}

function checkWorkItems(root: string, config: PeerAiConfig | undefined): Check[] {
  const dir = join(root, WORK_DIR);
  const files = isDirectory(dir) ? readdirSync(dir).filter((file) => file.endsWith(".json")) : [];
  if (files.length === 0) return [ok("work-items", "No work items yet")];
  const tracks = config?.tracks.map((track) => track.id);
  const checks: Check[] = [];
  for (const file of files.sort()) {
    const where = `${WORK_DIR}/${file}`;
    const correct = "Correct it. An editor that reads its $schema shows each error.";
    const { value, error } = readJson(join(dir, file));
    if (error !== undefined) {
      checks.push(fail("work-items", `${where} is not valid JSON: ${error}`, correct));
      continue;
    }
    const result = validateWorkItem(value);
    if (!result.ok) {
      checks.push(fail("work-items", `${where} is not valid: ${result.errors.join("; ")}`, correct));
      continue;
    }
    const item = result.value;
    if (item.id !== basename(file, ".json")) {
      checks.push(
        fail(
          "work-items",
          `${where} has the id "${item.id}", but a work item's file is named after its id.`,
          `Rename the file to ${item.id}.json, or change its id.`,
        ),
      );
    }
    if (item.track !== undefined && tracks !== undefined && !tracks.includes(item.track)) {
      checks.push(
        fail(
          "work-items",
          `${where} is for the track "${item.track}", which isn't in the config.`,
          `Change its track, or add the track to ${CONFIG_FILE}.`,
        ),
      );
    }
  }
  if (checks.length > 0) return checks;
  return [
    ok("work-items", files.length === 1 ? "1 work item, valid" : `${String(files.length)} work items, all valid`),
  ];
}

function checkGit(root: string): Check {
  if (!existsSync(join(root, ".git"))) {
    return warn(
      "git",
      "This folder isn't a git repository, and Peer AI follows which work item you're on by its branch.",
      "Run git init.",
    );
  }
  const ignored = [CONFIG_FILE, MAP_FILE, `${WORK_DIR}/`].filter((path) => {
    try {
      // Exit code 0 means ignored. Any other outcome, including git failing, reports nothing.
      execFileSync("git", ["check-ignore", "-q", "--no-index", path], { cwd: root, stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  });
  if (ignored.length === 0) return ok("git", "Git doesn't ignore Peer AI's files");
  return warn(
    "git",
    `Git ignores ${ignored.join(", ")}, so the team, CI and other checkouts won't see ${ignored.length === 1 ? "it" : "them"}.`,
    "Remove the matching lines from .gitignore. Peer AI's files are meant to be committed.",
  );
}

function checkLegacy(root: string): Check[] {
  if (!LEGACY_MARKERS.some((marker) => existsSync(join(root, marker)))) return [];
  return [
    warn(
      "legacy",
      "The peer-ai/ folder is a copy of the v0 playbook, which Peer AI 1.0 doesn't read.",
      `Move any changes your project made to it into ${CONFIG_FILE}, then remove it with: git rm -r peer-ai`,
    ),
  ];
}

export function diagnose(root: string, nodeVersion: string = process.versions.node): Diagnosis {
  const { check: configCheck, config } = checkConfig(root);
  const needsConfig = (id: string, what: string): Check[] =>
    config === undefined ? [skip(id, `${what} not checked: ${NEEDS_CONFIG}`)] : [];
  const checks = [
    checkNode(nodeVersion),
    configCheck,
    ...(config === undefined ? needsConfig("tracks", "Tracks") : checkTracks(root, config)),
    ...(config === undefined ? needsConfig("references", "Files the config names") : checkReferences(root, config)),
    ...(config === undefined ? needsConfig("tools", "AI tools") : [checkTools(root, config)]),
    checkMap(root, config),
    ...checkWorkItems(root, config),
    checkGit(root),
    ...checkLegacy(root),
  ];
  return {
    name: config?.project.name ?? detectName(root),
    ok: checks.every((check) => check.status !== "fail"),
    checks,
  };
}

const SYMBOL: Record<CheckStatus, string> = { ok: "✓", warn: "!", fail: "✗", skip: "–" };

export function formatDiagnosis(diagnosis: Diagnosis): string[] {
  const lines = [`Peer AI doctor: ${diagnosis.name}`, ""];
  for (const check of diagnosis.checks) {
    lines.push(`  ${SYMBOL[check.status]} ${check.message}`);
    if (check.fix !== undefined) lines.push(`      ${check.fix}`);
  }
  const failures = diagnosis.checks.filter((check) => check.status === "fail").length;
  const warnings = diagnosis.checks.filter((check) => check.status === "warn").length;
  lines.push("");
  if (failures + warnings === 0) lines.push("Everything is set up correctly.");
  else if (failures === 0) lines.push(`No problems, and ${plural(warnings, "warning")}.`);
  else lines.push(`${plural(failures, "problem")} to fix, and ${plural(warnings, "warning")}.`);
  return lines;
}

export interface DoctorOptions {
  cwd: string;
  json: boolean;
  nodeVersion?: string;
}

/** Exit code 0 when nothing failed, even with warnings; 1 when something failed. */
export function runDoctor(options: DoctorOptions, out: Output): number {
  const diagnosis = diagnose(options.cwd, options.nodeVersion);
  if (options.json) out.log(JSON.stringify(diagnosis, null, 2));
  else for (const line of formatDiagnosis(diagnosis)) out.log(line);
  return diagnosis.ok ? 0 : 1;
}
