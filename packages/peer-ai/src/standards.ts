// Which standards govern a file: the track it belongs to, and the project's own documents and
// rules for that track. An agent asks for these before editing a file, instead of loading every
// rule on every turn.

import { isAbsolute, relative } from "node:path";
import type { PeerAiConfig } from "@peer-ai/workflow";

type ConfigTrack = PeerAiConfig["tracks"][number];

export interface StandardsForFile {
  file: string;
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

/** Returns undefined for a file outside the project. */
export function standardsFor(config: PeerAiConfig, root: string, file: string): StandardsForFile | undefined {
  const path = normalise(isAbsolute(file) ? relative(root, file) : file);
  if (path === ".." || path.startsWith("../") || isAbsolute(path)) return undefined;
  const track = trackFor(config, path);
  const standards = config.standards;
  const documents = (standards?.documents ?? [])
    .filter((doc) => doc.scope === undefined || (track !== undefined && doc.scope.includes(track.id)))
    .map((doc) => ({ path: doc.path, role: doc.role }));
  return {
    file: path,
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
