// CI in view (RFC 0020): the checks on each open work item's pull request, read once per next_work
// through gh and kept on this machine for two minutes, so a failing check is the next thing to do,
// not something the person spots first. Peer AI's own gate is red while an item is short of ship,
// which is waiting, not failing. Offline, without gh, or without a GitHub remote, there's nothing to show.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WorkItem } from "peer-ai-workflow";
import type { Runner } from "./feedback.ts";
import { cacheDir } from "./updates.ts";

/** The gate's job, as render names it (RFC 0009). */
export const GATE_CHECK = "peer-ai check";
const FRESH = 2 * 60 * 1000;

export interface CheckState {
  name: string;
  state: "pass" | "pending" | "fail";
  url?: string;
}

export interface OpenPullRequest {
  number: number;
  url: string;
  branch: string;
  commit: string;
  checks: CheckState[];
}

/** What an item's pull request's checks say, and what to do when one fails. */
export interface PullRequestState {
  number: number;
  url: string;
  /** The commit the checks ran on. */
  commit: string;
  /** waiting: only Peer AI's gate is red, because the item is short of ship. */
  checks: "passing" | "pending" | "failing" | "waiting";
  failing?: { name: string; url?: string }[];
  next?: string;
}

interface RollupEntry {
  __typename?: string;
  name?: string;
  context?: string;
  status?: string;
  conclusion?: string | null;
  state?: string;
  detailsUrl?: string;
  targetUrl?: string;
}

interface Listed {
  number: number;
  url: string;
  headRefName: string;
  headRefOid: string;
  statusCheckRollup?: RollupEntry[] | null;
}

function stateOf(entry: RollupEntry): CheckState["state"] {
  if (entry.__typename === "StatusContext") {
    if (entry.state === "SUCCESS") return "pass";
    return entry.state === "PENDING" || entry.state === "EXPECTED" ? "pending" : "fail";
  }
  if (entry.status !== "COMPLETED") return "pending";
  return ["SUCCESS", "NEUTRAL", "SKIPPED"].includes(entry.conclusion ?? "") ? "pass" : "fail";
}

/** Whether the project's origin is on GitHub: without it, there's no pull request to ask about. */
export function onGitHub(root: string): boolean {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return /github\.com[:/]/.test(url);
  } catch {
    return false;
  }
}

/** The open pull requests and their checks, from GitHub through gh, or undefined when gh can't be asked. */
export function openPullRequests(
  root: string,
  run: Runner,
  now: number = Date.now(),
  cache = true,
): OpenPullRequest[] | undefined {
  const file = join(cacheDir(), `pull-requests-${createHash("sha256").update(root).digest("hex").slice(0, 16)}.json`);
  if (cache) {
    try {
      const kept = JSON.parse(readFileSync(file, "utf8")) as { at: number; pulls: OpenPullRequest[] };
      if (now - kept.at < FRESH) return kept.pulls;
    } catch {
      // Nothing kept yet, or unreadable: ask GitHub.
    }
  }
  const printed = run("gh", [
    "pr",
    "list",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,url,headRefName,headRefOid,statusCheckRollup",
  ]);
  if (printed === undefined) return undefined;
  let pulls: OpenPullRequest[];
  try {
    pulls = (JSON.parse(printed) as Listed[]).map((pull) => ({
      number: pull.number,
      url: pull.url,
      branch: pull.headRefName,
      commit: pull.headRefOid,
      checks: (pull.statusCheckRollup ?? []).map((entry) => {
        const url = entry.detailsUrl ?? entry.targetUrl;
        return {
          name: entry.name ?? entry.context ?? "check",
          state: stateOf(entry),
          ...(url === undefined || url === "" ? {} : { url }),
        };
      }),
    }));
  } catch {
    return undefined;
  }
  if (cache) {
    try {
      mkdirSync(cacheDir(), { recursive: true });
      writeFileSync(file, JSON.stringify({ at: now, pulls }));
    } catch {
      // A cache that can't be written only means asking again next time.
    }
  }
  return pulls;
}

/** What an item's pull request's checks say: a failing check comes first, as its next action. */
export function pullRequestState(item: WorkItem, pull: OpenPullRequest): PullRequestState {
  const failing = pull.checks.filter((check) => check.state === "fail" && check.name !== GATE_CHECK);
  const gateFails = pull.checks.some((check) => check.state === "fail" && check.name === GATE_CHECK);
  // The gate is red while the item is short of ship, which is waiting; at ship, red is a real problem.
  const shipped = item.stage === "ship" || item.stage === "done";
  const broken: { name: string; url?: string }[] = gateFails && shipped ? [...failing, { name: GATE_CHECK }] : failing;
  const base = { number: pull.number, url: pull.url, commit: pull.commit };
  if (broken.length > 0) {
    return {
      ...base,
      checks: "failing",
      failing: broken.map(({ name, url }) => (url === undefined ? { name } : { name, url })),
      next: `Fix CI: ${broken.map((check) => check.name).join(", ")}, on ${pull.commit.slice(0, 7)}.`,
    };
  }
  if (pull.checks.some((check) => check.state === "pending")) return { ...base, checks: "pending" };
  return { ...base, checks: gateFails ? "waiting" : "passing" };
}
