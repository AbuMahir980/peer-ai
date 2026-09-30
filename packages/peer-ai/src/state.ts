// Reads Peer AI's state files: the project map, and one file per work item. Problems are
// returned, never thrown, so each command decides how serious they are.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { MAP_ITEM_IDS, validateMap, validateWorkItem, type ProjectMap, type WorkItem } from "peer-ai-workflow";
import { MAP_FILE, type Assessment } from "./assess.ts";

export const WORK_DIR = ".peer-ai/work";

/** On failure, `error` completes a sentence that starts with the file's path. */
export type Read<T> = { ok: true; value: T } | { ok: false; error: string };

function readJson(path: string): Read<unknown> {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, "utf8")) };
  } catch (error) {
    return { ok: false, error: `is not valid JSON: ${(error as Error).message}` };
  }
}

/** The project map, or undefined when there is none yet. */
export function readMap(root: string): Read<ProjectMap> | undefined {
  const path = join(root, MAP_FILE);
  if (!existsSync(path)) return undefined;
  const json = readJson(path);
  if (!json.ok) return json;
  const result = validateMap(json.value);
  return result.ok ? result : { ok: false, error: `is not valid: ${result.errors.join("; ")}` };
}

export interface WorkItemFile {
  /** The path from the project root, such as .peer-ai/work/SHOP-1.json. */
  path: string;
  item: Read<WorkItem>;
}

/** Every work item, sorted by file name. A file whose id doesn't match its name is an error. */
export function readWorkItems(root: string): WorkItemFile[] {
  const dir = join(root, WORK_DIR);
  if (statSync(dir, { throwIfNoEntry: false })?.isDirectory() !== true) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const path = `${WORK_DIR}/${file}`;
      const json = readJson(join(dir, file));
      if (!json.ok) return { path, item: json };
      const result = validateWorkItem(json.value);
      if (!result.ok) return { path, item: { ok: false, error: `is not valid: ${result.errors.join("; ")}` } };
      const id = basename(file, ".json");
      if (result.value.id !== id) {
        return {
          path,
          item: { ok: false, error: `has the id "${result.value.id}", but a work item's file is named after its id` },
        };
      }
      return { path, item: result };
    });
}

/** Items whose status on the map differs from a fresh assessment, as "tests (missing → present)". */
export function mapChanges(map: ProjectMap, assessment: Assessment): string[] {
  return MAP_ITEM_IDS.filter((id) => map.items[id]?.status !== assessment.items[id].status).map(
    (id) => `${id} (${map.items[id]?.status ?? "not recorded"} → ${assessment.items[id].status})`,
  );
}
