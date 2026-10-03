// The map judges a document's evidence, not just its existence (RFC 0018). A document, or a folder
// of them, is flagged when it's stale (unchanged for 90 days while the code of its part has moved
// on), a byte-for-byte duplicate of another, or about something gone (it names a path the project
// deleted, or a retired part). An item whose evidence is all flagged is partial, with why, so
// next_work offers its document skill. Everything comes from git and the files: no AI is involved.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { posix } from "node:path";
import type { KnownMapItemId } from "peer-ai-workflow";
import type { ItemResult } from "./assess.ts";

const DOCUMENT = /\.(md|mdx|rst|adoc|txt)$/i;
const DAY = 24 * 60 * 60 * 1000;
/** Commits that change only documents, or Peer AI's own records, aren't the code moving on. */
const NOT_CODE = ["md", "mdx", "rst", "adoc", "txt"]
  .map((extension) => `:(exclude)*.${extension}`)
  .concat(":(exclude).peer-ai");
/** A path named in a document: relative, with at least one folder in it. */
const NAMED_PATH = /^[\w.-]+(\/[\w.-]+)+\/?$/;

export interface Flag {
  file: string;
  reason: string;
}

export interface EvidenceContext {
  root: string;
  /** The project's files. */
  files: readonly string[];
  /** Every part of the project, with its status. */
  tracks: readonly { path?: string; status: string }[];
  read: (file: string) => string;
  /** Documents, or folders of them, meant to stay as they were (docs.settled). */
  settled?: readonly string[] | undefined;
  /** Now, in milliseconds. */
  now?: number;
  /** How long a document must be unchanged before it can be stale. */
  staleDays?: number;
  /** How many commits to its part since then make it stale. */
  manyCommits?: number;
}

interface Commit {
  at: number;
  files: string[];
}

function git(root: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", ["-c", "core.quotePath=false", ...args], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch {
    return undefined;
  }
}

/** Commits, newest first, each with when (in seconds) and the files it changed. */
function commits(root: string, args: string[]): Commit[] {
  const log = git(root, ["log", "--no-renames", "--format=%x00%ct", "--name-only", ...args]);
  const found: Commit[] = [];
  for (const line of (log ?? "").split("\n")) {
    if (line.startsWith("\u0000")) found.push({ at: Number(line.slice(1)), files: [] });
    else if (line !== "") found.at(-1)?.files.push(line);
  }
  return found;
}

const within = (file: string, path: string): boolean =>
  path === "." || file === path || file.startsWith(path.endsWith("/") ? path : `${path}/`);

const day = (seconds: number): string => new Date(seconds * 1000).toISOString().slice(0, 10);

const clip = (text: string): string => (text.length <= 200 ? text : `${text.slice(0, 199)}…`);

