// peer-ai close-merged: closes every open work item whose branch is already merged (RFC 0013),
// recording how, so work that merged before the ship gate, or while it wasn't required, doesn't
// need its branch checked out and verified again. It lists them and asks first: all, one by one, or
// none; and it leaves out the items a person kept open after their merge, and any named to skip (RFC 0020).

import { loadConfig } from "./assess.ts";
import { shortCommit } from "./commits.ts";
import { CONFIG_FILE } from "./detect.ts";
import type { Runner } from "./feedback.ts";
import type { Output } from "./init.ts";
import { ghIn, type Merge } from "./merged.ts";
import { Cancelled, type Prompter } from "./prompter.ts";
import { allWorkItems } from "./homes.ts";
import { closeByMerge, mergedItems } from "./work.ts";

export interface CloseMergedOptions {
  cwd: string;
  yes: boolean;
  /** Items to leave open, by id, though their branches merged. */
  skip?: readonly string[];
  now?: Date;
  /** gh, to ask GitHub about squash merges and branches git no longer has. */
  run?: Runner;
}

/** How a branch was found merged, for the list. */
export function describeMerge(merge: Merge): string {
  if (merge.pullRequest !== undefined) {
    return `pull request #${String(merge.pullRequest)}${merge.commit === undefined ? "" : `, ${shortCommit(merge.commit)}`}`;
  }
  return merge.commit === undefined ? "its changes are all in the default branch" : `in ${shortCommit(merge.commit)}`;
}

/** Exit code 0 when nothing needed closing or everything closed; 1 when declined or something failed; 2 on a usage error. */
export async function runCloseMerged(
  options: CloseMergedOptions,
  prompter: Prompter | undefined,
  out: Output,
): Promise<number> {
  const { config, errors } = loadConfig(options.cwd);
  if (config === undefined) {
    out.error(
      errors === undefined ? `There is no ${CONFIG_FILE}. Run peer-ai init first.` : `${CONFIG_FILE} is not valid.`,
    );
    return 2;
  }
  // Items a person kept open after their merge are listed, with why, and left alone.
  for (const { item } of allWorkItems(options.cwd)) {
    if (item.openAfterMerge === undefined || item.stage === "done" || item.stage === "cancelled") continue;
    out.log(`Kept open: ${item.id}, ${item.openAfterMerge.reason} (decided by ${item.openAfterMerge.by})`);
  }
  const skip = new Set(options.skip ?? []);
  const merged = mergedItems(options.cwd, config, options.run ?? ghIn(options.cwd));
  for (const { item } of merged.filter(({ item }) => skip.has(item.id))) out.log(`Skipped: ${item.id}, as asked.`);
  let found = merged.filter(({ item }) => !skip.has(item.id));
  if (found.length === 0) {
    out.log("No open work item's branch is merged, apart from any kept open or skipped.");
    return 0;
  }
  out.log("These open work items' branches are already merged:");
  for (const { item, merge } of found) out.log(`  ${item.id} (${item.stage}): ${item.title}, ${describeMerge(merge)}`);
  if (!options.yes) {
    if (prompter === undefined) {
      out.error(
        "close-merged asks before it closes anything, so it needs a terminal. To close them without asking, pass --yes, with --skip <id> for any to leave open.",
      );
      return 2;
    }
    try {
      const how =
        found.length === 1
          ? (await prompter.confirm("Close it, recording that its branch was merged?", true))
            ? "all"
            : "none"
          : await prompter.select(
              `Close them, recording that their branches were merged?`,
              [
                { value: "all", label: `Close all ${String(found.length)}` },
                { value: "choose", label: "Choose one by one" },
                { value: "none", label: "Close none" },
              ],
              "all",
            );
      if (how === "choose") {
        const chosen: typeof found = [];
        for (const each of found) {
          if (await prompter.confirm(`Close ${each.item.id}, ${each.item.title}?`, true)) chosen.push(each);
        }
        found = chosen;
      }
      if (how === "none" || found.length === 0) {
        out.log("Nothing was closed.");
        return 1;
      }
    } catch (error) {
      if (error instanceof Cancelled) {
        out.log("Cancelled. Nothing was closed.");
        return 1;
      }
      throw error;
    }
  }
  const now = options.now ?? new Date();
  const problems = found.flatMap(({ home, item, merge }) => {
    const closed = closeByMerge(home, config, item, merge, now);
    return closed.ok ? [] : [`${item.id}: ${closed.error}`];
  });
  const closed = found.length - problems.length;
  out.log(
    `Closed ${String(closed)} ${closed === 1 ? "item" : "items"}, each recording how. Commit the change on a branch and open a pull request.`,
  );
  for (const problem of problems) out.error(`  ${problem}`);
  return problems.length === 0 ? 0 : 1;
}
