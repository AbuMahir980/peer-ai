// Checks a built skill against the Agent Skills specification (agentskills.io/specification),
// Anthropic's and OpenAI's authoring guidance, and RFC 0004. Every problem names its file and says
// what to change. See AUTHORING.md for the reasons behind each limit.

import { posix } from "node:path";
import { CLI_COMMAND_IDS, DOMAIN_IDS, MCP_TOOL_IDS, type SkillKind } from "peer-ai-workflow";
import { parse } from "yaml";
import { documentInfo, templatePath } from "./build.ts";
import { templateParts } from "./document.ts";
import { parseSkillMd, type SkillFiles } from "./skill.ts";

export const LIMITS = {
  /** The specification's limit. */
  name: 64,
  /**
   * Stricter than the specification's 1,024: all 29 descriptions together must fit Codex's budget
   * for skill descriptions, which is 8,000 characters when it doesn't know the model's context.
   */
  description: 250,
  descriptionBudget: 8000,
  compatibility: 500,
  /** Anthropic's and OpenAI's advice: keep SKILL.md under 500 lines and move detail to references. */
  bodyLines: 500,
  /** A reference longer than this opens with a table of contents, so a partial read still shows its scope. */
  referenceLines: 100,
  /** OpenAI's range for openai.yaml's short_description. */
  shortDescription: { min: 25, max: 64 },
} as const;

const FIELDS = ["name", "description", "license", "compatibility", "metadata", "allowed-tools"];
const KINDS: SkillKind[] = ["review", "document", "work"];
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED = /anthropic|claude/;
const XML_TAG = /<\/?[A-Za-z][^>]*>/;
const FIRST_OR_SECOND_PERSON = /\b(I|I'm|me|my|we|our|you|your)\b/i;
const WHEN = /\bwhen\b/i;
const ROLE_PLAY = /\bYou are (a|an|the)\b/;
const MODEL_SWITCH = /\bswitch(?:ing)? (?:to )?(?:a |an |the |your )?(?:[\w-]+ )?model\b/i;
const NOT_IN_A_SKILL = ["README.md", "CHANGELOG.md", "INSTALLATION_GUIDE.md", "QUICK_REFERENCE.md"];
const RULE_ID = /\b([A-Z]{2,5})-\d{2,}\b/g;
const TOOL = /peer-ai MCP tool `([a-z_]+)`/g;
/** The older wording, which a fast model read as a shell command to run with npx. */
const AMBIGUOUS_TOOL = /peer-ai `[a-z_]+` tool/;
const COMMAND = /`(?:npx )?peer-ai ([a-z][a-z-]*)/g;
/** The peer-ai MCP tool each kind of skill hands its output to. Work skills pass the work item's own gates. */
const OUTPUT_CHECK: Partial<Record<SkillKind, string>> = { review: "record_review", document: "check_document" };
// A link's target stops at the next ], ( or ), and both parts have a length limit, so a long run of
// unclosed links can't make the search slow.
const LINK = /\]\(([^()\]\s]{1,500})(?:\s+"[^"\n]{0,200}")?\)/g;

export interface Expectations {
  /** The name the skill is written under, which is also its folder's name. */
  name: string;
  /** The kind RFC 0004 gives this skill. */
  kind: SkillKind;
  /** Every rule id Peer AI has. */
  ruleIds: ReadonlySet<string>;
  /** The prefixes of core rule ids, such as SEC. An id with another prefix belongs to a profile or add-on. */
  corePrefixes: ReadonlySet<string>;
}

/** Every problem with a built skill. An empty list means it's ready to ship. */
export function validateSkill(files: SkillFiles, expect: Expectations): string[] {
  const problems: string[] = [];
  const skillMd = files.get("SKILL.md");
  if (skillMd === undefined) return ["SKILL.md is missing."];
  const parsed = parseSkillMd(skillMd);
  if (!parsed.ok) return [parsed.error];
  const { frontmatter, body } = parsed.value;

  for (const field of Object.keys(frontmatter)) {
    if (!FIELDS.includes(field)) problems.push(`SKILL.md: "${field}" isn't a field the standard allows.`);
  }
  problems.push(...checkName(frontmatter.name, expect.name));
  problems.push(...checkDescription(frontmatter.description));
  if (frontmatter.license !== "MIT") problems.push('SKILL.md: license must be "MIT".');
  const { compatibility } = frontmatter;
  if (
    compatibility !== undefined &&
    (typeof compatibility !== "string" || compatibility.length > LIMITS.compatibility)
  ) {
    problems.push(`SKILL.md: compatibility must be text of at most ${String(LIMITS.compatibility)} characters.`);
  }
  problems.push(...checkMetadata(frontmatter.metadata, expect.kind, expect.ruleIds));
  problems.push(...checkOutput(files, body, expect.kind));

  const lines = body.split("\n").length;
  if (lines > LIMITS.bodyLines) {
    problems.push(
      `SKILL.md: the body is ${String(lines)} lines; keep it under ${String(LIMITS.bodyLines)} and move detail to references.`,
    );
  }
  if (ROLE_PLAY.test(body)) problems.push('SKILL.md: no role-play such as "You are a…"; say what to do.');
  if (MODEL_SWITCH.test(body)) problems.push("SKILL.md: don't ask anyone to switch models.");

  for (const [path, text] of files) {
    if (NOT_IN_A_SKILL.includes(posix.basename(path))) {
      problems.push(`${path}: a skill holds only what the agent needs; people's documentation lives outside it.`);
    }
    if (path.endsWith(".md")) problems.push(...checkMarkdown(path, text, files, expect));
  }
  const openai = files.get("agents/openai.yaml");
  if (openai !== undefined) problems.push(...checkOpenAiYaml(openai, expect.name));
  return problems;
}

