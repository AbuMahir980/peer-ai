// peer-ai ship: moves a work item to ship from a terminal, as advance_work_item does for an AI tool
// (RFC 0013). With commands.verifyCheck, it takes CI's verify of the latest commit first, so a
// person can ship without running a slow verify again, and it says exactly what's still missing.

import { loadConfig } from "./assess.ts";
import { currentBranch } from "./commits.ts";
import { CONFIG_FILE } from "./detect.ts";
import type { Runner } from "./feedback.ts";
import { allWorkItems } from "./homes.ts";
import type { Output } from "./init.ts";
import { advanceWorkItem } from "./work.ts";

export interface ShipOptions {
  cwd: string;
  /** The item to ship; the open item on the branch checked out when left out. */
  id?: string | undefined;
  now?: Date;
  run?: Runner;
}

/** Exit code 0 when the item is at ship, 1 when something's missing, 2 when there's no item to ship. */
export function runShip(options: ShipOptions, out: Output): number {
  const { config, errors } = loadConfig(options.cwd);
  if (config === undefined) {
    out.error(
      errors === undefined ? `There is no ${CONFIG_FILE}. Run peer-ai init first.` : `${CONFIG_FILE} is not valid.`,
    );
    return 2;
  }
  const branch = currentBranch(options.cwd);
  const id =
    options.id ??
    allWorkItems(options.cwd).find(
      ({ item }) => item.branch === branch && !["ship", "done", "cancelled"].includes(item.stage),
    )?.item.id;
  if (id === undefined) {
    out.error(
      branch === undefined
        ? "No branch is checked out here. Give the work item's id: peer-ai ship <id>."
        : `No open work item is on ${branch}. Give its id: peer-ai ship <id>.`,
    );
    return 2;
  }
  const moved = advanceWorkItem(options.cwd, config, id, "ship", options.now ?? new Date(), options.run);
  if (!moved.ok) {
    for (const line of moved.error.split("\n")) out.error(line);
    return 1;
  }
  const ci = moved.value.lastVerify?.ci;
  out.log(`${id} is at ship${ci === undefined ? "" : `, verified by CI's ${ci.check}: ${ci.url}`}.`);
  out.log("Commit the change to its record and push it: peer-ai check on the pull request now passes for it.");
  return 0;
}
