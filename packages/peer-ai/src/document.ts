// The check a document skill hands its output to (RFC 0004): the check_document tool and
// peer-ai check-document. It compares a document with its skill's template and names each missing
// part, each empty one, template text left in, and each rule id that doesn't exist, so the skill
// can fix them and check again.

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import {
  availableSkills,
  checkDocument as compare,
  describeProblems,
  documentInfo,
  loadSkill,
  templatePath,
  type DocumentProblems,
} from "@peer-ai/skills";
import { CORE_RULES } from "@peer-ai/standards";
import { DOMAINS, SKILL_IDS, SKILL_KINDS, type SkillId } from "@peer-ai/workflow";
import type { Output } from "./init.ts";
import type { Result } from "./work.ts";

export interface DocumentInput {
  skill: string;
  /** The document's path, relative to the project root. */
  path: string;
  /** Which of the skill's templates it follows. Defaults to the main one. */
  template?: string | undefined;
}

export interface CheckedDocument extends DocumentProblems {
  skill: SkillId;
  path: string;
  template: string;
  ready: boolean;
  /** What to change, in sentences; empty when the document is ready. */
  problems: string[];
}

const failed = (error: string): { ok: false; error: string } => ({ ok: false, error });
const RULES = {
  ruleIds: new Set(CORE_RULES.map((rule) => rule.id)),
  corePrefixes: new Set<string>(Object.values(DOMAINS)),
};

export function checkDocumentFile(root: string, input: DocumentInput): Result<CheckedDocument> {
  const { skill } = input;
  if (!(SKILL_IDS as readonly string[]).includes(skill)) {
    return failed(`${skill} isn't one of Peer AI's skills.`);
  }
  const id = skill as SkillId;
  if (SKILL_KINDS[id] !== "document") {
    return failed(
      SKILL_KINDS[id] === "review"
        ? `${id} is a review skill: record its report with record_review, or check it with peer-ai check-report.`
        : `${id} changes work items rather than writing a document; the work item's own gates check it.`,
    );
  }
  if (!availableSkills().includes(id)) {
    return failed(`This version of Peer AI doesn't have the ${id} skill yet, so there's no template to check against.`);
  }
  const files = loadSkill(id);
  const { templates } = documentInfo(files);
  const name = input.template ?? templates[0];
  const template = name === undefined ? undefined : files.get(templatePath(name));
  if (name === undefined || template === undefined) {
    return failed(`${id} has no template called ${name ?? "(none)"}. Its templates are: ${templates.join(", ")}.`);
  }
  const full = resolve(root, input.path);
  const inside = relative(root, full);
  if (inside === "" || inside.startsWith("..") || isAbsolute(inside)) {
    return failed(`${input.path} is outside the project. Save the document inside it.`);
  }
  if (!existsSync(full)) return failed(`There is no document at ${input.path}.`);
  const found = compare(readFileSync(full, "utf8"), template, RULES);
  const problems = describeProblems(found);
  return {
    ok: true,
    value: { skill: id, path: input.path, template: name, ready: problems.length === 0, problems, ...found },
  };
}

export interface CheckDocumentOptions extends DocumentInput {
  cwd: string;
  json: boolean;
}

/**
 * peer-ai check-document: the same check as the check_document tool, for CI and for a model or a
 * person that works in a shell. Exit code 0 when the document is ready; 1 when it isn't, or can't
 * be checked.
 */
export function runCheckDocument(options: CheckDocumentOptions, out: Output): number {
  const checked = checkDocumentFile(options.cwd, options);
  if (options.json) {
    out.log(JSON.stringify(checked.ok ? { ok: true, ...checked.value } : { ok: false, error: checked.error }, null, 2));
  } else if (!checked.ok) {
    out.error(`✗ ${checked.error}`);
  } else if (checked.value.ready) {
    out.log(`✓ ${options.path} has every part of the ${checked.value.skill} template.`);
  } else {
    out.error(`✗ ${options.path} isn't ready:`);
    for (const problem of checked.value.problems) out.error(`- ${problem}`);
  }
  return checked.ok && checked.value.ready ? 0 : 1;
}
