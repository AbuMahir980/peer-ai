// CI's run of the verify command counts as the verify (RFC 0013): the result of the check the
// config names (commands.verifyCheck) on a work item's commit, read from GitHub through gh, is
// recorded with a link to the run, and the gate confirms it with GitHub the same way.

import type { Runner } from "./feedback.ts";

export type CiResult =
  | { status: "pass" | "fail"; url: string }
  | { status: "running" }
  /** No check by that name ran on the commit; the names of those that did. */
  | { status: "missing"; names: string[] }
  /** GitHub couldn't be asked: no gh, not signed in, or no GitHub remote. */
  | { status: "unknown" };

interface CheckRun {
  name: string;
  status: string;
  conclusion: string | null;
  html_url?: string;
  started_at?: string | null;
}

/** The check the config names: by its own name, or as a pull request shows it, "workflow / job". */
const isNamed = (run: CheckRun, check: string): boolean => run.name === check || check.endsWith(` / ${run.name}`);

/** The latest run of a check on a commit, from GitHub's API through gh. */
export function ciResult(commit: string, check: string, run: Runner): CiResult {
  const printed = run("gh", ["api", `repos/{owner}/{repo}/commits/${commit}/check-runs?per_page=100`]);
  if (printed === undefined) return { status: "unknown" };
  let runs: CheckRun[];
  try {
    runs = (JSON.parse(printed) as { check_runs?: CheckRun[] }).check_runs ?? [];
  } catch {
    return { status: "unknown" };
  }
  const latest = runs
    .filter((candidate) => isNamed(candidate, check))
    .sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? ""))[0];
  if (latest === undefined) return { status: "missing", names: [...new Set(runs.map((each) => each.name))].sort() };
  if (latest.status !== "completed" || latest.html_url === undefined) return { status: "running" };
  return { status: latest.conclusion === "success" ? "pass" : "fail", url: latest.html_url };
}

/** Why CI's result can't be taken as the verify, in words for the AI tool or the person. */
export function ciProblem(result: CiResult, check: string, commit: string): string | undefined {
  const short = commit.slice(0, 7);
  switch (result.status) {
    case "pass":
    case "fail":
      return undefined;
    case "running":
      return `CI's ${check} is still running on ${short}. Ask again when it finishes.`;
    case "missing":
      return `No check named "${check}" ran on ${short}. Push the branch and let CI run it${result.names.length === 0 ? "" : `; the checks that ran are ${result.names.join(", ")}, so check commands.verifyCheck`}.`;
    case "unknown":
      return "GitHub couldn't be asked for CI's result: sign in with gh auth login, or verify here instead.";
  }
}
