// A rough cost before a whole-project review (RFC 0016): each review skill's scope in the
// repository, the files and lines it would read and the rules it answers for, as small, medium or
// large, so the person can choose to run it whole, for one part, or not now. Rough, and says so.

import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { availableSkills, skillRuleIds } from "peer-ai-skills";
import { SKILL_IDS, SKILL_KINDS, type SkillId } from "peer-ai-workflow";
import { INFRASTRUCTURE_AS_CODE, MANIFEST, SCHEMA_FILE, TEST_FILE } from "./assess.ts";
import { listRepoFiles } from "./files.ts";
import { CODE, DEPLOYMENT, LOCKFILE, MIGRATION, SCREEN } from "./routing.ts";

/** The files each review reads across the whole project; source code when it isn't listed. */
const SCOPES: Partial<Record<SkillId, (file: string) => boolean>> = {
  "accessibility-review": (file) => SCREEN.test(file),
  "design-review": (file) => SCREEN.test(file),
  "data-migration-review": (file) => MIGRATION.test(file) || SCHEMA_FILE.test(file),
  "dependency-review": (file) => MANIFEST.test(file) || LOCKFILE.test(file),
  "infrastructure-review": (file) => INFRASTRUCTURE_AS_CODE.test(file) || DEPLOYMENT.test(file),
  "compliance-review": (file) => SCHEMA_FILE.test(file) || (CODE.test(file) && !TEST_FILE.test(file)),
};
const source = (file: string) => CODE.test(file) && !TEST_FILE.test(file);

/** Rough tokens a review spends: reading and reasoning per line in scope, and a line per rule. */
const PER_LINE = 30;
const PER_RULE = 1_500;
/** Files larger than this are counted at this size: generated or vendored files aren't read whole. */
const MOST_BYTES = 200_000;

export interface ReviewSize {
  files: number;
  lines: number;
  rules: number;
  size: "small" | "medium" | "large";
  /** The token range the size means, roughly. */
  tokens: string;
}

const SIZES: [ReviewSize["size"], number, string][] = [
  ["small", 150_000, "under 150,000 tokens"],
  ["medium", 600_000, "150,000 to 600,000 tokens"],
  ["large", Number.POSITIVE_INFINITY, "over 600,000 tokens"],
];

/** Each review skill's rough size, over the whole project. */
export function reviewSizes(root: string): Partial<Record<SkillId, ReviewSize>> {
  const files = listRepoFiles(root);
  const lineCounts = new Map<string, number>();
  const linesOf = (file: string): number => {
    const known = lineCounts.get(file);
    if (known !== undefined) return known;
    let lines = 0;
    try {
      const bytes = statSync(join(root, file)).size;
      lines =
        bytes > MOST_BYTES ? Math.round(MOST_BYTES / 40) : readFileSync(join(root, file), "utf8").split("\n").length;
    } catch {
      // A file that can't be read adds nothing.
    }
    lineCounts.set(file, lines);
    return lines;
  };
  const available = availableSkills();
  const sizes: Partial<Record<SkillId, ReviewSize>> = {};
  for (const skill of SKILL_IDS) {
    if (SKILL_KINDS[skill] !== "review" || !available.includes(skill)) continue;
    const scope = files.filter(SCOPES[skill] ?? source);
    const lines = scope.reduce((sum, file) => sum + linesOf(file), 0);
    const rules = skillRuleIds(skill).length;
    const estimate = lines * PER_LINE + rules * PER_RULE;
    const [size, , tokens] = SIZES.find(([, limit]) => estimate < limit) ?? SIZES[2] ?? ["large", 0, ""];
    sizes[skill] = { files: scope.length, lines, rules, size, tokens };
  }
  return sizes;
}
