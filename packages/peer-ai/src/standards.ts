// Which standards govern a file: Peer AI's rules for what the file is, the language it's in and the
// kind of part it belongs to, at the project's stage and with its traits, and the project's own
// documents and rules. An agent asks for these before editing a file, instead of loading every rule
// on every turn, and gets each rule in brief, with the full text of the ones it asks for (RFC 0012).

import { isAbsolute, relative } from "node:path";
import { PROFILES, profileRulesFor, rulesFor, type Rule, type Value } from "peer-ai-standards";
import type { DomainId, PeerAiConfig } from "peer-ai-workflow";
import { SCHEMA_FILE, TEST_FILE } from "./assess.ts";
import { whyUnenforced, type Unenforced } from "./enforcers.ts";

type ConfigTrack = PeerAiConfig["tracks"][number];

/**
 * A rule as an agent needs it while editing: what to do, and the question it will be reviewed by.
 * A stack profile's rule also names the core rule it carries out, and its value for this project.
 */
export type RuleForFile = Pick<Rule, "id" | "title" | "rule" | "why" | "ask" | "check" | "severity"> & {
  carries?: string;
  value?: Value;
} & Enforcement;

/** A rule in brief: what an agent follows while editing. A stack profile's rule keeps its value. */
export type RuleInBrief = Pick<Rule, "id" | "title" | "severity"> & { value?: Value } & Enforcement;

/**
 * For a rule a tool checks: whether that tool enforces it for this file, as doctor finds it, and
 * why not when it doesn't. A review counts the tool as evidence only when it does (RFC 0019).
 */
interface Enforcement {
  enforced?: boolean;
  notEnforced?: string;
}

/** What a file is, from its path: it decides which domains' rules apply to it (RFC 0012). */
export type FileKind =
  | "ci-pipeline"
  | "build"
  | "infrastructure"
  | "dependencies"
  | "data-schema"
  | "test"
  | "document"
  | "tool-settings"
  | "source";

export interface StandardsForFile {
  file: string;
  /** What the file is, which decides the domains of the rules it gets. */
  kind: FileKind;
  stage: "prototype" | "mvp" | "production";
  /** Peer AI's rules that apply to this file: in brief, or in full for the ids asked for. */
  peerAiRules: RuleInBrief[] | RuleForFile[];
  /** Ids asked for in full that don't apply to this file. */
  notApplicable?: string[];
  /** Rules the project has set aside, with its reasons. */
  setAside: { rule: string; reason: string }[];
  track?: { id: string; kind: ConfigTrack["kind"]; path?: string };
  /** Peer AI's core principles apply unless the config turns them off. */
  core: boolean;
  profiles: string[];
  /** The project's own documents that govern this file, in the order the config lists them. */
  documents: { path: string; role: "standard" | "addendum" | "checklist" }[];
  rules: { path: string; description?: string }[];
  /** Which side wins a conflict between the project's documents and the core principles. */
  precedence: "project" | "core";
}

