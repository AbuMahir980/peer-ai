// Closed work leaves the tree (RFC 0017): when a work item is done or cancelled, its file and its
// reports are removed, and it becomes one line in .peer-ai/history/<year>-<month>.jsonl. Lines are
// appended, never edited, so git's union merge joins branches that close items at once. Git keeps
// the full record: each line names the last commit that held the item's file.

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { validateHistoryLine, type HistoryLine, type WorkItem } from "peer-ai-workflow";
import { WORK_DIR } from "./state.ts";

export const HISTORY_DIR = ".peer-ai/history";
export const REPORTS_DIR = ".peer-ai/reports";

function git(root: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}

/** Every closed item, newest line last; a later line for the same id replaces an earlier one. */
export function readHistory(root: string): HistoryLine[] {
  const dir = join(root, HISTORY_DIR);
  if (!existsSync(dir)) return [];
  const byId = new Map<string, HistoryLine>();
  for (const file of readdirSync(dir)
    .filter((name) => name.endsWith(".jsonl"))
    .sort()) {
    for (const text of readFileSync(join(dir, file), "utf8").split("\n")) {
      if (text.trim() === "") continue;
      try {
        const line = validateHistoryLine(JSON.parse(text));
        if (line.ok) byId.set(line.value.id, line.value);
      } catch {
        // A line that isn't JSON is skipped; doctor's own checks are on live files.
      }
    }
  }
  return [...byId.values()];
}

/** A closed item as a work item, for what reads items: dependencies, fixes, and work_item. */
export function asWorkItem(line: HistoryLine): WorkItem {
  return {
    version: 1,
    id: line.id,
    title: line.title,
    kind: line.kind,
    stage: line.stage,
    ...(line.track === undefined ? {} : { track: line.track }),
    ...(line.dependsOn === undefined ? {} : { dependsOn: line.dependsOn }),
    ...(line.fixes === undefined ? {} : { fixes: line.fixes }),
    next: line.stage === "done" ? "Closed: done." : "Closed: cancelled.",
    updatedAt: line.at,
  };
}

/** The closed items, as work items. */
export const closedItems = (root: string): WorkItem[] => readHistory(root).map(asWorkItem);

/**
 * Moves a done or cancelled item out of the tree, in its home: one line in this month's history,
 * its file and its reports removed. Returns the line.
 */
export function closeIntoHistory(home: string, item: WorkItem, by: HistoryLine["by"], at: Date): HistoryLine {
  const file = join(WORK_DIR, `${item.id}.json`);
  const lastFile = git(home, ["log", "-1", "--format=%H", "--", file]);
  const verify = item.lastVerify;
  const line: HistoryLine = {
    id: item.id,
    title: item.title,
    kind: item.kind,
    ...(item.track === undefined ? {} : { track: item.track }),
    stage: item.stage === "cancelled" ? "cancelled" : "done",
    at: at.toISOString(),
    by,
    ...(item.closed === undefined
      ? {}
      : {
          merge: {
            ...(item.closed.commit === undefined ? {} : { commit: item.closed.commit }),
            ...(item.closed.pullRequest === undefined ? {} : { pullRequest: item.closed.pullRequest }),
          },
        }),
    ...(verify === undefined
      ? {}
      : { verify: { result: verify.result, ...(verify.commit === undefined ? {} : { commit: verify.commit }) } }),
    ...((item.reviews ?? []).length === 0
      ? {}
      : {
          reviews: (item.reviews ?? []).map(({ skill, result, open, report }) => ({
            skill,
            result,
            ...(open === undefined ? {} : { open }),
            ...(report === undefined ? {} : { report }),
          })),
        }),
    ...(item.dependsOn === undefined ? {} : { dependsOn: item.dependsOn }),
    ...(item.fixes === undefined ? {} : { fixes: item.fixes }),
    ...(lastFile === undefined || lastFile === "" ? {} : { lastFile }),
  };
  const checked = validateHistoryLine(line);
  if (!checked.ok) throw new Error(`The history line would not be valid: ${checked.errors.join("; ")}`);
  mkdirSync(join(home, HISTORY_DIR), { recursive: true });
  appendFileSync(join(home, HISTORY_DIR, `${line.at.slice(0, 7)}.jsonl`), `${JSON.stringify(checked.value)}\n`);
  rmSync(join(home, file), { force: true });
  rmSync(join(home, REPORTS_DIR, item.id), { recursive: true, force: true });
  return checked.value;
}

/** A closed item's full file as git last held it, for peer-ai work show --full. */
export function lastFullFile(root: string, line: HistoryLine): string | undefined {
  if (line.lastFile === undefined) return undefined;
  return git(root, ["show", `${line.lastFile}:${WORK_DIR}/${line.id}.json`]);
}

/** What `peer-ai tidy` would move or remove: closed items still in the tree, and reports of items that are gone. */
export interface Untidy {
  closed: WorkItem[];
  /** Report folders of items with no file here; whole-project reports are kept. */
  orphanReports: string[];
}

export function untidy(root: string, items: WorkItem[]): Untidy {
  const live = new Set(items.map((item) => item.id));
  const reports = join(root, REPORTS_DIR);
  const folders = existsSync(reports)
    ? readdirSync(reports, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== "project" && !live.has(entry.name))
        .map((entry) => `${REPORTS_DIR}/${entry.name}`)
    : [];
  return {
    closed: items.filter((item) => item.stage === "done" || item.stage === "cancelled"),
    orphanReports: folders,
  };
}

/** Moves each closed item into the history, and removes reports of items that are gone (RFC 0017). */
export function tidy(root: string, found: Untidy): void {
  for (const item of found.closed) {
    const by = item.closed?.by === "merge" ? "merge" : item.stage === "cancelled" ? "cancel" : "ship";
    closeIntoHistory(root, item, by, new Date(item.updatedAt));
  }
  for (const folder of found.orphanReports) rmSync(join(root, folder), { recursive: true, force: true });
}
