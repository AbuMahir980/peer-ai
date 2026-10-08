// Whether a work item's branch is already merged into the default branch (RFC 0013), so work that
// merged before the ship gate, or while it wasn't required, can be closed saying how. git tells a
// merge commit or a fast-forward, and a squash or rebase merge whose files are all in the default
// branch as the branch left them; GitHub tells the rest, such as a squash merge whose branch is gone.

import { execFileSync } from "node:child_process";
import type { PeerAiConfig, WorkItem } from "peer-ai-workflow";
import { plural, warn, type Check } from "./checks.ts";
import type { Runner } from "./feedback.ts";
import { allWorkItems } from "./homes.ts";

/** How a branch reached the default branch, as far as git or GitHub can tell. */
export interface Merge {
  /** The commit that brought it in. */
  commit?: string;
  pullRequest?: number;
}

function git(root: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return undefined;
  }
}

const lines = (output: string | undefined): string[] => (output ?? "").split("\n").filter((line) => line.trim() !== "");
function commitOf(root: string, name: string): string | undefined {
  const commit = git(root, ["rev-parse", "--verify", "-q", `${name}^{commit}`])?.trim();
  return commit === "" ? undefined : commit;
}

/** The default branch as this working copy has it: the config's, main or master, here or from the remote. */
export function defaultBranchRef(root: string, defaultBranch?: string): string | undefined {
  const names = [defaultBranch, "main", "master"].filter((name): name is string => name !== undefined);
  return names.flatMap((name) => [name, `origin/${name}`]).find((name) => commitOf(root, name) !== undefined);
}

/** A branch's last commit, here or from the remote; undefined once it's gone from both. */
export const branchTip = (root: string, branch: string): string | undefined =>
  commitOf(root, branch) ?? commitOf(root, `origin/${branch}`);

/** What git alone can tell, with no network: a merge, a fast-forward, or the branch's files all in. */
export function mergedInGit(root: string, branch: string, defaultBranch?: string, base?: string): Merge | undefined {
  const main = defaultBranchRef(root, defaultBranch);
  const tip = branchTip(root, branch);
  if (main === undefined || tip === undefined || [defaultBranch, "main", "master"].includes(branch)) return undefined;
  if (git(root, ["merge-base", "--is-ancestor", tip, main]) !== undefined) {
    // The first merge on the way from the branch to the default branch, or its tip after a fast-forward.
    const merge = lines(git(root, ["rev-list", "--ancestry-path", "--merges", "--reverse", `${tip}..${main}`]))[0];
    return { commit: merge ?? tip };
  }
  const shared = git(root, ["merge-base", tip, main])?.trim();
  if (shared === undefined || shared === "") return undefined;
  const files = lines(git(root, ["diff", "--name-only", shared, tip, "--", ".", ":(exclude).peer-ai"]));
  if (files.length === 0) {
    // Only Peer AI's own records are left unmerged, such as the commit that closed the item after
    // its pull request merged (#230): the branch's own work merged when its last commit outside
    // .peer-ai/, made after the item's base, is in the default branch.
    const work = git(root, ["rev-list", "-1", tip, "--", ".", ":(exclude).peer-ai"])?.trim();
    const own =
      base !== undefined &&
      work !== undefined &&
      work !== "" &&
      work !== base &&
      git(root, ["merge-base", "--is-ancestor", base, work]) !== undefined;
    if (!own || git(root, ["merge-base", "--is-ancestor", work, main]) === undefined) return undefined;
    const merge = lines(git(root, ["rev-list", "--ancestry-path", "--merges", "--reverse", `${work}..${main}`]))[0];
    return { commit: merge ?? work };
  }
  // A squash or rebase merge leaves no ancestry, but the default branch holds each file as the branch left it.
  return git(root, ["diff", "--quiet", main, tip, "--", ...files]) === undefined ? undefined : {};
}

/** What GitHub tells, through the gh command: the branch's pull request was merged, in any way. */
export function mergedOnGitHub(branch: string, run: Runner): Merge | undefined {
  const printed = run("gh", [
    "pr",
    "list",
    "--head",
    branch,
    "--state",
    "merged",
    "--json",
    "number,mergeCommit",
    "--limit",
    "1",
  ]);
  if (printed === undefined) return undefined;
  try {
    const [pull] = JSON.parse(printed) as { number?: number; mergeCommit?: { oid?: string } | null }[];
    if (pull?.number === undefined) return undefined;
    const commit = pull.mergeCommit?.oid;
    return { pullRequest: pull.number, ...(commit === undefined ? {} : { commit }) };
  } catch {
    return undefined;
  }
}

/** gh in the project's folder, so it finds the repository; undefined when it fails or isn't there. */
export const ghIn =
  (root: string): Runner =>
  (command, args) => {
    try {
      return execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      return undefined;
    }
  };

/** Whether an item's branch is merged: git first, then GitHub when a runner for gh is given. */
export function mergeOf(root: string, item: WorkItem, defaultBranch?: string, run?: Runner): Merge | undefined {
  // An item at prepare hasn't started: a merged branch of the same name is another item's (#230).
  if (item.branch === undefined || item.stage === "prepare") return undefined;
  return (
    mergedInGit(root, item.branch, defaultBranch, item.base) ??
    (run === undefined ? undefined : mergedOnGitHub(item.branch, run))
  );
}

/**
 * doctor's check, with no network: open items whose branches are merged into the default branch, as
 * git tells it, or are gone, as after a squash merge that deleted them. close-merged then asks GitHub.
 */
export function checkMerged(root: string, config: PeerAiConfig): Check[] {
  const defaultBranch = config.repo?.defaultBranch;
  if (defaultBranchRef(root, defaultBranch) === undefined) return [];
  const merged = allWorkItems(root).filter(
    ({ home, item }) =>
      !["done", "cancelled"].includes(item.stage) &&
      item.branch !== undefined &&
      (mergeOf(home, item, defaultBranch) !== undefined ||
        // At prepare, its branch may not have been made yet.
        (item.stage !== "prepare" && branchTip(home, item.branch) === undefined)),
  );
  if (merged.length === 0) return [];
  const ids = merged.map(({ item }) => item.id);
  return [
    warn(
      "merged",
      `${plural(merged.length, "open work item")} ${merged.length === 1 ? "looks" : "look"} merged already: ${ids.join(", ")}. ${merged.length === 1 ? "Its branch is" : "Their branches are"} in the default branch, or gone.`,
      "Close them with npx peer-ai close-merged: it checks each with git and GitHub, lists them, and asks first.",
    ),
  ];
}
