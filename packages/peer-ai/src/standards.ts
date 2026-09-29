// Which standards govern a file: Peer AI's rules for the kind of part it belongs to, at the
// project's stage and with its traits, and the project's own documents and rules. An agent asks
// for these before editing a file, instead of loading every rule on every turn.

import { isAbsolute, relative } from "node:path";
import { rulesFor, type Rule } from "@peer-ai/standards";
import { DOMAIN_IDS, type DomainId, type PeerAiConfig } from "@peer-ai/workflow";

type ConfigTrack = PeerAiConfig["tracks"][number];

/** A rule as an agent needs it while editing: what to do, and the question it will be reviewed by. */
export type RuleForFile = Pick<Rule, "id" | "title" | "rule" | "ask" | "check" | "severity">;

export interface StandardsForFile {
  file: string;
  stage: "prototype" | "mvp" | "production";
  /** Peer AI's rules that apply to this file. */
  peerAiRules: RuleForFile[];
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

/** The domains for a file: every domain when it belongs to no track or to a kind not listed. */
function domainsFor(track: ConfigTrack | undefined): DomainId[] {
  const extra = track === undefined ? undefined : BY_KIND[track.kind];
  return extra === undefined ? [...DOMAIN_IDS] : [...new Set([...EVERY_FILE, ...extra])];
}

/** Returns undefined for a file outside the project. */
export function standardsFor(config: PeerAiConfig, root: string, file: string): StandardsForFile | undefined {
  const path = normalise(isAbsolute(file) ? relative(root, file) : file);
  if (path === ".." || path.startsWith("../") || isAbsolute(path)) return undefined;
  const track = trackFor(config, path);
  const standards = config.standards;
  const documents = (standards?.documents ?? [])
    .filter((doc) => doc.scope === undefined || (track !== undefined && doc.scope.includes(track.id)))
    .map((doc) => ({ path: doc.path, role: doc.role }));
  const stage = config.project.stage ?? "mvp";
  const exceptions = standards?.exceptions ?? [];
  const setAside = new Set(exceptions.map((exception) => exception.rule));
  const peerAiRules = rulesFor({ stage, traits: config.project.traits ?? [], domains: domainsFor(track) })
    .filter((rule) => !setAside.has(rule.id))
    .map(({ id, title, rule, ask, check, severity }) => ({ id, title, rule, ask, check, severity }));
  return {
    file: path,
    stage,
    peerAiRules,
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
