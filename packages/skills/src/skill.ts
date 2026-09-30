// A skill is a folder of files. Here it is held as a map from each file's path inside the folder
// (with forward slashes, as the Agent Skills standard requires) to its text.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export type SkillFiles = Map<string, string>;

/** Every file under a skill's folder, keyed by its path inside the folder. */
export function readSkillFiles(dir: string): SkillFiles {
  const files: SkillFiles = new Map();
  const walk = (relative: string) => {
    for (const entry of readdirSync(join(dir, relative)).sort()) {
      const path = relative === "" ? entry : `${relative}/${entry}`;
      if (statSync(join(dir, path)).isDirectory()) walk(path);
      else files.set(path, readFileSync(join(dir, path), "utf8"));
    }
  };
  walk("");
  return files;
}

export interface SkillDocument {
  frontmatter: Record<string, unknown>;
  body: string;
}

/** Splits SKILL.md into its YAML frontmatter and its Markdown body, or says why it can't. */
export function parseSkillMd(text: string): { ok: true; value: SkillDocument } | { ok: false; error: string } {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (match === null) return { ok: false, error: "SKILL.md must start with YAML frontmatter between --- lines." };
  let frontmatter: unknown;
  try {
    frontmatter = parse(match[1] ?? "");
  } catch (error) {
    return { ok: false, error: `SKILL.md's frontmatter isn't valid YAML: ${(error as Error).message}` };
  }
  if (typeof frontmatter !== "object" || frontmatter === null || Array.isArray(frontmatter)) {
    return { ok: false, error: "SKILL.md's frontmatter must be a set of fields, such as name and description." };
  }
  return { ok: true, value: { frontmatter: frontmatter as Record<string, unknown>, body: match[2] ?? "" } };
}
