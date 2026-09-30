// Whether the stack profiles a project lists exist, and whether the tools that enforce their
// automatic rules are set up (RFC 0006): ESLint using Peer AI's settings, and each TypeScript
// part's tsconfig saying what the compiler rules need. An automatic rule nothing enforces is a
// warning, and a failure at production.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

/** Each enforcing tool is set up to use Peer AI's settings. */
export function checkEnforcers(root: string, config: PeerAiConfig): Check[] {
  const production = config.project.stage === "production";
  const missing = (message: string, fix: string) =>
    production ? fail("enforcers", message, fix) : warn("enforcers", message, fix);
  const parts = automaticRules(config);
  const checks: Check[] = [];

  const lintIds = [
    ...new Set(parts.flatMap(({ rules }) => rules.filter((r) => r.enforcer?.tool === "eslint").map((r) => r.id))),
  ];
  if (lintIds.length > 0) {
    const file = ESLINT_CONFIGS.find((name) => existsSync(join(root, name)));
    const addIt = `import peerAi from "${ESLINT_PACKAGE}", and spread ...peerAi() into the settings it exports, before your own.`;
    if (file === undefined) {
      checks.push(
        missing(`There's no ESLint config, so nothing enforces ${list(lintIds)}.`, `Add eslint.config.js: ${addIt}`),
      );
    } else if (!readFileSync(join(root, file), "utf8").includes(ESLINT_PACKAGE)) {
      checks.push(
        missing(
          `${file} doesn't use Peer AI's settings, so nothing enforces ${list(lintIds)}.`,
          `In ${file}, ${addIt}`,
        ),
      );
    } else {
      checks.push(ok("enforcers", `ESLint uses Peer AI's settings for ${plural(lintIds.length, "rule")}`));
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
    const text = readFileSync(join(root, path), "utf8");
    for (const rule of compiled) {
      if (rule.enforcer?.tool !== "typescript") continue;
      const { option, value } = rule.enforcer;
      const wanted = JSON.stringify(value);
      const set = new RegExp(`"${option}"\\s*:\\s*([^,}\\s]+)`).exec(text)?.[1];
      if (set === wanted) {
        checks.push(ok("enforcers", `${path} sets ${option} to ${wanted} (${rule.id})`));
      } else {
        checks.push(
          missing(
            set === undefined
              ? `${path} doesn't say "${option}": ${wanted}, which ${rule.id} needs.`
              : `${path} sets "${option}" to ${set}, but ${rule.id} needs ${wanted}.`,
            `Set "${option}": ${wanted} in the compilerOptions of ${path}, in the file itself, so it holds whatever it extends.`,
          ),
        );
      }
    }
  }
  return checks;
}