function checkName(name: unknown, expected: string): string[] {
  if (typeof name !== "string" || name === "") return ["SKILL.md: name is missing."];
  const problems: string[] = [];
  if (name.length > LIMITS.name) problems.push(`SKILL.md: name is longer than ${String(LIMITS.name)} characters.`);
  if (!NAME.test(name)) {
    problems.push(
      "SKILL.md: name may hold only lowercase letters, digits and single hyphens, and can't start or end with a hyphen.",
    );
  }
  if (RESERVED.test(name)) problems.push('SKILL.md: name can\'t contain "anthropic" or "claude".');
  if (name !== expected) problems.push(`SKILL.md: name is "${name}", but the skill is written under "${expected}".`);
  return problems;
}

function checkDescription(description: unknown): string[] {
  if (typeof description !== "string" || description.trim() === "") return ["SKILL.md: description is missing."];
  const problems: string[] = [];
  if (description.length > LIMITS.description) {
    problems.push(
      `SKILL.md: description is ${String(description.length)} characters; the limit is ${String(LIMITS.description)}.`,
    );
  }
  if (XML_TAG.test(description)) problems.push("SKILL.md: description can't contain XML tags.");
  if (FIRST_OR_SECOND_PERSON.test(description)) {
    problems.push('SKILL.md: write the description in the third person, such as "Reviews…", not "I…" or "you…".');
  }
  if (!WHEN.test(description)) problems.push("SKILL.md: description must say when to use the skill.");
  return problems;
}

function checkMetadata(metadata: unknown, kind: SkillKind, ruleIds: ReadonlySet<string>): string[] {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return ["SKILL.md: metadata is missing; it holds peer-ai-kind."];
  }
  const problems: string[] = [];
  const entries = Object.entries(metadata as Record<string, unknown>);
  for (const [key, value] of entries) {
    if (typeof value !== "string") problems.push(`SKILL.md: metadata.${key} must be text.`);
  }
  const values = Object.fromEntries(entries) as Record<string, unknown>;
  const declared = values["peer-ai-kind"];
  if (typeof declared !== "string" || !(KINDS as string[]).includes(declared)) {
    problems.push("SKILL.md: metadata.peer-ai-kind must be review, document or work.");
  } else if (declared !== kind) {
    problems.push(`SKILL.md: metadata.peer-ai-kind is ${declared}, but RFC 0004 makes this skill a ${kind} skill.`);
  }
  const rules = values["peer-ai-rules"];
  if (typeof rules === "string") {
    for (const id of rules.split(/\s+/).filter((word) => word !== "")) {
      if (!ruleIds.has(id))
        problems.push(`SKILL.md: metadata.peer-ai-rules names ${id}, which isn't one of Peer AI's rules.`);
    }
  }
  const domains = values["peer-ai-domains"];
  if (typeof domains === "string") {
    for (const domain of domains.split(/\s+/).filter((word) => word !== "")) {
      if (!(DOMAIN_IDS as string[]).includes(domain)) {
        problems.push(`SKILL.md: metadata.peer-ai-domains names "${domain}", which isn't a standards domain.`);
      }
    }
  }
  return problems;
}

