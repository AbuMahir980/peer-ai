// Whether the stack profiles a project lists exist, and whether the tools that enforce their
// automatic rules are set up (RFC 0006): ESLint using Peer AI's settings, and each TypeScript
// part's tsconfig saying what the compiler rules need. An automatic rule nothing enforces is a
// warning, and a failure at production.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, posix } from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import { profile, profileRulesFor, type AppliedRule } from "@peer-ai/standards";
import type { PeerAiConfig } from "@peer-ai/workflow";
import { fail, ok, plural, warn, type Check } from "./checks.ts";
import {
  WORKFLOW_FILE,
  environmentAddresses,
  pipelineRules,
  sameFile,
  unchangedSinceRender,
  workflowFile,
  workflowJobs,
  writtenByRender,
} from "./pipeline.ts";
import { RUFF_FILE, ruffFile } from "./ruff.ts";

const ESLINT_CONFIGS = ["js", "mjs", "cjs", "ts", "mts", "cts"].map((extension) => `eslint.config.${extension}`);
const ESLINT_PACKAGE = "@peer-ai/eslint-config";

const list = (ids: readonly string[]) => ids.join(", ");

/** The profiles the config lists that Peer AI has no rules for yet. */
export function checkProfiles(config: PeerAiConfig): Check[] {
  const listed = config.standards?.profiles ?? [];
  if (listed.length === 0) return [];
  const unknown = listed.filter((id) => profile(id) === undefined);
  if (unknown.length === 0) return [ok("profiles", `Stack profiles: ${list(listed)}`)];
  return [
    warn(
      "profiles",
      `Peer AI has no rules yet for ${list(unknown)}, so ${unknown.length === 1 ? "that profile adds" : "those profiles add"} nothing for now.`,
      "Keep it listed and its rules arrive with the profile, or check the id against the profiles in @peer-ai/standards.",
    ),
  ];
}

/** The automatic profile rules each part of the project gets, leaving out the ones it set aside. */
function automaticRules(config: PeerAiConfig): { track: PeerAiConfig["tracks"][number]; rules: AppliedRule[] }[] {
  const setAside = new Set((config.standards?.exceptions ?? []).map((exception) => exception.rule));
  return config.tracks
    .filter((track) => track.status !== "external")
    .map((track) => ({
      track,
      rules: profileRulesFor({
        listed: config.standards?.profiles ?? [],
        stage: config.project.stage ?? "mvp",
        traits: config.project.traits ?? [],
        overrides: config.standards?.overrides ?? {},
        ...(track.stack === undefined ? {} : { stack: track.stack }),
        ...(track.architecture === undefined ? {} : { architecture: track.architecture }),
      }).filter((rule) => rule.check === "auto" && !setAside.has(rule.id)),
    }));
}

/** The nearest ESLint config for a part, from its folder up to the root: ESLint looks for it the same way. */
function eslintConfigFor(root: string, path: string | undefined): string | undefined {
  for (const folder of upFrom(path)) {
    const found = ESLINT_CONFIGS.find((name) => existsSync(join(root, folder, name)));
    if (found !== undefined) return folder === "." ? found : join(folder, found);
  }
  return undefined;
}

/** The folders from a part's folder up to the root, nearest first. */
function upFrom(path: string | undefined): string[] {
  const folders: string[] = [];
  for (let folder = path === undefined ? "." : normalize(path); ; folder = dirname(folder)) {
    folders.push(folder);
    if (folder === "." || dirname(folder) === folder) break;
  }
  return folders;
}

type Toml = Record<string, unknown>;
const table = (value: unknown): Toml | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Toml) : undefined;
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

/** A Ruff settings file as Ruff reads it: a pyproject.toml's [tool.ruff], or the whole of any other. */
interface RuffSettings {
  /** The file it extends, relative to the root. */
  extend?: string;
  /** Whether it sets select, which replaces the rules the files it extends select. */
  select: boolean;
  /** The codes and prefixes it ignores. */
  ignored: string[];
}

