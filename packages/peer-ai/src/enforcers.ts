// Whether the stack profiles a project lists exist, and whether the tools that enforce their
// automatic rules are set up (RFC 0006): ESLint using Peer AI's settings, and each TypeScript
// part's tsconfig saying what the compiler rules need. An automatic rule nothing enforces is a
// warning, and a failure at production.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { profile, profileRulesFor, type AppliedRule } from "@peer-ai/standards";
import type { PeerAiConfig } from "@peer-ai/workflow";
import { fail, ok, plural, warn, type Check } from "./checks.ts";

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
  const folders: string[] = [];
  for (let folder = path === undefined ? "." : normalize(path); ; folder = dirname(folder)) {
    folders.push(folder);
    if (folder === "." || dirname(folder) === folder) break;
  }
  for (const folder of folders) {
    const found = ESLINT_CONFIGS.find((name) => existsSync(join(root, folder, name)));
    if (found !== undefined) return folder === "." ? found : join(folder, found);
  }
  return undefined;
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