/** Each kind of skill hands its output to Peer AI's check (RFC 0004), and a document skill has its templates. */
function checkOutput(files: SkillFiles, body: string, kind: SkillKind): string[] {
  const problems: string[] = [];
  const check = OUTPUT_CHECK[kind];
  if (check !== undefined && !body.includes(`peer-ai MCP tool \`${check}\``)) {
    problems.push(`SKILL.md: a ${kind} skill ends by handing its output to the peer-ai MCP tool \`${check}\`.`);
  }
  const { templates, path } = documentInfo(files);
  if (kind !== "document") {
    if (templates.length > 0 || path !== undefined) {
      problems.push("SKILL.md: only document skills have metadata.peer-ai-templates and metadata.peer-ai-path.");
    }
    return problems;
  }
  if (templates.length === 0) {
    problems.push(
      "SKILL.md: metadata.peer-ai-templates must name the document's templates, such as requirements for assets/requirements.md.",
    );
  }
  if (path === undefined) {
    problems.push(
      "SKILL.md: metadata.peer-ai-path must say where the document is saved, such as docs/requirements.md.",
    );
  } else if (path.includes("\\") || posix.isAbsolute(path) || posix.normalize(path).startsWith("..")) {
    problems.push(`SKILL.md: metadata.peer-ai-path must be a path inside the project, with forward slashes: ${path}.`);
  }
  for (const name of templates) {
    const file = templatePath(name);
    const template = files.get(file);
    if (template === undefined) {
      problems.push(`SKILL.md: metadata.peer-ai-templates names ${name}, but ${file} is missing.`);
      continue;
    }
    if (!template.startsWith("# ")) problems.push(`${file}: start with the document's title, as a "# " heading.`);
    if (!templateParts(template).some((part) => part.required)) {
      problems.push(`${file}: give the document at least one required part, as a "## " heading.`);
    }
  }
  return problems;
}

function checkMarkdown(path: string, text: string, files: SkillFiles, expect: Expectations): string[] {
  const problems: string[] = [];
  const isReference = path !== "SKILL.md";
  const lines = text.split("\n");
  if (isReference && lines.length > LIMITS.referenceLines && !lines.slice(0, 30).includes("## Contents")) {
    problems.push(`${path}: it's ${String(lines.length)} lines, so it needs a "## Contents" list near the top.`);
  }
  for (const [, target = ""] of text.matchAll(LINK)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    if (target.includes("\\")) {
      problems.push(`${path}: the link ${target} uses backslashes; use forward slashes.`);
      continue;
    }
    const resolved = posix.normalize(posix.join(posix.dirname(path), target.split("#")[0] ?? ""));
    if (resolved.startsWith("..") || posix.isAbsolute(target)) {
      problems.push(`${path}: the link ${target} points outside the skill.`);
    } else if (!files.has(resolved)) {
      problems.push(`${path}: the link ${target} points to a file the skill doesn't have.`);
    } else if (isReference && resolved.endsWith(".md")) {
      problems.push(`${path}: links to ${resolved}; keep references one level deep, linked only from SKILL.md.`);
    }
  }
  for (const [id, prefix = ""] of text.matchAll(RULE_ID)) {
    if (expect.corePrefixes.has(prefix) && !expect.ruleIds.has(id)) {
      problems.push(`${path}: names ${id}, which isn't one of Peer AI's rules.`);
    }
  }
  if (AMBIGUOUS_TOOL.test(text)) {
    problems.push(`${path}: name a tool as "the peer-ai MCP tool \`name\`", so it isn't mistaken for a shell command.`);
  }
  for (const [, tool = ""] of text.matchAll(TOOL)) {
    if (!(MCP_TOOL_IDS as readonly string[]).includes(tool)) {
      problems.push(`${path}: names the peer-ai tool ${tool}, which the MCP server doesn't have.`);
    }
  }
  for (const [, command = ""] of text.matchAll(COMMAND)) {
    if (!(CLI_COMMAND_IDS as readonly string[]).includes(command)) {
      problems.push(`${path}: names peer-ai ${command}, which isn't a peer-ai command.`);
    }
  }
  return problems;
}

/** Codex's agents/openai.yaml: the name, blurb and starting prompt shown in its skill list. */
function checkOpenAiYaml(text: string, name: string): string[] {
  let value: unknown;
  try {
    value = parse(text);
  } catch (error) {
    return [`agents/openai.yaml isn't valid YAML: ${(error as Error).message}`];
  }
  const ui = (value as { interface?: Record<string, unknown> } | null)?.interface;
  if (ui === undefined) return ["agents/openai.yaml needs an interface section."];
  const problems: string[] = [];
  if (typeof ui.display_name !== "string" || ui.display_name === "") {
    problems.push("agents/openai.yaml: interface.display_name is missing.");
  }
  const short = ui.short_description;
  const { min, max } = LIMITS.shortDescription;
  if (typeof short !== "string" || short.length < min || short.length > max) {
    problems.push(
      `agents/openai.yaml: interface.short_description must be ${String(min)} to ${String(max)} characters.`,
    );
  }
  const prompt = ui.default_prompt;
  if (typeof prompt !== "string" || !prompt.includes(`$${name}`)) {
    problems.push(`agents/openai.yaml: interface.default_prompt must name the skill as $${name}.`);
  }
  return problems;
}

/** All descriptions together must fit Codex's budget for skill descriptions. */
export function checkDescriptionBudget(descriptions: string[]): string[] {
  const total = descriptions.reduce((sum, description) => sum + description.length, 0);
  return total > LIMITS.descriptionBudget
    ? [
        `The skills' descriptions total ${String(total)} characters; together they must fit in ${String(LIMITS.descriptionBudget)}.`,
      ]
    : [];
}
