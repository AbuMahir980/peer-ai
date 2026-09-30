// The ESLint settings for a project's stack profiles (RFC 0006). For each part of the project,
// the automatic rules its profiles enforce with ESLint, at the project's stage, with its traits,
// its architecture and the values it changed. Rules the project set aside are left out.

import { normalize } from "node:path";
import { profileRulesFor, type AppliedRule } from "@peer-ai/standards";
import { CONFIG_FILE, readConfig, type PeerAiConfig } from "@peer-ai/workflow";
import type { ESLint, Linter } from "eslint";
import tseslint from "typescript-eslint";

/** The plugins Peer AI's rules come from, by the prefix of their rule names. */
const PLUGINS: Record<string, ESLint.Plugin> = { "@typescript-eslint": tseslint.plugin };

const TYPESCRIPT_FILES = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];
const SCRIPT_FILES = [...TYPESCRIPT_FILES, "**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"];

/** The plugin an ESLint rule belongs to: `@typescript-eslint/no-explicit-any` → `@typescript-eslint`. */
export function pluginOf(rule: string): string | undefined {
  const slash = rule.lastIndexOf("/");
  return slash === -1 ? undefined : rule.slice(0, slash);
}

/** ESLint's settings for these rules, each an error: rules that need types apart from the rest. */
export function eslintRules(rules: readonly AppliedRule[]): { plain: Linter.RulesRecord; typed: Linter.RulesRecord } {
  const plain: Linter.RulesRecord = {};
  const typed: Linter.RulesRecord = {};
  for (const rule of rules) {
    if (rule.check !== "auto" || rule.enforcer?.tool !== "eslint") continue;
    const { rule: name, options = [], typed: needsTypes = false } = rule.enforcer;
    (needsTypes ? typed : plain)[name] = ["error", ...options];
  }
  return { plain, typed };
}

function pluginsFor(names: readonly string[]): Record<string, ESLint.Plugin> {
  const plugins: Record<string, ESLint.Plugin> = {};
  for (const name of names) {
    const prefix = pluginOf(name);
    if (prefix === undefined) continue;
    const plugin = PLUGINS[prefix];
    if (plugin === undefined) throw new Error(`Peer AI has no ESLint plugin for ${name}.`);
    plugins[prefix] = plugin;
  }
  return plugins;
}

const within = (path: string | undefined, globs: readonly string[]) => {
  const base =
    path === undefined
      ? ""
      : normalize(path)
          .replace(/^\.\/?$/, "")
          .replace(/\/$/, "");
  return globs.map((glob) => (base === "" ? glob : `${base}/${glob}`));
};

/** The ESLint settings for a project: one block per part with rules, and one for its typed rules. */
export function configFor(config: PeerAiConfig, root: string): Linter.Config[] {
  const listed = config.standards?.profiles ?? [];
  if (listed.length === 0) return [];
  const setAside = new Set((config.standards?.exceptions ?? []).map((exception) => exception.rule));
  const blocks: Linter.Config[] = [];
  for (const track of config.tracks) {
    if (track.status === "external") continue;
    const rules = profileRulesFor({
      listed,
      stage: config.project.stage ?? "mvp",
      traits: config.project.traits ?? [],
      overrides: config.standards?.overrides ?? {},
      ...(track.stack === undefined ? {} : { stack: track.stack }),
      ...(track.architecture === undefined ? {} : { architecture: track.architecture }),
    }).filter((rule) => !setAside.has(rule.id));
    const { plain, typed } = eslintRules(rules);
    const plugins = pluginsFor([...Object.keys(plain), ...Object.keys(typed)]);
    if (Object.keys(plain).length > 0) {
      blocks.push({
        name: `peer-ai/${track.id}`,
        files: within(track.path, SCRIPT_FILES),
        languageOptions: { parser: tseslint.parser },
        plugins,
        rules: plain,
      });
    }
    if (Object.keys(typed).length > 0) {
      blocks.push({
        name: `peer-ai/${track.id}/typed`,
        files: within(track.path, TYPESCRIPT_FILES),
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: { projectService: true, tsconfigRootDir: root },
        },
        plugins,
        rules: typed,
      });
    }
  }
  return blocks;
}

/**
 * Peer AI's ESLint settings for the project at `root`, read from its peer-ai.config.json. Spread
 * them into eslint.config.js, before the project's own settings:
 *
 *     import peerAi from "@peer-ai/eslint-config";
 *     export default [...peerAi(), ...yourOwnSettings];
 */
export default function peerAi(options: { root?: string } = {}): Linter.Config[] {
  const root = options.root ?? process.cwd();
  const { config, errors } = readConfig(root);
  if (errors !== undefined) throw new Error(`${CONFIG_FILE} isn't valid:\n- ${errors.join("\n- ")}`);
  if (config === undefined) throw new Error(`There's no ${CONFIG_FILE} in ${root}. Run npx peer-ai init.`);
  return configFor(config, root);
}
