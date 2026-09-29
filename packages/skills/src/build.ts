// Builds a skill from its source folder into the files a tool reads. A skill's own files are kept
// as they are, and three kinds of reference are generated so they can never drift:
// - rules.md, from @peer-ai/standards: the domains in metadata.peer-ai-domains, and single rules from
//   other domains in metadata.peer-ai-rules;
// - severity.md and report.md, shared by every review skill, from shared/.
// The skill is written under the name the caller chooses, and openai.yaml's {{name}} is filled in.

import { readFileSync } from "node:fs";
import { CORE_RULES, DOMAIN_INFO, type Rule } from "@peer-ai/standards";
import { DOMAIN_IDS, SKILL_KINDS, type DomainId, type SkillId } from "@peer-ai/workflow";
import { parseSkillMd, type SkillFiles } from "./skill.ts";

const SHARED = new URL("../shared/", import.meta.url);
const shared = (file: string) => readFileSync(new URL(file, SHARED), "utf8");

const STAGE: Record<Rule["stage"], string> = { prototype: "prototype", mvp: "MVP", production: "production" };
const CHECK: Record<Rule["check"], string> = { auto: "a tool", "ai-review": "AI review", person: "a person" };

/** Rendered skills carry this prefix, so they never replace a tool's own skill of the same name. */
export const SKILL_NAME_PREFIX = "peer-ai-";

/** The name a skill is written under in a project, such as peer-ai-security-review. */
export const renderedName = (id: SkillId): string => `${SKILL_NAME_PREFIX}${id}`;

export interface BuildOptions {
  /** The name the skill is written under, such as peer-ai-security-review. Defaults to its id. */
  name?: string;
}

export function buildSkill(id: SkillId, source: SkillFiles, options: BuildOptions = {}): SkillFiles {
  const name = options.name ?? id;
  const files: SkillFiles = new Map(source);
  const skillMd = source.get("SKILL.md");
  if (skillMd === undefined) return files;
  files.set("SKILL.md", skillMd.replace(/^name: .*$/m, `name: ${name}`));

  const { domains, extra } = ruleChoice(skillMd);
  if (domains.length + extra.length > 0) files.set("references/rules.md", rulesReference(domains, extra));
  if (SKILL_KINDS[id] === "review") {
    files.set("references/severity.md", shared("severity.md"));
    files.set("references/report.md", shared("report.md"));
  }
  const openai = source.get("agents/openai.yaml");
  if (openai !== undefined) files.set("agents/openai.yaml", openai.replaceAll("{{name}}", name));
  return files;
}

/** The domains and single rules a skill's metadata names. */
function ruleChoice(skillMd: string): { domains: DomainId[]; extra: string[] } {
  const parsed = parseSkillMd(skillMd);
  const metadata = parsed.ok ? (parsed.value.frontmatter.metadata as Record<string, unknown> | undefined) : undefined;
  const words = (key: string) => {
    const value = metadata?.[key];
    return typeof value === "string" ? value.split(/\s+/).filter((word) => word !== "") : [];
  };
  return {
    domains: words("peer-ai-domains").filter((domain): domain is DomainId => domain in DOMAIN_INFO),
    extra: words("peer-ai-rules"),
  };
}

/** The ids of the rules a skill answers for, which its report must cover. */
export function ruleIdsFor(source: SkillFiles): string[] {
  const { domains, extra } = ruleChoice(source.get("SKILL.md") ?? "");
  return CORE_RULES.filter((rule) => domains.includes(rule.domain) || extra.includes(rule.id)).map((rule) => rule.id);
}

/** The rules a skill checks, as a reference it reads on demand: whole domains, then single rules, by domain. */
export function rulesReference(domains: DomainId[], extra: string[] = []): string {
  const chosen = CORE_RULES.filter((rule) => domains.includes(rule.domain) || extra.includes(rule.id));
  const order = [...domains, ...DOMAIN_IDS.filter((domain) => !domains.includes(domain))];
  const groups = order
    .map((domain) => ({ domain, rules: chosen.filter((rule) => rule.domain === domain) }))
    .filter((group) => group.rules.length > 0);
  const lines = [
    "# Rules",
    "",
    "Generated from @peer-ai/standards. The peer-ai `standards_for_file` tool returns the rules that apply to a file, filtered by the project's stage and traits, with its stack profile's and add-on's rules too. Use this list to understand a rule; use the tool to know which apply.",
    "",
    "## Contents",
    "",
    ...groups.map(({ domain, rules }) => {
      const ids = rules.map((rule) => rule.id);
      const whole = domains.includes(domain) && ids.length > 1;
      return `- ${DOMAIN_INFO[domain].title}: ${whole ? `${ids[0] ?? ""} to ${ids.at(-1) ?? ""}` : ids.join(", ")}`;
    }),
  ];
  for (const { domain, rules } of groups) {
    lines.push("", `## ${DOMAIN_INFO[domain].title}`, "", DOMAIN_INFO[domain].about);
    for (const rule of rules) {
      lines.push("", `### ${rule.id} ${rule.title}`, "", rule.rule, "", `- Why: ${rule.why}`, `- Ask: ${rule.ask}`);
      lines.push(`- From ${STAGE[rule.stage]}. Checked by ${CHECK[rule.check]}. Severity: ${rule.severity}.`);
      if (rule.when !== undefined) lines.push(`- Only for products with: ${rule.when.join(", ")}.`);
      for (const source of rule.sources ?? []) lines.push(`- Source: ${source.name}, ${source.ref}.`);
    }
  }
  return `${lines.join("\n")}\n`;
}
