// peer-ai work: work items from a terminal (RFC 0017). `show` prints an item, open or closed, and with
// --full a closed one's full record from git; `move` puts an item on another track, which is what to
// do with an item left on a track that's retired or removed.

import { SKILL_IDS, type SkillId } from "peer-ai-workflow";
import { loadConfig } from "./assess.ts";
import { CONFIG_FILE } from "./detect.ts";
import type { Output } from "./init.ts";
import { lastFullFile, readHistory } from "./history.ts";
import { loadWorkItem, updateWorkItem } from "./work.ts";

export interface WorkOptions {
  cwd: string;
  action?: string | undefined;
  args: string[];
  /** For show: a closed item's full file, from git. */
  full?: boolean;
  now?: Date;
}

/** Exit code 0 done, 1 refused, 2 a usage error or no valid config. */
export function runWork(options: WorkOptions, out: Output): number {
  const usage = "Use peer-ai work show <id> [--full], or peer-ai work move <id> <track>.";
  if (options.action === "show") return show(options, usage, out);
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

/** An open item as its file holds it; a closed one as its history line, or with --full as git last held it. */
function show(options: WorkOptions, usage: string, out: Output): number {
  const [id] = options.args;
  if (id === undefined) {
    out.error(usage);
    return 2;
  }
  const closed = readHistory(options.cwd).find((line) => line.id === id);
  if (closed !== undefined) {
    if (options.full !== true) {
      out.log(JSON.stringify(closed, null, 2));
      return 0;
    }
    const full = lastFullFile(options.cwd, closed);
    if (full === undefined) {
      out.error(`${id} closed without a committed file, or its commit isn't in this clone's history.`);
      return 1;
    }
    out.log(full);
    return 0;
  }
  const item = loadWorkItem(options.cwd, id);
  if (!item.ok) {
    out.error(item.error);
    return 1;
  }
  out.log(JSON.stringify(item.value, null, 2));
  return 0;
}

export interface WaiveOptions {
  cwd: string;
  id?: string | undefined;
  skill?: string | undefined;
  reason?: string | undefined;
  by?: string | undefined;
  now?: Date;
}

/** `peer-ai waive`: a person's decision that an item doesn't need a review (RFC 0016). */
export function runWaive(options: WaiveOptions, out: Output): number {
  const { id, skill, reason, by } = options;
  if (id === undefined || skill === undefined || reason === undefined || by === undefined) {
    out.error('Use peer-ai waive <id> <skill> --reason "<why>" --by "<who decided>".');
    return 2;
  }
  if (!(SKILL_IDS as readonly string[]).includes(skill)) {
    out.error(`There is no skill "${skill}".`);
    return 2;
  }
  const { config, errors } = loadConfig(options.cwd);
  if (config === undefined) {
    out.error(
      errors === undefined ? `There is no ${CONFIG_FILE}. Run peer-ai init first.` : `${CONFIG_FILE} is not valid.`,
    );
    return 2;
  }
  const waived = updateWorkItem(
    options.cwd,
    config,
    id,
    { waive: { skill: skill as SkillId, reason, by } },
    options.now ?? new Date(),
  );
  if (!waived.ok) {
    out.error(waived.error);
    return 1;
  }
  out.log(
    `${id} doesn't need its ${skill}: ${reason} (decided by ${by}). peer-ai check lists it. Commit the change to its record.`,
  );
  return 0;
}
