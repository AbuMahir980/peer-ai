// What git says about a working copy's commits, for a record that names the commit it looked at
// (RFC 0010). Peer AI's own files in .peer-ai/ never count as a change: recording a verify or a
// review writes them, and that mustn't make the record it just wrote out of date.

import { execFileSync } from "node:child_process";

const OWN_FILES = ":(exclude).peer-ai";

function git(root: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return undefined;
  }
}

const lines = (output: string | undefined): string[] => (output ?? "").split("\n").filter((line) => line.trim() !== "");

/** The commit checked out, or undefined outside a git repository or before the first commit. */
export function headCommit(root: string): string | undefined {
  const commit = git(root, ["rev-parse", "HEAD"])?.trim();
  return commit === undefined || commit === "" ? undefined : commit;
}

/**
 * The files that differ from a commit, outside .peer-ai/: in later commits, in changes not yet
 * committed, and in new files git doesn't ignore. Undefined when the commit isn't in this
 * repository's history, so no one can tell.
 */
export function changedSince(root: string, commit: string): string[] | undefined {
  if (git(root, ["cat-file", "-e", `${commit}^{commit}`]) === undefined) return undefined;
  const changed = new Set([
    ...lines(git(root, ["diff", "--name-only", commit, "--", ".", OWN_FILES])),
    ...lines(git(root, ["ls-files", "--others", "--exclude-standard", "--", ".", OWN_FILES])),
  ]);
  return [...changed].sort();
}

/** The branch checked out, or undefined on a detached HEAD or outside a git repository. */
export function currentBranch(root: string): string | undefined {
  const branch = git(root, ["symbolic-ref", "--short", "-q", "HEAD"])?.trim();
  return branch === undefined || branch === "" ? undefined : branch;
}

/**
 * What changed since a commit, for the gate: undefined outside git or before the first commit,
 * where there's no commit to compare with, so no record can be fresh or stale.
 */
export function changesFor(root: string): ((commit: string) => string[] | undefined) | undefined {
  return headCommit(root) === undefined ? undefined : (commit) => changedSince(root, commit);
}

/** A commit's id as people read it. */
export const shortCommit = (commit: string): string => commit.slice(0, 7);
