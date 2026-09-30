// The ESLint settings for a project's stack profiles (RFC 0006). For each part of the project,
// the automatic rules its profiles enforce with ESLint, at the project's stage, with its traits,
// its architecture and the values it changed. Rules the project set aside are left out.
//
// The plugins are peer dependencies: ESLint refuses two copies of one plugin, and a project that
// registers typescript-eslint itself must share its copy with these settings.

import { existsSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
import { profileRulesFor, type AppliedRule } from "@peer-ai/standards";
import { CONFIG_FILE, readConfig, type PeerAiConfig } from "@peer-ai/workflow";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { ESLint, Linter } from "eslint";
import tseslint from "typescript-eslint";

/**
 * The packages Peer AI's rules come from, by the prefix of their rule names. typescript-eslint is
 * always needed, for its parser; the others are optional, and loaded only when a profile's rule
 * needs one, so a project installs only the plugins its profiles use.
 */
const PLUGIN_PACKAGES: Record<string, string> = {
  "react-hooks": "eslint-plugin-react-hooks",
  "react-x": "eslint-plugin-react-x",
  "react-dom": "eslint-plugin-react-dom",
  "jsx-a11y": "eslint-plugin-jsx-a11y-x",
  "@next/next": "@next/eslint-plugin-next",
};

const load = createRequire(import.meta.url);
const loaded = new Map<string, ESLint.Plugin>([["@typescript-eslint", tseslint.plugin]]);

/** The plugin for a rule prefix, loaded from the project's own copy. */
function plugin(prefix: string, rule: string): ESLint.Plugin {
  const known = loaded.get(prefix);
  if (known !== undefined) return known;
  const name = PLUGIN_PACKAGES[prefix];
  if (name === undefined) throw new Error(`Peer AI has no ESLint plugin for ${rule}.`);
  let module: { default?: ESLint.Plugin } & ESLint.Plugin;
  try {
    // Found as import finds it, since some plugins export only for import, then loaded at once.
    module = load(fileURLToPath(import.meta.resolve(name))) as { default?: ESLint.Plugin } & ESLint.Plugin;
  } catch {
    throw new Error(
      `${rule} needs the ESLint plugin ${name}. Install it beside ESLint, such as npm install --save-dev ${name}.`,
    );
  }
  const found = module.default ?? module;
  loaded.set(prefix, found);
  return found;
}

const TYPESCRIPT_FILES = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];
const SCRIPT_FILES = [...TYPESCRIPT_FILES, "**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"];

type Track = PeerAiConfig["tracks"][number];

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
    if (prefix !== undefined) plugins[prefix] = plugin(prefix, name);
  }
  return plugins;
}

/** A part's folder relative to the root, without ./ or a trailing slash: "" for the root itself. */
const folder = (path: string | undefined) =>
  path === undefined
    ? ""
    : normalize(path)
        .replace(/^\.\/?$/, "")
        .replace(/\/$/, "");

const within = (path: string | undefined, globs: readonly string[]) => {
  const base = folder(path);
  return globs.map((glob) => (base === "" ? glob : `${base}/${glob}`));
};

/** The other parts' folders inside this part's folder, which their own settings cover. */
function nestedIn(config: PeerAiConfig, track: Track): string[] {
  const own = folder(track.path);
  return config.tracks
    .filter((other) => other !== track && other.status !== "external")
    .map((other) => folder(other.path))
    .filter((path) => path !== own && path !== "" && (own === "" || path.startsWith(`${own}/`)))
    .map((path) => `${path}/**`);
}

/** The automatic rules a part gets from its profiles, leaving out the ones the project set aside. */
function rulesForPart(config: PeerAiConfig, track: Track): AppliedRule[] {
  const setAside = new Set((config.standards?.exceptions ?? []).map((exception) => exception.rule));
  return profileRulesFor({
    listed: config.standards?.profiles ?? [],
    stage: config.project.stage ?? "mvp",
    traits: config.project.traits ?? [],
    overrides: config.standards?.overrides ?? {},
    ...(track.stack === undefined ? {} : { stack: track.stack }),
    ...(track.architecture === undefined ? {} : { architecture: track.architecture }),
  }).filter((rule) => !setAside.has(rule.id));
}

/**
 * The ESLint settings for a project: for each part, a block per set of files its rules cover. Each
 * block's files are relative to the project's root, wherever the ESLint config lives, and leave out
 * the parts nested inside it, which get their own settings.
 */
export function configFor(config: PeerAiConfig, root: string): Linter.Config[] {
  const blocks: Linter.Config[] = [];
  for (const track of config.tracks) {
    if (track.status === "external") continue;
    const ignores = nestedIn(config, track);
    for (const group of eslintRules(rulesForPart(config, track))) {
      // A group for its own files is named after them, such as peer-ai/web/**/*.tsx.
      const ownFiles = group.files !== SCRIPT_FILES && group.files !== TYPESCRIPT_FILES;
      const name = [`peer-ai/${track.id}`, group.typed ? "/typed" : "", ownFiles ? `/${group.files.join(",")}` : ""];
      blocks.push({
        name: name.join(""),
        basePath: root,
        files: within(track.path, group.files),
        ...(ignores.length === 0 ? {} : { ignores }),
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

/** The nearest folder, from `start` up, that holds peer-ai.config.json, or `start` when none does. */
export function findRoot(start: string): string {
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    if (existsSync(join(dir, CONFIG_FILE))) return dir;
    if (dirname(dir) === dir) return resolve(start);
  }
}

/**
 * Peer AI's ESLint settings for the project, read from its peer-ai.config.json, found from the
 * folder ESLint runs in, or up. Spread them into eslint.config.js, before your own settings:
 *
 *     import peerAi from "@peer-ai/eslint-config";
 *     export default [...peerAi(), ...yourOwnSettings];
 */
export default function peerAi(options: { root?: string } = {}): Linter.Config[] {
  const root = options.root ?? findRoot(process.cwd());
  const { config, errors } = readConfig(root);
  if (errors !== undefined) throw new Error(`${CONFIG_FILE} isn't valid:\n- ${errors.join("\n- ")}`);
  if (config === undefined) throw new Error(`There's no ${CONFIG_FILE} in ${root} or above it. Run npx peer-ai init.`);
  return configFor(config, root);
}
