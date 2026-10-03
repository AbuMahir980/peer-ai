// peer-ai tidy: moves a project's closed work items into the history and removes reports of items
// that are gone (RFC 0017), for a project that closed items before closing did it for them.

import { loadConfig } from "./assess.ts";
import { plural, warn, type Check } from "./checks.ts";
import { CONFIG_FILE } from "./detect.ts";
import { tidy, untidy, type Untidy } from "./history.ts";
import type { Output } from "./init.ts";
import { Cancelled, type Prompter } from "./prompter.ts";
import { readWorkItems } from "./state.ts";

const liveItems = (root: string) => readWorkItems(root).flatMap(({ item }) => (item.ok ? [item.value] : []));

function describe(found: Untidy): string[] {
  return [
    ...found.closed.map((item) => `  ${item.id} (${item.stage}): ${item.title}`),
    ...found.orphanReports.map((folder) => `  ${folder}/: reports of an item that's gone`),
  ];
}

/** doctor's check: closed items still in the tree, or reports of items that are gone. */
export function checkTidy(root: string): Check[] {
  const found = untidy(root, liveItems(root));
  const count = found.closed.length + found.orphanReports.length;
  if (count === 0) return [];
  const parts = [
    ...(found.closed.length === 0
      ? []
      : [`${plural(found.closed.length, "closed work item")} still in .peer-ai/work/`]),
    ...(found.orphanReports.length === 0
      ? []
      : [`${plural(found.orphanReports.length, "report folder")} of items that are gone`]),
  ];
  return [
    warn(
      "tidy",
      `Found ${parts.join(", and ")}.`,
      "Tidy them with npx peer-ai tidy: closed items become a line each in .peer-ai/history/, and git keeps the rest.",
    ),
  ];
}

export interface TidyOptions {
  cwd: string;
  yes: boolean;
}

/** Exit code 0 done or nothing to do, 1 declined, 2 without a terminal and --yes, or no valid config. */
export async function runTidy(options: TidyOptions, prompter: Prompter | undefined, out: Output): Promise<number> {
  if (loadConfig(options.cwd).config === undefined) {
    out.error(`There is no valid ${CONFIG_FILE}. Run peer-ai init first.`);
    return 2;
  }
  const found = untidy(options.cwd, liveItems(options.cwd));
  if (found.closed.length + found.orphanReports.length === 0) {
    out.log("Nothing to tidy: only open work items are in the tree.");
    return 0;
  }
  out.log("To tidy:");
  for (const line of describe(found)) out.log(line);
  if (!options.yes) {
    if (prompter === undefined) {
      out.error("tidy asks before it moves anything, so it needs a terminal. To tidy without asking, pass --yes.");
      return 2;
    }
    try {
      if (!(await prompter.confirm("Move the closed items into the history, and remove those reports?", true))) {
        out.log("Nothing was changed.");
        return 1;
      }
    } catch (error) {
      if (error instanceof Cancelled) {
        out.log("Cancelled. Nothing was changed.");
        return 1;
      }
      throw error;
    }
  }
  tidy(options.cwd, found);
  out.log(
    `Moved ${plural(found.closed.length, "closed item")} into .peer-ai/history/, and removed ${plural(found.orphanReports.length, "report folder")}. Commit the change on a branch and open a pull request.`,
  );
  return 0;
}
