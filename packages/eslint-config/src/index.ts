// The ESLint settings for a project's stack profiles (RFC 0006). For each part of the project,
// the automatic rules its profiles enforce with ESLint, at the project's stage, with its traits,
// its architecture and the values it changed. Rules the project set aside are left out.

import { normalize } from "node:path";
import { profileRulesFor, type AppliedRule } from "@peer-ai/standards";
import { CONFIG_FILE, readConfig, type PeerAiConfig } from "@peer-ai/workflow";
import nextPlugin from "@next/eslint-plugin-next";
import type { ESLint, Linter } from "eslint";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import reactDom from "eslint-plugin-react-dom";
import reactHooks from "eslint-plugin-react-hooks";
import reactX from "eslint-plugin-react-x";
import tseslint from "typescript-eslint";

/** The plugins Peer AI's rules come from, by the prefix of their rule names. */
const PLUGINS: Record<string, ESLint.Plugin> = {
  "@typescript-eslint": tseslint.plugin,
  "react-hooks": reactHooks as ESLint.Plugin,
  "react-x": reactX as ESLint.Plugin,
  "react-dom": reactDom as ESLint.Plugin,
  "jsx-a11y": jsxA11y as ESLint.Plugin,
  "@next/next": nextPlugin as ESLint.Plugin,
};

const TYPESCRIPT_FILES = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];
const SCRIPT_FILES = [...TYPESCRIPT_FILES, "**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"];

/** The plugin an ESLint rule belongs to: `@typescript-eslint/no-explicit-any` → `@typescript-eslint`. */
export function pluginOf(rule: string): string | undefined {
  const slash = rule.lastIndexOf("/");
  return slash === -1 ? undefined : rule.slice(0, slash);
}

/** A set of rules for the same files, in the order the profiles give them. */
export interface RuleGroup {
  files: string[];
  typed: boolean;
  rules: Linter.RulesRecord;
}

/**
 * ESLint's settings for these rules, each an error, grouped by the files they apply to: rules that
 * need types run on TypeScript files only, and a rule can name its own files. Groups keep the
 * profiles' order, so where a later profile sets the same rule for some files, it wins there.
 */
export function eslintRules(rules: readonly AppliedRule[]): RuleGroup[] {
  const groups = new Map<string, RuleGroup>();
  for (const rule of rules) {
    if (rule.check !== "auto" || rule.enforcer?.tool !== "eslint") continue;
    const { rule: name, options = [], typed = false, files } = rule.enforcer;
    const scope = files ?? (typed ? TYPESCRIPT_FILES : SCRIPT_FILES);
    const key = JSON.stringify([scope, typed]);
    const group = groups.get(key) ?? { files: scope, typed, rules: {} };
    if (name in group.rules) throw new Error(`${rule.id} sets ${name} for files another of its rules already covers.`);
    group.rules[name] = ["error", ...options];
    groups.set(key, group);
  }
  return [...groups.values()];
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
    for (const group of eslintRules(rules)) {
      // A group for its own files is named after them, such as peer-ai/web/**/*.tsx,**/*.jsx.
      const ownFiles = group.files !== SCRIPT_FILES && group.files !== TYPESCRIPT_FILES;
      const name = [`peer-ai/${track.id}`, group.typed ? "/typed" : "", ownFiles ? `/${group.files.join(",")}` : ""];
      blocks.push({
        name: name.join(""),
        files: within(track.path, group.files),
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: {
            ecmaFeatures: { jsx: true },
            ...(group.typed ? { projectService: true, tsconfigRootDir: root } : {}),
          },
        },
        plugins: pluginsFor(Object.keys(group.rules)),
        rules: group.rules,
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
