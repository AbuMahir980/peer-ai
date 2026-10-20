// Where a work item lives (RFC 0010): its file travels with its branch, so its home is the working
// copy where that branch is checked out, the main one or any worktree git knows. The tools read and
// write each item there, so two agents on two branches never touch each other's items or the
// person's working copy, and switching branches never rolls an item back.

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import type { HistoryLine, WorkItem } from "peer-ai-workflow";
import { defaultRef } from "./commits.ts";
import { committedHistory, readHistory } from "./history.ts";
import { WORK_DIR, readWorkItems } from "./state.ts";

export interface Worktree {
  path: string;
  /** The branch checked out there, when there is one. */
  branch?: string;
}

const real = (path: string): string => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};

/** Every working copy of the repository: the main one first, then each worktree. Outside git, the root alone. */
export function worktrees(root: string): Worktree[] {
  let output: string;
  try {
    output = execFileSync("git", ["worktree", "list", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return [{ path: root }];
  }
  const found: Worktree[] = [];
  for (const block of output.split("\n\n")) {
    const path = /^worktree (.+)$/m.exec(block)?.[1];
    if (path === undefined || /^prunable/m.test(block) || /^bare$/m.test(block)) continue;
    const branch = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1];
    found.push({ path, ...(branch === undefined ? {} : { branch }) });
  }
  if (found.length === 0) return [{ path: root }];
  // The tools work from the root they were started in: it stands for its own working copy.
  const here = real(root);
  return found.map((worktree) => (real(worktree.path) === here ? { ...worktree, path: root } : worktree));
}

/** The working copy where a branch is checked out, when it is. */
export function homeOf(root: string, branch: string): string | undefined {
  return worktrees(root).find((worktree) => worktree.branch === branch)?.path;
}

export interface Located {
  /** The working copy the item's file is read from and written to. */
  home: string;
  item: WorkItem;
}

/**
 * Every closed item the repository knows of, by id: each working copy's history, and the default
 * branch's as committed, so a closing counts wherever it was recorded. The latest closing wins.
 */
export function allClosings(root: string): Map<string, HistoryLine> {
  const closings = new Map<string, HistoryLine>();
  const main = defaultRef(root);
  const lines = [
    ...worktrees(root).flatMap((worktree) => readHistory(worktree.path)),
    ...(main === undefined ? [] : committedHistory(root, main)),
  ];
  for (const line of lines) {
    const known = closings.get(line.id);
    if (known === undefined || Date.parse(known.at) <= Date.parse(line.at)) closings.set(line.id, line);
  }
  return closings;
}

/**
 * Whether a record is older than its item's closing: a copy left on a branch made before the item
 * closed, which says nothing about it now (#278). A record written after the closing is a new item
 * under the same id, and stands.
 */
export const staleAgainst = (closing: HistoryLine | undefined, item: WorkItem): boolean =>
  closing !== undefined && Date.parse(item.updatedAt) <= Date.parse(closing.at);

/** The working copies holding a record of an item older than its closing, which the tools leave alone. */
export function staleCopies(root: string, id: string, closing: HistoryLine): string[] {
  return worktrees(root).flatMap((worktree) =>
    readWorkItems(worktree.path).some(
      ({ item }) => item.ok && item.value.id === id && staleAgainst(closing, item.value),
    )
      ? [worktree.path]
      : [],
  );
}

/**
 * Every open work item in every working copy, once each: the copy in its own branch's home when
 * that is checked out, otherwise the one in the root, otherwise the first found. Items that aren't
 * valid are left out; doctor reports them. So is a record older than its item's closing (#278).
 */
export function allWorkItems(root: string): Located[] {
  const closings = allClosings(root);
  const copies = new Map<string, { home: string; item: WorkItem; branch?: string }[]>();
  for (const worktree of worktrees(root)) {
    for (const { item } of readWorkItems(worktree.path)) {
      if (!item.ok || staleAgainst(closings.get(item.value.id), item.value)) continue;
      const list = copies.get(item.value.id) ?? [];
      list.push({
        home: worktree.path,
        item: item.value,
        ...(worktree.branch === undefined ? {} : { branch: worktree.branch }),
      });
      copies.set(item.value.id, list);
    }
  }
  return [...copies.values()].map((list) => {
    const own = list.find((copy) => copy.item.branch !== undefined && copy.branch === copy.item.branch);
    const chosen = own ?? list.find((copy) => copy.home === root) ?? list[0];
    if (chosen === undefined) throw new Error("a work item with no copy");
    return { home: chosen.home, item: chosen.item };
  });
}

/** Where a work item is, and its record there. */
export function locate(root: string, id: string): Located | undefined {
  return allWorkItems(root).find(({ item }) => item.id === id);
}

/** A work item's file, as a path inside its home. */
export const itemFile = (id: string): string => join(WORK_DIR, `${id}.json`);