const normalise = (path: string) => path.replace(/^\.\//, "").replace(/\/+$/, "");

/** The track whose folder holds the file most closely, or the track at the repository root. */
export function trackFor(config: PeerAiConfig, file: string): ConfigTrack | undefined {
  let best: ConfigTrack | undefined;
  let bestLength = -1;
  for (const track of config.tracks) {
    if (track.status === "external") continue;
    const path = track.path === undefined ? "" : normalise(track.path);
    const holds = path === "" || file === path || file.startsWith(`${path}/`);
    if (holds && path.length > bestLength) {
      best = track;
      bestLength = path.length;
    }
  }
  return best;
}

// The domains that matter for every file, and those added by the kind of part it belongs to.
// Money, safety-critical and AI rules are always considered, and apply only with their traits.
const EVERY_FILE: DomainId[] = [
  "code-quality",
  "architecture",
  "security",
  "privacy-compliance",
  "testing",
  "money",
  "safety-critical",
  "ai-features",
];
// Apps call other services and can hold the only copy of a person's data, so reliability counts
// for them too; its offline and real-time rules apply only with those traits.
const UI: DomainId[] = ["frontend", "design-accessibility", "performance", "reliability"];
const SERVER: DomainId[] = [
  "backend",
  "api-design",
  "data",
  "system-design",
  "performance",
  "reliability",
  "operations",
];
const BY_KIND: Partial<Record<ConfigTrack["kind"], DomainId[]>> = {
  web: UI,
  desktop: UI,
  extension: UI,
  mobile: [...UI, "mobile"],
  backend: SERVER,
  data: ["data", "performance", "reliability"],
  infrastructure: ["delivery", "operations", "reliability"],
  library: ["api-design"],
  cli: ["api-design", "reliability"],
};

/** A source file's domains: those every file has, and those its kind of part adds. */
function domainsFor(track: ConfigTrack | undefined): DomainId[] {
  const extra = track === undefined ? undefined : BY_KIND[track.kind];
  return [...new Set([...EVERY_FILE, ...(extra ?? [])])];
}

// What a file is, by its path, in the order they're tried: a Markdown file in .github/ is a document,
// and a test in a migrations folder is a test. Anything else is source code.
const KINDS: [Exclude<FileKind, "source">, RegExp, DomainId[]][] = [
  ["document", /\.(md|mdx|rst|adoc)$/i, []],
  [
    "ci-pipeline",
    /^\.github\/(workflows|actions)\/|(^|\/)action\.ya?ml$|(^|\/)\.gitlab-ci\.ya?ml$|(^|\/)Jenkinsfile$|^\.circleci\/|(^|\/)azure-pipelines\.ya?ml$|(^|\/)bitbucket-pipelines\.ya?ml$|^\.buildkite\//,
    ["delivery", "security"],
  ],
  ["test", TEST_FILE, ["testing", "code-quality"]],
  ["data-schema", SCHEMA_FILE, ["data", "security", "privacy-compliance", "money", "safety-critical"]],
  [
    "infrastructure",
    /\.(tf|tfvars|hcl)$|(^|\/)(Chart|kustomization|Pulumi[^/]*)\.ya?ml$|(^|\/)(cdk\.json|serverless\.ya?ml)$|(^|\/)(k8s|kubernetes|helm|charts|manifests|deploy|infra)\/.*\.ya?ml$/,
    ["delivery", "operations", "reliability", "security"],
  ],
  [
    "build",
    /(^|\/)(Dockerfile(\.[^/]*)?|[^/]+\.dockerfile|Containerfile|Makefile|GNUmakefile|[jJ]ustfile|Procfile)$|(^|\/)(docker-)?compose[^/]*\.ya?ml$/,
    ["delivery", "security", "reliability"],
  ],
  [
    "dependencies",
    /(^|\/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|yarn\.lock|bun\.lockb?|requirements[^/]*\.(txt|in)|pyproject\.toml|poetry\.lock|uv\.lock|Pipfile(\.lock)?|setup\.(py|cfg)|go\.(mod|sum)|Cargo\.(toml|lock)|Gemfile(\.lock)?|pubspec\.(yaml|lock)|composer\.(json|lock)|(build|settings)\.gradle(\.kts)?|gradle\.lockfile|pom\.xml|[^/]+\.csproj|packages\.lock\.json|mix\.(exs|lock)|Podfile(\.lock)?)$/,
    ["security", "code-quality"],
  ],
  [
    "tool-settings",
    /(^|\/)(\.gitleaks\.toml|\.gitleaksignore|\.semgrepignore|\.semgrep\.ya?ml|\.editorconfig|\.prettierrc[^/]*|prettier\.config\.[cm]?[jt]s|\.eslintrc[^/]*|eslint\.config\.[cm]?[jt]s|\.stylelintrc[^/]*|\.?ruff\.toml|mypy\.ini|\.flake8|tsconfig[^/]*\.json|jsconfig\.json|biome\.jsonc?|\.pre-commit-config\.ya?ml|renovate\.json5?|\.markdownlint[^/]*|zap-rules\.tsv|\.nvmrc|\.node-version|\.python-version)$|^\.github\/dependabot\.ya?ml$/,
    ["security", "code-quality"],
  ],
];

/** What a file is, from its path. A file under the config's docs folder is a document, whatever it is. */
export function fileKind(config: PeerAiConfig, path: string): FileKind {
  const docs = config.docs?.dir === undefined ? undefined : normalise(config.docs.dir);
  if (docs !== undefined && docs !== "" && path.startsWith(`${docs}/`)) return "document";
  return KINDS.find(([, pattern]) => pattern.test(path))?.[0] ?? "source";
}

const KIND_DOMAINS = new Map<FileKind, DomainId[]>(KINDS.map(([kind, , domains]) => [kind, domains]));

const WHOLE_PROJECT = new Set(PROFILES.filter((profile) => profile.stacks.length === 0).map((profile) => profile.id));

// A stack profile's rules apply to the files of its language, and their settings files, from the
// profile its family starts from: TypeScript's family to JavaScript and TypeScript, Python's to
// Python. A profile of another family applies to every file, as before (RFC 0012).
const LANGUAGES: Record<string, RegExp> = {
  typescript: /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$|(^|\/)(tsconfig[^/]*|jsconfig|package)\.json$/,
  python: /\.pyi?$|(^|\/)(pyproject\.toml|\.?ruff\.toml|setup\.cfg|requirements[^/]*\.txt)$/,
};

function familyOf(id: string, seen = new Set<string>()): string[] {
  const profile = PROFILES.find((candidate) => candidate.id === id);
  if (profile === undefined || seen.has(id)) return [];
  seen.add(id);
  return profile.extends.length === 0 ? [id] : profile.extends.flatMap((base) => familyOf(base, seen));
}

/** Whether a profile's rules can apply to a file, by its language. */
function inLanguage(profile: string, path: string): boolean {
  const patterns = familyOf(profile).flatMap((root) => LANGUAGES[root] ?? []);
  return patterns.length === 0 || patterns.some((pattern) => pattern.test(path));
}

/**
 * Returns undefined for a file outside the project. Each rule comes in brief, unless `ruleIds` asks
 * for some in full: then only those, with any that don't apply to the file named.
 */
export function standardsFor(
  config: PeerAiConfig,
  root: string,
  file: string,
  ruleIds?: readonly string[],
  unenforced?: readonly Unenforced[],
): StandardsForFile | undefined {
  const path = normalise(isAbsolute(file) ? relative(root, file) : file);
  if (path === ".." || path.startsWith("../") || isAbsolute(path)) return undefined;
  const track = trackFor(config, path);
  const kind = fileKind(config, path);
  const standards = config.standards;
  const documents = (standards?.documents ?? [])
    .filter((doc) => doc.scope === undefined || (track !== undefined && doc.scope.includes(track.id)))
    .map((doc) => ({ path: doc.path, role: doc.role }));
  const stage = config.project.stage ?? "mvp";
  const exceptions = standards?.exceptions ?? [];
  const setAside = new Set(exceptions.map((exception) => exception.rule));
  const traits = config.project.traits ?? [];
  const domains = KIND_DOMAINS.get(kind) ?? domainsFor(track);
  const core = rulesFor({ stage, traits, domains }).map(({ id, title, rule, why, ask, check, severity }) => ({
    id,
    title,
    rule,
    why,
    ask,
    check,
    severity,
  }));
  const profiled = profileRulesFor({
    listed: standards?.profiles ?? [],
    stage,
    traits,
    overrides: standards?.overrides ?? {},
    ...(track?.stack === undefined ? {} : { stack: track.stack }),
    ...(track?.architecture === undefined ? {} : { architecture: track.architecture }),
  })
    // A profile with no stacks, such as the pipeline's, is about the project as a whole: its rules
    // go with the pipeline's files, whichever part holds them, not with each part's code. Every
    // other profile's rules go with the files of its language, in the file's domains.
    .filter((rule) =>
      WHOLE_PROJECT.has(rule.profile)
        ? kind === "ci-pipeline"
        : inLanguage(rule.profile, path) && domains.includes(rule.domain),
    )
    .map(({ id, title, rule, why, ask, check, severity, carries, value, enforcer }) => {
      const notEnforced =
        unenforced === undefined || enforcer === undefined ? undefined : whyUnenforced(unenforced, id, track?.id);
      return {
        id,
        title,
        rule,
        why,
        ask,
        check,
        severity,
        carries,
        ...(value === undefined ? {} : { value }),
        ...(unenforced === undefined || enforcer === undefined || check !== "auto"
          ? {}
          : { enforced: notEnforced === undefined, ...(notEnforced === undefined ? {} : { notEnforced }) }),
      };
    });
  const applying: RuleForFile[] = [...core, ...profiled].filter((rule) => !setAside.has(rule.id));
  const asked = ruleIds === undefined ? undefined : new Set(ruleIds);
  const notApplicable = ruleIds?.filter((id) => !applying.some((rule) => rule.id === id)) ?? [];
  const peerAiRules =
    asked === undefined
      ? applying.map(({ id, title, severity, value, enforced, notEnforced }): RuleInBrief => ({
          id,
          title,
          severity,
          ...(value === undefined ? {} : { value }),
          ...(enforced === undefined ? {} : { enforced }),
          ...(notEnforced === undefined ? {} : { notEnforced }),
        }))
      : applying.filter((rule) => asked.has(rule.id));
  return {
    file: path,
    kind,
    stage,
    peerAiRules,
    ...(notApplicable.length === 0 ? {} : { notApplicable }),
    setAside: exceptions.map((exception) => ({ rule: exception.rule, reason: exception.reason })),
    ...(track === undefined
      ? {}
      : { track: { id: track.id, kind: track.kind, ...(track.path === undefined ? {} : { path: track.path }) } }),
    core: standards?.core ?? true,
    profiles: standards?.profiles ?? [],
    documents,
    rules: (config.rules ?? []).map((rule) => ({
      path: rule.path,
      ...(rule.description === undefined ? {} : { description: rule.description }),
    })),
    precedence: standards?.precedence ?? "project",
  };
}