/** The Ruff settings in a file, or undefined when it isn't valid TOML or holds none. */
function readRuff(root: string, file: string): RuffSettings | undefined {
  let data: Toml;
  try {
    data = parseToml(readFileSync(join(root, file), "utf8"));
  } catch {
    return undefined;
  }
  const ruff = file.endsWith("pyproject.toml") ? table(table(data.tool)?.ruff) : data;
  if (ruff === undefined) return undefined;
  const lint = table(ruff.lint) ?? {};
  const extend = ruff.extend;
  return {
    ...(typeof extend === "string" ? { extend: posix.normalize(posix.join(posix.dirname(file), extend)) } : {}),
    select: "select" in lint || "select" in ruff,
    ignored: [lint.ignore, lint["extend-ignore"], ruff.ignore, ruff["extend-ignore"]].flatMap(strings),
  };
}

/**
 * The Ruff settings nearest a part, found as Ruff finds them: in each folder from the part's up,
 * .ruff.toml, then ruff.toml, then a pyproject.toml with a tool.ruff table, such as [tool.ruff.lint].
 */
function ruffConfigFor(root: string, path: string | undefined): string | undefined {
  for (const folder of upFrom(path)) {
    for (const name of [".ruff.toml", "ruff.toml", "pyproject.toml"]) {
      const file = folder === "." ? name : posix.join(folder, name);
      if (!existsSync(join(root, file))) continue;
      if (name !== "pyproject.toml" || readRuff(root, file) !== undefined) return file;
    }
  }
  return undefined;
}

/**
 * The files a Ruff config reads, following each extend in turn: Ruff allows one per file, and the
 * file it names can extend another. Stops at Peer AI's file, at a file it can't read, or at a loop.
 */
function ruffChain(root: string, file: string): { files: string[]; settings: (RuffSettings | undefined)[] } {
  const files: string[] = [];
  const settings: (RuffSettings | undefined)[] = [];
  for (let current: string | undefined = file; current !== undefined && !files.includes(current);) {
    files.push(current);
    if (current === RUFF_FILE || !existsSync(join(root, current))) break;
    const read = readRuff(root, current);
    settings.push(read);
    current = read?.extend;
  }
  return { files, settings };
}

/** The jobs a workflow file defines, or none when it isn't valid YAML. */
function jobsIn(content: string): string[] {
  try {
    const parsed: unknown = parseYaml(content);
    return Object.keys(table(table(parsed)?.jobs) ?? {});
  } catch {
    return [];
  }
}

/** A tsconfig's compiler options, read as TypeScript reads it: comments and trailing commas allowed. */
function readTsconfig(root: string, path: string): { options: Record<string, unknown>; references: string[] } {
  const parsed: unknown = parseJsonc(readFileSync(join(root, path), "utf8"), [], { allowTrailingComma: true });
  const config = (typeof parsed === "object" && parsed !== null ? parsed : {}) as {
    compilerOptions?: Record<string, unknown>;
    references?: { path?: unknown }[];
  };
  const references = (config.references ?? [])
    .map((reference) => reference.path)
    .filter((reference): reference is string => typeof reference === "string")
    .map((reference) => {
      const target = join(dirname(path), reference);
      return target.endsWith(".json") ? target : join(target, "tsconfig.json");
    })
    .filter((target) => existsSync(join(root, target)));
  return { options: config.compilerOptions ?? {}, references };
}

/**
 * The tsconfig files that set a part's compiler options: its own, or, when it only points to
 * others, as a solution file does, the ones it references.
 */
function tsconfigsFor(root: string, path: string, option: string): string[] {
  const { options, references } = readTsconfig(root, path);
  return option in options || references.length === 0 ? [path] : references;
}

