// Whether the stack profiles a project lists exist, and whether the tools that enforce their
// automatic rules are set up (RFC 0006): ESLint using Peer AI's settings, and each TypeScript
// part's tsconfig saying what the compiler rules need. An automatic rule nothing enforces is a
// warning, and a failure at production.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { profile, profileRulesFor, type AppliedRule } from "@peer-ai/standards";
import type { PeerAiConfig } from "@peer-ai/workflow";
import { fail, ok, plural, warn, type Check } from "./checks.ts";
import { WORKFLOW_FILE, pipelineRules, unchangedSinceRender, workflowFile } from "./pipeline.ts";
import { RUFF_FILE } from "./ruff.ts";

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

/**
 * The Ruff settings nearest a part, found as Ruff finds them: in each folder from the part's up,
 * .ruff.toml, then ruff.toml, then a pyproject.toml with a [tool.ruff] table.
 */
function ruffConfigFor(root: string, path: string | undefined): string | undefined {
  for (const folder of upFrom(path)) {
    for (const name of [".ruff.toml", "ruff.toml", "pyproject.toml"]) {
      const file = folder === "." ? name : join(folder, name);
      if (!existsSync(join(root, file))) continue;
      if (name !== "pyproject.toml" || /^\[tool\.ruff\]/m.test(readFileSync(join(root, file), "utf8"))) return file;
    }
  }
  return undefined;
}

/** The file a Ruff config extends, relative to the root, if it extends one. */
function ruffExtends(root: string, file: string): string | undefined {
  const target = /^\s*extend\s*=\s*["']([^"']+)["']/m.exec(readFileSync(join(root, file), "utf8"))?.[1];
  return target === undefined ? undefined : normalize(join(dirname(file), target));
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

  // Each Python part is linted by its nearest Ruff settings, which must extend the file render
  // writes. The file itself must be there: render writes it.
  const byRuffConfig = new Map<string | undefined, { folder: string; ids: Set<string> }>();
  for (const { track, rules } of parts) {
    const ruffIds = rules.filter((rule) => rule.enforcer?.tool === "ruff").map((rule) => rule.id);
    if (ruffIds.length === 0) continue;
    const file = ruffConfigFor(root, track.path);
    const entry = byRuffConfig.get(file) ?? { folder: track.path ?? ".", ids: new Set<string>() };
    for (const id of ruffIds) entry.ids.add(id);
    byRuffConfig.set(file, entry);
  }
  if (byRuffConfig.size > 0 && !existsSync(join(root, RUFF_FILE))) {
    checks.push(missing(`${RUFF_FILE} isn't there, so Ruff has no Peer AI settings to extend.`, "Run peer-ai render."));
  }
  for (const [file, { folder, ids }] of byRuffConfig) {
    const listed = list([...ids]);
    const from = file === undefined ? folder : dirname(file);
    const line = `extend = "${relative(from, RUFF_FILE)}"`;
    if (file === undefined) {
      checks.push(
        missing(
          `There are no Ruff settings for ${folder}, so nothing enforces ${listed}.`,
          `Add [tool.ruff] to ${join(folder, "pyproject.toml")}, with ${line}.`,
        ),
      );
    } else if (ruffExtends(root, file) !== normalize(RUFF_FILE)) {
      checks.push(
        missing(
          `${file} doesn't extend Peer AI's Ruff settings, so nothing enforces ${listed}.`,
          `In ${file}${file.endsWith("pyproject.toml") ? ", under [tool.ruff]," : ""} add ${line}.`,
        ),
      );
    } else {
      checks.push(ok("enforcers", `${file} extends Peer AI's Ruff settings for ${plural(ids.size, "rule")}`));
    }
  }

  // The pipeline's checks run from the workflow render writes.
  const pipeline = pipelineRules(config).filter((rule) => rule.check === "auto");
  if (pipeline.length > 0) {
    const ids = list(pipeline.map((rule) => rule.id));
    const existing = existsSync(join(root, WORKFLOW_FILE))
      ? readFileSync(join(root, WORKFLOW_FILE), "utf8")
      : undefined;
    if (existing === undefined) {
      checks.push(missing(`${WORKFLOW_FILE} isn't there, so the pipeline doesn't run ${ids}.`, "Run peer-ai render."));
    } else if (!unchangedSinceRender(existing)) {
      checks.push(
        warn(
          "enforcers",
          `${WORKFLOW_FILE} was changed by hand, so render no longer updates it, and doctor can't tell whether it still runs ${ids}.`,
          "Delete it and run peer-ai render to go back to Peer AI's, or keep it up to date with the config yourself.",
        ),
      );
    } else if (existing !== workflowFile(config)) {
      checks.push(missing(`${WORKFLOW_FILE} is out of date with the config.`, "Run peer-ai render."));
    } else {
      checks.push(ok("enforcers", `${WORKFLOW_FILE} runs ${plural(pipeline.length, "check")}: ${ids}`));
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
