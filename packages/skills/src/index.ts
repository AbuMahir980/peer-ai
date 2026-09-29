// @peer-ai/skills: Peer AI's skills in the Agent Skills format (RFC 0004). Each skill's source
// lives in skills/<id>/; buildSkill adds its generated references, and validateSkill checks the
// result. peer-ai render writes built skills where each AI tool reads them.

import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SKILL_IDS, type SkillId } from "@peer-ai/workflow";
import { buildSkill, ruleIdsFor, type BuildOptions } from "./build.ts";
import { readSkillFiles, type SkillFiles } from "./skill.ts";

export {
  SKILL_NAME_PREFIX,
  buildSkill,
  documentInfo,
  renderedName,
  ruleIdsFor,
  rulesReference,
  templatePath,
  type BuildOptions,
  type DocumentInfo,
} from "./build.ts";
export {
  checkDocument,
  describeProblems,
  headingKey,
  templateParts,
  type DocumentProblems,
  type RuleIds,
  type TemplatePart,
} from "./document.ts";
export { parseSkillMd, readSkillFiles, type SkillDocument, type SkillFiles } from "./skill.ts";
export { LIMITS, checkDescriptionBudget, validateSkill, type Expectations } from "./validate.ts";

const SKILLS_DIR = fileURLToPath(new URL("../skills/", import.meta.url));

/** The skills written so far, in the order RFC 0001 lists them. All 29 by the end of step 21. */
export function availableSkills(): SkillId[] {
  if (!existsSync(SKILLS_DIR)) return [];
  const folders = readdirSync(SKILLS_DIR);
  return SKILL_IDS.filter((id) => folders.includes(id));
}

/** A skill, built and ready to write. */
export function loadSkill(id: SkillId, options: BuildOptions = {}): SkillFiles {
  return buildSkill(id, readSkillFiles(`${SKILLS_DIR}${id}`), options);
}

/** The ids of the rules a skill answers for, which its report must cover. */
export function skillRuleIds(id: SkillId): string[] {
  return ruleIdsFor(readSkillFiles(`${SKILLS_DIR}${id}`));
}