/** Each enforcing tool is set up to use Peer AI's settings. */
export function checkEnforcers(root: string, config: PeerAiConfig): Check[] {
  const production = config.project.stage === "production";
  const missing = (message: string, fix: string) =>
    production ? fail("enforcers", message, fix) : warn("enforcers", message, fix);
  const parts = automaticRules(config);
  const checks: Check[] = [];

  // Each part is linted by its nearest ESLint config, so each config is checked for the rules of
  // the parts it covers.
  const byConfig = new Map<string | undefined, Set<string>>();
  for (const { track, rules } of parts) {
    const linted = rules.filter((rule) => rule.enforcer?.tool === "eslint").map((rule) => rule.id);
    if (linted.length === 0) continue;
    const file = eslintConfigFor(root, track.path);
    byConfig.set(file, new Set([...(byConfig.get(file) ?? []), ...linted]));
  }
  const addIt = `import peerAi from "${ESLINT_PACKAGE}", and spread ...peerAi() into the settings it exports, before your own.`;
  for (const [file, ids] of byConfig) {
    const listed = list([...ids]);
    if (file === undefined) {
      checks.push(
        missing(`There's no ESLint config, so nothing enforces ${listed}.`, `Add eslint.config.js: ${addIt}`),
      );
    } else if (!readFileSync(join(root, file), "utf8").includes(ESLINT_PACKAGE)) {
      checks.push(
        missing(`${file} doesn't use Peer AI's settings, so nothing enforces ${listed}.`, `In ${file}, ${addIt}`),
      );
    } else {
      checks.push(ok("enforcers", `${file} uses Peer AI's settings for ${plural(ids.size, "rule")}`));
    }
  }

  // Each Python part is linted by its nearest Ruff settings, which must reach the file render
  // writes through extend, without a select that replaces its rules or an ignore that drops them.
  const byRuffConfig = new Map<string, { file?: string; folder: string; rules: AppliedRule[] }>();
  for (const { track, rules } of parts) {
    const ruffRules = rules.filter((rule) => rule.enforcer?.tool === "ruff");
    if (ruffRules.length === 0) continue;
    const file = ruffConfigFor(root, track.path);
    const folder = track.path ?? ".";
    const key = file ?? `none:${folder}`;
    const entry = byRuffConfig.get(key) ?? { ...(file === undefined ? {} : { file }), folder, rules: [] };
    for (const rule of ruffRules) if (!entry.rules.some((known) => known.id === rule.id)) entry.rules.push(rule);
    byRuffConfig.set(key, entry);
  }
  if (byRuffConfig.size > 0) {
    const current = existsSync(join(root, RUFF_FILE)) ? readFileSync(join(root, RUFF_FILE), "utf8") : undefined;
    if (current === undefined) {
      checks.push(
        missing(`${RUFF_FILE} isn't there, so Ruff has no Peer AI settings to extend.`, "Run peer-ai render."),
      );
    } else if (current !== ruffFile(config)) {
      checks.push(missing(`${RUFF_FILE} is out of date with the config.`, "Run peer-ai render."));
    }
  }
  const extendLine = (from: string) => `extend = "${posix.relative(from, RUFF_FILE)}"`;
  for (const { file, folder, rules } of byRuffConfig.values()) {
    const listed = list(rules.map((rule) => rule.id));
    if (file === undefined) {
      checks.push(
        missing(
          `There are no Ruff settings for ${folder}, so nothing enforces ${listed}.`,
          `Add [tool.ruff] to ${posix.join(folder, "pyproject.toml")}, with ${extendLine(folder)}.`,
        ),
      );
      continue;
    }
    const chain = ruffChain(root, file);
    const unreadable = chain.files.find((_, i) => i < chain.settings.length && chain.settings[i] === undefined);
    if (unreadable !== undefined) {
      checks.push(
        missing(`${unreadable} can't be read as Ruff settings, so Ruff won't run.`, `Fix the TOML in ${unreadable}.`),
      );
      continue;
    }
    if (!chain.files.includes(RUFF_FILE)) {
      const last = chain.files.at(-1) ?? file;
      const table = last.endsWith("pyproject.toml") ? ", under [tool.ruff]," : "";
      const where =
        last === file
          ? `In ${file}${table}`
          : `${file} extends ${last}, which extends nothing further. In ${last}${table}`;
      checks.push(
        missing(
          `${file} doesn't extend Peer AI's Ruff settings, so nothing enforces ${listed}.`,
          `${where} add ${extendLine(posix.dirname(last))}. Ruff allows one extend in each file.`,
        ),
      );
      continue;
    }
    const before = chain.settings.filter((read): read is RuffSettings => read !== undefined);
    const selecting = chain.files.filter((_, i) => before[i]?.select === true);
    if (selecting.length > 0) {
      checks.push(
        missing(
          `${list(selecting)} ${selecting.length === 1 ? "sets" : "set"} select, which replaces Peer AI's Ruff rules instead of adding to them, so nothing enforces ${listed}.`,
          `In ${list(selecting)}, rename select to extend-select.`,
        ),
      );
      continue;
    }
    const ignored = before.flatMap((read) => read.ignored);
    const dropped = rules.filter((rule) => {
      const code = rule.enforcer?.tool === "ruff" ? rule.enforcer.rule : "";
      return ignored.some((entry) => entry === "ALL" || code.startsWith(entry));
    });
    if (dropped.length > 0) {
      checks.push(
        missing(
          `${file}'s Ruff settings ignore the codes of ${list(dropped.map((rule) => rule.id))}, which switches them off without a recorded reason.`,
          "Take those codes out of ignore, and set any rule that doesn't fit aside in standards.exceptions, with the reason.",
        ),
      );
      continue;
    }
    checks.push(ok("enforcers", `${file} extends Peer AI's Ruff settings for ${plural(rules.length, "rule")}`));
  }

  // The pipeline's checks run from the workflow render writes.
  const pipeline = pipelineRules(config);
  const existing = existsSync(join(root, WORKFLOW_FILE)) ? readFileSync(join(root, WORKFLOW_FILE), "utf8") : undefined;
  const expected = workflowFile(config);
  if (expected === undefined) {
    if (existing !== undefined && writtenByRender(existing)) {
      checks.push(
        warn(
          "enforcers",
          `${WORKFLOW_FILE} is still there, but the config asks for none of its checks, so render no longer updates it.`,
          "Delete it, or list the github-actions profile in standards.profiles.",
        ),
      );
    }
  } else {
    const ids = list(pipeline.filter((rule) => rule.check === "auto").map((rule) => rule.id));
    if (existing === undefined) {
      checks.push(missing(`${WORKFLOW_FILE} isn't there, so the pipeline doesn't run ${ids}.`, "Run peer-ai render."));
    } else if (unchangedSinceRender(existing)) {
      if (sameFile(existing, expected)) checks.push(ok("enforcers", `${WORKFLOW_FILE} runs ${ids}`));
      else checks.push(missing(`${WORKFLOW_FILE} is out of date with the config.`, "Run peer-ai render."));
    } else {
      // Changed by hand: the jobs Peer AI's would have must still be there, under their names.
      const found = jobsIn(existing);
      const gone = workflowJobs(config).filter((job) => !found.includes(job));
      checks.push(
        gone.length === 0
          ? warn(
              "enforcers",
              `${WORKFLOW_FILE} was changed by hand. It still has every job, but doctor can't tell whether each still runs its check.`,
              "Keep it up to date with the config yourself, or delete it and run peer-ai render to go back to Peer AI's.",
            )
          : missing(
              `${WORKFLOW_FILE} was changed by hand, and no longer has the ${gone.join(", ")} ${gone.length === 1 ? "job" : "jobs"}.`,
              "Add them back, or delete the file and run peer-ai render to go back to Peer AI's.",
            ),
      );
    }
    const unusable = environmentAddresses(config).unusable;
    if (unusable.length > 0 && pipeline.some((rule) => rule.id === "GHA-06" || rule.id === "GHA-07")) {
      checks.push(
        warn(
          "enforcers",
          `The pipeline leaves out ${list(unusable.map((environment) => `${environment.id} (${environment.url})`))}: an address must be a full http or https URL, without a user name or password.`,
          "Correct the url in the environments of peer-ai.config.json.",
        ),
      );
    }
  }

  for (const { track, rules } of parts) {
    const compiled = rules.filter((rule) => rule.enforcer?.tool === "typescript");
    if (compiled.length === 0) continue;
    const path = [track.path, undefined]
      .map((folder) => (folder === undefined ? "tsconfig.json" : join(folder, "tsconfig.json")))
      .find((candidate) => existsSync(join(root, candidate)));
    if (path === undefined) {
      checks.push(
        missing(
          `${track.id} has no tsconfig.json, so the compiler doesn't enforce ${list(compiled.map((r) => r.id))}.`,
          `Add a tsconfig.json to ${track.path ?? "the repository"} that turns on what they need.`,
        ),
      );
      continue;
    }
    for (const rule of compiled) {
      if (rule.enforcer?.tool !== "typescript") continue;
      const { option, value } = rule.enforcer;
      for (const file of tsconfigsFor(root, path, option)) {
        const set = readTsconfig(root, file).options[option];
        const wanted = JSON.stringify(value);
        if (set === value) {
          checks.push(ok("enforcers", `${file} sets ${option} to ${wanted} (${rule.id})`));
          continue;
        }
        checks.push(
          missing(
            set === undefined
              ? `${file} doesn't say "${option}": ${wanted}, which ${rule.id} needs.`
              : `${file} sets "${option}" to ${JSON.stringify(set)}, but ${rule.id} needs ${wanted}.`,
            `Set "${option}": ${wanted} in the compilerOptions of ${file}, in the file itself, so it holds whatever it extends.`,
          ),
        );
      }
    }
  }
  return checks;
}
