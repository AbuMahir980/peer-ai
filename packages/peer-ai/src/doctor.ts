// peer-ai doctor: checks that Peer AI is set up correctly in a repository, and says how to fix
// what isn't. It only reads; it never changes a file. A failure stops Peer AI working as
// intended; a warning is something to tidy up. Every check reports, including the ones it had
// to skip, so a clean report means everything was looked at.

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { CORE_RULES, PROFILE_RULES, PROFILES, overrideFits } from "peer-ai-standards";
import { DOMAINS, type PeerAiConfig } from "peer-ai-workflow";
import { LEGACY_MARKERS, MAP_FILE, assess, loadConfig } from "./assess.ts";
import { count, fail, formatChecks, ok, plural, skip, warn, type Check } from "./checks.ts";
import { checkEnforcers, checkProfiles } from "./enforcers.ts";
import { GATE_FILE, checkGate } from "./gate.ts";
import { WORKFLOW_FILE } from "./pipeline.ts";
import { RUFF_FILE } from "./ruff.ts";
import { CONFIG_FILE, detectDelivery, detectName, detectTools, detectTracks } from "./detect.ts";
import type { Output } from "./init.ts";
import { MIN_NODE_MAJOR } from "./package-info.ts";
import { planRender } from "./render.ts";
import { WORK_DIR, mapChanges, readMap, readWorkItems } from "./state.ts";

export interface Diagnosis {
  name: string;
  ok: boolean;
  checks: Check[];
}

export interface DiagnoseOptions {
  /** Check the rendered skills too. CI never has them, since they stay out of git, unless the project commits them. */
  skills?: boolean;
}

