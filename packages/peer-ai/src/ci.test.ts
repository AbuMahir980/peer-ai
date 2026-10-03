import { describe, expect, it } from "vitest";
import { ciProblem, ciResult } from "./ci.ts";
import type { Runner } from "./feedback.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const URL = "https://github.com/acme/shop/actions/runs/1/job/2";

/** gh answering the check-runs API for one commit, as GitHub would. */
const github =
  (runs: object[]): Runner =>
  (command, args) =>
    command === "gh" && args.join(" ") === `api repos/{owner}/{repo}/commits/${COMMIT}/check-runs?per_page=100`
      ? JSON.stringify({ total_count: runs.length, check_runs: runs })
      : undefined;

const run = (name: string, status: string, conclusion: string | null, started: string) => ({
  name,
  status,
  conclusion,
  html_url: URL,
  started_at: started,
});

describe("CI's verify (RFC 0013)", () => {
  it("is the latest run of the check, by its name or as a pull request shows it", () => {
    const runs = [
      run("check", "completed", "failure", "2026-10-03T08:00:00Z"),
      run("check", "completed", "success", "2026-10-03T09:00:00Z"),
      run("lint", "completed", "failure", "2026-10-03T09:00:00Z"),
    ];
    expect(ciResult(COMMIT, "check", github(runs))).toEqual({ status: "pass", url: URL });
    expect(ciResult(COMMIT, "ci / check", github(runs))).toEqual({ status: "pass", url: URL });
    expect(ciResult(COMMIT, "ci / lint", github(runs))).toEqual({ status: "fail", url: URL });
  });

  it("says when it's still running, didn't run, or GitHub can't be asked", () => {
    const running = ciResult(COMMIT, "check", github([run("check", "in_progress", null, "2026-10-03T09:00:00Z")]));
    expect(ciProblem(running, "check", COMMIT)).toBe(
      "CI's check is still running on 0123456. Ask again when it finishes.",
    );
    const missing = ciResult(
      COMMIT,
      "ci / test",
      github([run("check", "completed", "success", "2026-10-03T09:00:00Z")]),
    );
    expect(ciProblem(missing, "ci / test", COMMIT)).toBe(
      'No check named "ci / test" ran on 0123456. Push the branch and let CI run it; the checks that ran are check, so check commands.verifyCheck.',
    );
    const unknown = ciResult(COMMIT, "check", () => undefined);
    expect(ciProblem(unknown, "check", COMMIT)).toBe(
      "GitHub couldn't be asked for CI's result: sign in with gh auth login, or verify here instead.",
    );
  });
});
