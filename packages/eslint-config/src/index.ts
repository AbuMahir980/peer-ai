// The ESLint settings for a project's stack profiles (RFC 0006). For each part of the project,
// the automatic rules its profiles enforce with ESLint, at the project's stage, with its traits,
// its architecture and the values it changed. Rules the project set aside are left out.
//
// Every rule runs under a name Peer AI owns, such as peer-ai-jsx-a11y/alt-text or peer-ai/max-depth.
// ESLint refuses two plugins under one name, and a project often registers the same plugins itself,
// sometimes a different copy or a different package; and a project's own settings for a rule would
// replace Peer AI's. Under its own names, Peer AI's rules sit beside the project's, whatever it has.

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { profileRulesFor, type AppliedRule } from "peer-ai-standards";
import { CONFIG_FILE, readConfig, type PeerAiConfig } from "peer-ai-workflow";
import type { ESLint, Linter, Rule } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";
import tseslint from "typescript-eslint";

/**
 * Where each plugin's rules come from, by the prefix of their names, and the name Peer AI runs them
 * under. ESLint's own rules have no prefix. The optional plugins are loaded only when a listed
 * profile's rule needs one, so a project installs only the plugins its profiles use.
 */
const SOURCES: Record<string, { namespace: string; package?: string }> = {
  "": { namespace: "peer-ai" },
  "@typescript-eslint": { namespace: "peer-ai-typescript" },
  "react-hooks": { namespace: "peer-ai-react-hooks", package: "eslint-plugin-react-hooks" },
  "react-dom": { namespace: "peer-ai-react-dom", package: "eslint-plugin-react-dom" },
  "jsx-a11y": { namespace: "peer-ai-jsx-a11y", package: "eslint-plugin-jsx-a11y-x" },
  "@next/next": { namespace: "peer-ai-next", package: "@next/eslint-plugin-next" },
};

/** Rules whose options are a list of entries, so several of Peer AI's rules can share one. */
const LISTS = new Set(["no-restricted-syntax"]);

const TYPESCRIPT_FILES = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];
const SCRIPT_FILES = [...TYPESCRIPT_FILES, "**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"];

type Track = PeerAiConfig["tracks"][number];

/** The plugin an ESLint rule belongs to: `@typescript-eslint/no-explicit-any` → `@typescript-eslint`. */
export function pluginOf(rule: string): string | undefined {
  const slash = rule.lastIndexOf("/");
  return slash === -1 ? undefined : rule.slice(0, slash);
}

/** The name Peer AI runs a rule under: `jsx-a11y/alt-text` → `peer-ai-jsx-a11y/alt-text`. */
export function eslintName(rule: string): string {
  const prefix = pluginOf(rule) ?? "";
  const source = SOURCES[prefix];
  if (source === undefined) throw new Error(`Peer AI has no ESLint plugin for ${rule}.`);
  return `${source.namespace}/${prefix === "" ? rule : rule.slice(prefix.length + 1)}`;
}

const load = createRequire(import.meta.url);
// ESLint's own rules, to run under Peer AI's name. ESLint marks this map deprecated without a
// replacement; typescript-eslint builds its own versions of core rules on it too.
// eslint-disable-next-line @typescript-eslint/no-deprecated -- the only way to reach ESLint's own rules
const coreRules: Record<string, Rule.RuleModule> = Object.fromEntries(builtinRules);
const loaded = new Map<string, ESLint.Plugin>([
  ["", { meta: { name: "peer-ai" }, rules: coreRules }],
  ["@typescript-eslint", tseslint.plugin],
]);

/** Whether an error means the package isn't installed, rather than that it failed to load. */
const notInstalled = (error: unknown) =>
  ["ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND", "ERR_PACKAGE_PATH_NOT_EXPORTED"].includes(
    (error as NodeJS.ErrnoException).code ?? "",
  );

/** The plugin behind a rule prefix, loaded from the project's own copy. */
function plugin(prefix: string, rule: string): ESLint.Plugin {
  const known = loaded.get(prefix);
  if (known !== undefined) return known;
  const name = SOURCES[prefix]?.package;
  if (name === undefined) throw new Error(`Peer AI has no ESLint plugin for ${rule}.`);
  let path: string;
  try {
    // Found as import finds it, since some plugins export only for import, then loaded at once.
    path = fileURLToPath(import.meta.resolve(name));
  } catch (error) {
    if (!notInstalled(error)) throw error;
    throw new Error(
      `${rule} needs the ESLint plugin ${name}. Install it beside ESLint, such as npm install --save-dev ${name}.`,
      { cause: error },
    );
  }
  let module: { default?: ESLint.Plugin } & ESLint.Plugin;
  try {
    module = load(path) as { default?: ESLint.Plugin } & ESLint.Plugin;
  } catch (error) {
    throw new Error(`The ESLint plugin ${name} is installed, but it didn't load.`, { cause: error });
  }
  const found = module.default ?? module;
  loaded.set(prefix, found);
  return found;
}

/** A set of rules for the same files, in the order the profiles give them, under Peer AI's names. */
export interface RuleGroup {
  files: string[];
  ignores: string[];
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
    const { rule: upstream, options = [], typed = false, files, ignores = [] } = rule.enforcer;
    const scope = files ?? (typed ? TYPESCRIPT_FILES : SCRIPT_FILES);
    const key = JSON.stringify([scope, ignores, typed]);
    const group = groups.get(key) ?? { files: scope, ignores, typed, rules: {} };
    const name = eslintName(upstream);
    const existing = group.rules[name];
    if (existing !== undefined && !LISTS.has(upstream)) {
      throw new Error(`${rule.id} sets ${upstream} for files another of its rules already covers.`);
    }
    group.rules[name] = Array.isArray(existing) ? [...existing, ...options] : ["error", ...options];
    groups.set(key, group);
  }
  return [...groups.values()];
}

function pluginsFor(names: readonly string[]): Record<string, ESLint.Plugin> {
  const plugins: Record<string, ESLint.Plugin> = {};
  for (const name of names) {
    const namespace = pluginOf(name) ?? "";
    const prefix = Object.keys(SOURCES).find((key) => SOURCES[key]?.namespace === namespace);
    if (prefix !== undefined) plugins[namespace] = plugin(prefix, name);
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
    const nested = nestedIn(config, track);
    for (const group of eslintRules(rulesForPart(config, track))) {
      // A group for its own files is named after them, such as peer-ai/web/**/*.tsx.
      const ownFiles = group.files !== SCRIPT_FILES && group.files !== TYPESCRIPT_FILES;
      const name = [`peer-ai/${track.id}`, group.typed ? "/typed" : "", ownFiles ? `/${group.files.join(",")}` : ""];
      const ignores = [...nested, ...within(track.path, group.ignores)];
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
 *     import peerAi from "peer-ai-eslint-config";
 *     export default [...peerAi(), ...yourOwnSettings];
 */
export default function peerAi(options: { root?: string } = {}): Linter.Config[] {
  const root = options.root ?? findRoot(process.cwd());
  const { config, errors } = readConfig(root);
  if (errors !== undefined) throw new Error(`${CONFIG_FILE} isn't valid:\n- ${errors.join("\n- ")}`);
  if (config === undefined) throw new Error(`There's no ${CONFIG_FILE} in ${root} or above it. Run npx peer-ai init.`);
  return configFor(config, root);
}