const NEEDS_CONFIG = `needs a valid ${CONFIG_FILE}`;
const isDirectory = (path: string) => statSync(path, { throwIfNoEntry: false })?.isDirectory() === true;
const isUrl = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
const normalise = (path: string) => path.replace(/^\.\//, "").replace(/\/+$/, "");

function checkNode(version: string): Check {
  const major = Number(version.split(".")[0]);
  if (major >= MIN_NODE_MAJOR) return ok("node", `Node.js ${version}`);
  return fail(
    "node",
    `Node.js ${version} is older than ${String(MIN_NODE_MAJOR)}, which Peer AI needs.`,
    `Install Node.js ${String(MIN_NODE_MAJOR)} or later.`,
  );
}

export function checkConfig(root: string): { check: Check; config?: PeerAiConfig } {
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
export function checkTracks(root: string, config: PeerAiConfig): Check[] {
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

/** What render writes for the AI tools still matches the config. */
/** Files with a check of their own: the enforcers, and the CI gate. */
const ENFORCER_FILES = [WORKFLOW_FILE, RUFF_FILE, GATE_FILE];

function checkRendered(root: string, config: PeerAiConfig, skills: boolean): Check {
  const plan = planRender(root, config);
  const withSkills = skills || config.skills?.commit === true;
  const stale = [
    // The tools that enforce the stack profiles are checked on their own, with what each needs.
    ...plan.files
      .filter((file) => file.action !== "unchanged" && !ENFORCER_FILES.includes(file.path))
      .map((file) => file.path),
    ...(withSkills ? plan.skills : []).filter((skill) => skill.action !== "unchanged").map((skill) => `${skill.path}/`),
  ];
  if (stale.length === 0)
    return ok("render", "The AI tools' instructions, MCP registrations and skills are up to date");
  return warn("render", `Out of date for the AI tools: ${stale.join(", ")}.`, "Run peer-ai render.");
}

/** The config's CI setting matches the repository, so Peer AI never adds a second pipeline. */
function checkDelivery(root: string, config: PeerAiConfig): Check {
  const found = detectDelivery(root);
  if (config.delivery?.ci === "none" && found?.pipeline !== undefined) {
    return warn(
      "delivery",
      `The config says there is no CI, but there is a pipeline in ${found.pipeline}.`,
      `Set "delivery": { "ci": "existing", "pipeline": "${found.pipeline}" } in ${CONFIG_FILE}, so Peer AI extends it instead of adding another.`,
    );
  }
  const pipeline = found?.pipeline ?? (config.delivery?.ci === "existing" ? config.delivery.pipeline : undefined);
  return ok("delivery", pipeline === undefined ? "No CI pipeline yet" : `CI pipeline: ${pipeline}`);
}

const CORE_RULE_IDS = new Set(CORE_RULES.map((rule) => rule.id));
const CORE_PREFIXES = new Set<string>(Object.values(DOMAINS));
const PROFILE_PREFIXES = new Set(PROFILES.map((profile) => profile.prefix));

/**
 * Every rule the project sets aside or changes, listed so nothing is switched off silently (RFC
 * 0003). An id with a core or stack profile prefix must be one of Peer AI's rules, and a changed
 * rule must have a value to change (RFC 0006); other prefixes belong to project add-ons, which
 * are listed as they are.
 */
export function checkStandards(config: PeerAiConfig, today: string): Check[] {
  const exceptions = config.standards?.exceptions ?? [];
  const overrides = Object.entries(config.standards?.overrides ?? {});
  if (exceptions.length + overrides.length === 0) return [ok("standards", "No rules set aside or changed")];
  const unknown = (rule: string) => {
    const prefix = rule.split("-")[0] ?? "";
    const ours = CORE_PREFIXES.has(prefix) || PROFILE_PREFIXES.has(prefix);
    return ours && !CORE_RULE_IDS.has(rule) && !PROFILE_RULES.has(rule)
      ? warn(
          "standards",
          `${rule} isn't one of Peer AI's rules, so setting it aside or changing it does nothing.`,
          `Check the rule id in ${CONFIG_FILE}. The rules are listed in peer-ai-standards.`,
        )
      : undefined;
  };
  // A value that can't stand in for the default, such as text for a number, or a count that isn't
  // a whole number, is ignored, so the default stays.
  const wrongType = (rule: string, value: string | number) => {
    const profiled = PROFILE_RULES.get(rule);
    if (profiled?.default === undefined || overrideFits(profiled, value)) return undefined;
    const fallback = profiled.default.value;
    const kind =
      typeof fallback === "number" && Number.isInteger(fallback) ? "whole number of 0 or more" : typeof fallback;
    return warn(
      "standards",
      `${rule}'s value is a ${kind}, such as ${JSON.stringify(fallback)}, so ${JSON.stringify(value)} is ignored and the default stays.`,
      `Write the value in standards.overrides as a ${kind}.`,
    );
  };
  const seen = new Set<string>();
  const listed = exceptions.map((exception): Check => {
    const { rule, reason, decidedBy, until } = exception;
    if (seen.has(rule)) {
      return warn(
        "standards",
        `${rule} is set aside more than once.`,
        "Keep one entry for it in standards.exceptions, with the decision that stands.",
      );
    }
    seen.add(rule);
    const problem = unknown(rule);
    if (problem !== undefined) return problem;
    if (until !== undefined && until < today) {
      return warn(
        "standards",
        `The exception for ${rule} ended on ${until}, so the rule applies again.`,
        "Remove it from standards.exceptions, or extend it with a new decision and a new date.",
      );
    }
    return ok(
      "standards",
      `${rule} set aside: ${reason} (decided by ${decidedBy}${until === undefined ? "" : `, until ${until}`})`,
    );
  });
  const changed = overrides.map(
    ([rule, override]): Check =>
      unknown(rule) ??
      (CORE_RULE_IDS.has(rule) || (PROFILE_RULES.has(rule) && PROFILE_RULES.get(rule)?.default === undefined)
        ? warn(
            "standards",
            `${rule} has no value to change, so the override does nothing.`,
            `Remove it from standards.overrides, or set the rule aside in standards.exceptions with the reason.`,
          )
        : (wrongType(rule, override.value) ??
          ok("standards", `${rule} changed to ${String(override.value)}: ${override.reason}`))),
  );
  return [...listed, ...changed];
}

/** The map is valid, and still says what a fresh assessment would. */
function checkMap(root: string, config: PeerAiConfig | undefined): Check {
  const read = readMap(root);
  if (read === undefined) return warn("map", "There is no project map yet.", "Run peer-ai assess.");
  if (!read.ok) return fail("map", `${MAP_FILE} ${read.error}`, "Run peer-ai assess to write it again.");
  const date = read.value.assessedAt.slice(0, 10);
  if (config === undefined) return skip("map", `The project map from ${date} is valid; not compared, ${NEEDS_CONFIG}`);
  const changed = mapChanges(read.value, assess(root, config, config.project.stage ?? "mvp"));
  if (changed.length > 0) {
    return warn("map", `The project map from ${date} is out of date: ${changed.join(", ")}.`, "Run peer-ai assess.");
  }
  return ok("map", `The project map from ${date} is up to date`);
}

/** Every work item is valid, named after its id, and on a track the config has. */
export function checkWorkItems(root: string, config: PeerAiConfig | undefined): Check[] {
  const files = readWorkItems(root);
  if (files.length === 0) return [ok("work-items", "No work items yet")];
  const tracks = config?.tracks.map((track) => track.id);
  const checks: Check[] = [];
  for (const { path, item } of files) {
    if (!item.ok) {
      checks.push(
        fail("work-items", `${path} ${item.error}`, "Correct it. An editor that reads its $schema shows each error."),
      );
    } else if (item.value.track !== undefined && tracks !== undefined && !tracks.includes(item.value.track)) {
      checks.push(
        fail(
          "work-items",
          `${path} is for the track "${item.value.track}", which isn't in the config.`,
          `Change its track, or add the track to ${CONFIG_FILE}.`,
        ),
      );
    }
  }
  if (checks.length > 0) return checks;
  return [
    ok("work-items", files.length === 1 ? "1 work item, valid" : `${plural(files.length, "work item")}, all valid`),
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
  // migrate builds the config itself, so it only runs before there is one.
  const fix = existsSync(join(root, CONFIG_FILE))
    ? `Move any changes your project made to it into ${CONFIG_FILE}, then remove it with: git rm -r peer-ai`
    : "Run npx peer-ai migrate. It moves what your project changed into the config, and removes the folder.";
  return [warn("legacy", "The peer-ai/ folder is a copy of the v0 playbook, which Peer AI 1.0 doesn't read.", fix)];
}

export function diagnose(
  root: string,
  nodeVersion: string = process.versions.node,
  today: Date = new Date(),
  options: DiagnoseOptions = {},
): Diagnosis {
  const { check: configCheck, config } = checkConfig(root);
  const needsConfig = (id: string, what: string): Check[] =>
    config === undefined ? [skip(id, `${what} not checked: ${NEEDS_CONFIG}`)] : [];
  const checks = [
    checkNode(nodeVersion),
    configCheck,
    ...(config === undefined ? needsConfig("tracks", "Tracks") : checkTracks(root, config)),
    ...(config === undefined ? needsConfig("references", "Files the config names") : checkReferences(root, config)),
    ...(config === undefined ? needsConfig("tools", "AI tools") : [checkTools(root, config)]),
    ...(config === undefined
      ? needsConfig("render", "What render writes")
      : [checkRendered(root, config, options.skills ?? true)]),
    ...(config === undefined ? needsConfig("delivery", "CI") : [checkDelivery(root, config)]),
    ...(config === undefined ? needsConfig("gate", "The CI gate") : checkGate(root, config)),
    ...(config === undefined
      ? needsConfig("standards", "Rules set aside")
      : checkStandards(config, today.toISOString().slice(0, 10))),
    ...(config === undefined ? [] : [...checkProfiles(config), ...checkEnforcers(root, config)]),
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

export function formatDiagnosis(diagnosis: Diagnosis): string[] {
  const lines = [`Peer AI doctor: ${diagnosis.name}`, "", ...formatChecks(diagnosis.checks)];
  const failures = count(diagnosis.checks, "fail");
  const warnings = count(diagnosis.checks, "warn");
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
