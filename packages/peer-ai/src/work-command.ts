// peer-ai work: work items from a terminal (RFC 0017). `move` puts an item on another track, which
// is what to do with an item left on a track that's retired or removed.

import { loadConfig } from "./assess.ts";
import { CONFIG_FILE } from "./detect.ts";
import type { Output } from "./init.ts";
import { updateWorkItem } from "./work.ts";

export interface WorkOptions {
  cwd: string;
  action?: string | undefined;
  args: string[];
  now?: Date;
}

/** Exit code 0 done, 1 refused, 2 a usage error or no valid config. */
export function runWork(options: WorkOptions, out: Output): number {
  const usage = "Use peer-ai work move <id> <track>.";
  if (options.action !== "move") {
    out.error(usage);
    return 2;
  }
  const [id, track] = options.args;
  if (id === undefined || track === undefined) {
    out.error(usage);
    return 2;
  }
  const { config, errors } = loadConfig(options.cwd);
  if (config === undefined) {
    out.error(
      errors === undefined ? `There is no ${CONFIG_FILE}. Run peer-ai init first.` : `${CONFIG_FILE} is not valid.`,
    );
    return 2;
  }
  const moved = updateWorkItem(options.cwd, config, id, { track }, options.now ?? new Date());
  if (!moved.ok) {
    out.error(moved.error);
    return 1;
  }
  out.log(`${id} is on the track ${track}. Commit the change to its record.`);
  return 0;
}
