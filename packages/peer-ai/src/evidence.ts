// Whether a work item's record still matches its branch (RFC 0010): a verify or review names the
// commit it looked at, so a later change shows. The gate refuses stale evidence at ship; doctor,
// and through it next_work, warns as soon as the record falls behind.

import { renderedName } from "peer-ai-skills";
import type { WorkItem } from "peer-ai-workflow";
import { fail, plural, warn, type Check } from "./checks.ts";
import { changesFor, commitsSince, currentBranch, forkPoint, ownFiles, shortCommit } from "./commits.ts";
import { allWorkItems } from "./homes.ts";
import type { CiResult } from "./ci.ts";

type Review = NonNullable<WorkItem["reviews"]>[number];

/** The most recent review from each skill: a later pass supersedes an earlier failure. */
export function latestReviews(item: WorkItem): Review[] {
  const latest = new Map<string, Review>();
  for (const review of item.reviews ?? []) {
    const seen = latest.get(review.skill);
    if (seen === undefined || Date.parse(review.at) >= Date.parse(seen.at)) latest.set(review.skill, review);
  }
  return [...latest.values()];
}

/** What the gate knows about the change being made now (RFC 0010). */
export interface GateContext {
  /** The branch checked out: its work item is the change being made now, held to every rule. */
  branch?: string | undefined;
  /** The stage the item is moving to now, when the gate is asked before a move. */
  moving?: WorkItem["stage"] | undefined;
  /** The files changed since a commit, outside .peer-ai/; undefined when the commit isn't in this history. */
  changedSince?: ((commit: string) => string[] | undefined) | undefined;
  /**
   * The files the branch itself changes, against where it leaves the default branch: a review is
   * stale only when one of them changed since it, so a merge from the base branch that brings in
   * other files keeps it (RFC 0013). Undefined when unknown: then any change counts.
   */
  ownFiles?: string[] | undefined;
  /** A CI check's result on a commit, from GitHub, to confirm a verify taken from CI (RFC 0013). */
  ciResult?: ((commit: string, check: string) => CiResult) | undefined;
}

const listed = (files: string[]): string =>
  files.length <= 3 ? files.join(", ") : `${files.slice(0, 3).join(", ")} and ${String(files.length - 3)} more`;

/**
 * The verify and required reviews of an item at ship must be on the branch's latest commit, or on
 * one with no change since outside .peer-ai/ (RFC 0010). A record from before records named their
 * commit counts only until the item next moves to ship.
 */
export function staleEvidence(item: WorkItem, claim: string, context: GateContext, moving: boolean): Check[] {
  const changed = context.changedSince;
  if (changed === undefined) return [];
  const required = new Set((item.requiredReviews ?? []).map((review) => review.skill));
  // The verify follows every change, since merged code can break the build; a review, only the
  // item's own files.
  const own = context.ownFiles === undefined ? undefined : new Set(context.ownFiles);
  const evidence = [
    ...(item.lastVerify === undefined
      ? []
      : [{ what: "verify", commit: item.lastVerify.commit, again: "Verify again", ownOnly: false }]),
    ...latestReviews(item)
      .filter((review) => required.has(review.skill))
      .map((review) => ({
        what: review.skill,
        commit: review.commit,
        again: `Review it again with ${renderedName(review.skill)}`,
        ownOnly: true,
      })),
  ];
  const checks: Check[] = [];
  for (const { what, commit, again, ownOnly } of evidence) {
    if (commit === undefined) {
      if (moving) {
        checks.push(
          fail(
            "gates",
            `${claim}, but its ${what} doesn't say which commit it looked at.`,
            `${again}, on the latest commit.`,
          ),
        );
      }
      continue;
    }
    const since = changed(commit);
    const files = since === undefined || !ownOnly || own === undefined ? since : since.filter((file) => own.has(file));
    if (files === undefined) {
      const message = `${claim}, but its ${what} looked at ${shortCommit(commit)}, which isn't in this repository's history.`;
      checks.push(
        moving
          ? fail("gates", message, `${again}, on the latest commit.`)
          : warn("gates", message, `${again}, on the latest commit.`),
      );
    } else if (files.length > 0) {
      checks.push(
        fail(
          "gates",
          `${claim}, but its ${what} looked at ${shortCommit(commit)}, and ${listed(files)} changed since.`,
          `${again}, on the latest commit.`,
        ),
      );
    }
  }
  return checks;
}

/**
 * doctor's check: the record of the branch checked out keeps up with its commits. An item still at
 * prepare while its branch has commits, and a verify or review of an older commit, are warnings.
 */
export function checkRecord(root: string): Check[] {
  const branch = currentBranch(root);
  if (branch === undefined) return [];
  const located = allWorkItems(root).find(
    ({ item }) => item.branch === branch && ["prepare", "build", "verify", "ship"].includes(item.stage),
  );
  if (located === undefined) return [];
  const { home, item } = located;
  if (item.stage === "prepare") {
    const base = item.base ?? forkPoint(home);
    const commits = base === undefined ? 0 : commitsSince(home, base);
    if (commits === 0) return [];
    return [
      warn(
        "record",
        `${item.id} is at prepare, but its branch has ${plural(commits, "commit")}.`,
        "Move it to build, and say what changed with update_work_item.",
      ),
    ];
  }
  if (item.stage !== "verify" && item.stage !== "ship") return [];
  const changedSince = changesFor(home);
  if (changedSince === undefined) return [];
  const context = { changedSince, ownFiles: ownFiles(home) };
  return staleEvidence(item, `${item.id} is at ${item.stage}`, context, false).map((check) =>
    warn("record", check.message, check.fix ?? ""),
  );
}