/** The paths a document names in code spans and links, as paths from the project's root. */
function namedPaths(file: string, text: string): string[] {
  const spans = [...text.matchAll(/`([^`\s]+)`/g)].map((match) => match[1] ?? "");
  const links = [...text.matchAll(/\]\(([^)\s#?]+)/g)]
    .map((match) => match[1] ?? "")
    .filter((link) => !/^[a-z][a-z+.-]*:/i.test(link))
    .map((link) => (link.startsWith("/") ? link.slice(1) : posix.normalize(posix.join(posix.dirname(file), link))));
  return [...new Set([...spans, ...links])]
    .map((path) => path.replace(/^\.\//, "").replace(/\/+$/, ""))
    .filter((path) => NAMED_PATH.test(path) && !path.startsWith(".."));
}

/** The files given, with each folder they're in. */
function withFolders(files: readonly string[]): Set<string> {
  const paths = new Set<string>();
  for (const file of files) {
    for (let path = file; path !== "" && path !== "." && !paths.has(path); path = posix.dirname(path)) paths.add(path);
  }
  return paths;
}

/** Every path git has deleted, with each folder they were in. */
function deletedPaths(root: string): Set<string> {
  const log = git(root, ["log", "--no-renames", "--diff-filter=D", "--format=", "--name-only"]) ?? "";
  return withFolders(log.split("\n"));
}

/** Each document's, and each folder of documents', evidence that may no longer hold, with why. */
export function flagEvidence(evidence: readonly string[], ctx: EvidenceContext): Map<string, string> {
  const flagged = new Map<string, string>();
  const documents = [...new Set(evidence)].filter((path) => DOCUMENT.test(path) || path.endsWith("/"));
  if (documents.length === 0) return flagged;
  const settled = (path: string) => (ctx.settled ?? []).some((entry) => within(path, entry.replace(/\/+$/, "")));

  // Duplicates: only the first of identical documents counts.
  const seen = new Map<string, string>();
  for (const file of documents.filter((path) => DOCUMENT.test(path))) {
    const text = ctx.read(file);
    if (text.trim() === "") continue;
    const hash = createHash("sha256").update(text).digest("hex");
    const original = seen.get(hash);
    if (original === undefined) seen.set(hash, file);
    else flagged.set(file, `${file} is the same as ${original}`);
  }

  // Stale and gone need the project's history: a shallow clone has too little of it to judge.
  if (git(ctx.root, ["rev-parse", "--is-shallow-repository"])?.trim() !== "false") return flagged;
  const judged = documents.filter((path) => !flagged.has(path) && !settled(path));

  // Gone: a document naming a path the project deleted, or a part it retired.
  const retired = ctx.tracks.flatMap((track) =>
    track.status === "retired" && track.path !== undefined && track.path !== "." ? [track.path] : [],
  );
  let deleted: Set<string> | undefined;
  let present: Set<string> | undefined;
  for (const file of judged.filter((path) => DOCUMENT.test(path))) {
    const named = namedPaths(file, ctx.read(file));
    const inRetired = named.find((path) => retired.some((part) => within(path, part)));
    if (inRetired !== undefined) {
      flagged.set(file, `${file} names ${inRetired}, a part that's retired`);
      continue;
    }
    present ??= withFolders(ctx.files);
    const known = present;
    const missing = named.filter((path) => !known.has(path) && !known.has(posix.join(posix.dirname(file), path)));
    if (missing.length === 0) continue;
    deleted ??= deletedPaths(ctx.root);
    const gone = missing.find((path) => deleted?.has(path));
    if (gone !== undefined) flagged.set(file, `${file} names ${gone}, which no longer exists`);
  }

  // Stale: unchanged for 90 days, while its part had 50 commits, or a quarter of its files changed.
  const now = ctx.now ?? Date.now();
  const oldest = now - (ctx.staleDays ?? 90) * DAY;
  const manyCommits = ctx.manyCommits ?? 50;
  const candidates = judged.filter((path) => !flagged.has(path));
  if (candidates.length === 0) return flagged;
  const changed = new Map<string, number>();
  for (const commit of commits(ctx.root, ["--", ...candidates])) {
    for (const path of candidates) {
      if (!changed.has(path) && commit.files.some((file) => within(file, path))) changed.set(path, commit.at);
    }
  }
  const parts = ctx.tracks.flatMap((track) =>
    track.status !== "external" && track.path !== undefined && track.path !== "." ? [track.path] : [],
  );
  const partOf = (path: string): string | undefined =>
    parts.filter((part) => within(path, part)).sort((a, b) => b.length - a.length)[0];
  const old = candidates.flatMap((path) => {
    const at = changed.get(path);
    return at !== undefined && at * 1000 < oldest ? [{ path, at, part: partOf(path) }] : [];
  });
  // One log, and one list of its code, for each part with a document old enough to judge.
  const history = new Map<string, { since: Commit[]; code: Set<string> }>();
  const partHistory = (key: string) => {
    const known = history.get(key);
    if (known !== undefined) return known;
    const from = Math.min(...old.filter((other) => (other.part ?? ".") === key).map((other) => other.at));
    const found = {
      since: commits(ctx.root, [`--since=${new Date(from * 1000).toISOString()}`, "--", key, ...NOT_CODE]),
      code: new Set(ctx.files.filter((file) => within(file, key) && !DOCUMENT.test(file) && !within(file, ".peer-ai"))),
    };
    history.set(key, found);
    return found;
  };
  for (const { path, at, part } of old) {
    const { since, code } = partHistory(part ?? ".");
    const after = since.filter((commit) => commit.at > at);
    const name = part ?? "the project";
    if (after.length >= manyCommits) {
      flagged.set(
        path,
        `${path} was last changed ${day(at)}, and ${name} has had ${String(after.length)} commits since`,
      );
      continue;
    }
    const moved = new Set(after.flatMap((commit) => commit.files).filter((file) => code.has(file)));
    if (code.size > 0 && moved.size * 4 >= code.size) {
      flagged.set(
        path,
        `${path} was last changed ${day(at)}, and ${String(moved.size)} of ${name}'s ${String(code.size)} files have changed since`,
      );
    }
  }
  return flagged;
}

/**
 * The map's items with their documents judged: each item lists its flagged evidence, and one whose
 * evidence is all flagged is partial, not present, with the first reason as its note.
 */
export function judgeEvidence(
  items: Record<KnownMapItemId, ItemResult>,
  ctx: EvidenceContext,
): Record<KnownMapItemId, ItemResult> {
  const judged = Object.values(items).filter((item) => item.status === "present" || item.status === "partial");
  const flagged = flagEvidence(
    judged.flatMap((item) => item.evidence ?? []),
    ctx,
  );
  if (flagged.size === 0) return items;
  return Object.fromEntries(
    Object.entries(items).map(([id, item]) => {
      const evidence = item.evidence ?? [];
      const flags = evidence.flatMap((file) => {
        const reason = flagged.get(file);
        return reason === undefined || !judged.includes(item) ? [] : [{ file, reason }];
      });
      if (flags.length === 0) return [id, item];
      const all = flags.length === evidence.length;
      const note =
        flags.length === 1
          ? (flags[0]?.reason ?? "")
          : `${flags[0]?.reason ?? ""}; and ${String(flags.length - 1)} more ${flags.length === 2 ? "is" : "are"} flagged`;
      return [
        id,
        {
          ...item,
          flagged: flags,
          ...(all && item.status === "present" ? { status: "partial", note: clip(note) } : {}),
        },
      ];
    }),
  ) as Record<KnownMapItemId, ItemResult>;
}
