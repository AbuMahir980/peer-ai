// Builds a skill from its source folder into the files a tool reads. A skill's own files are kept
// as they are, and three kinds of reference are generated so they can never drift:
// - rules.md, from @peer-ai/standards, for the domains the skill names in metadata.peer-ai-domains;
// - severity.md and report.md, shared by every review skill, from shared/.
// The skill is written under the name the caller chooses, and openai.yaml's {{name}} is filled in.

import { readFileSync } from "node:fs";
import { CORE_RULES, DOMAIN_INFO, type Rule } from "@peer-ai/standards";
import { SKILL_KINDS, type DomainId, type SkillId } from "@peer-ai/workflow";
import { parseSkillMd, type SkillFiles } from "./skill.ts";

const SHARED = new URL("../shared/", import.meta.url);
const shared = (file: string) => readFileSync(new URL(file, SHARED), "utf8");

const STAGE: Record<Rule["stage"], string> = { prototype: "prototype", mvp: "MVP", production: "production" };
const CHECK: Record<Rule["check"], string> = { auto: "a tool", "ai-review": "AI review", person: "a person" };

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

  const parsed = parseSkillMd(skillMd);
  const metadata = parsed.ok ? (parsed.value.frontmatter.metadata as Record<string, unknown> | undefined) : undefined;
  const domains = typeof metadata?.["peer-ai-domains"] === "string" ? metadata["peer-ai-domains"].split(/\s+/) : [];
  const known = domains.filter((domain): domain is DomainId => domain in DOMAIN_INFO);
  if (known.length > 0) files.set("references/rules.md", rulesReference(known));
  if (SKILL_KINDS[id] === "review") {
    files.set("references/severity.md", shared("severity.md"));
    files.set("references/report.md", shared("report.md"));
  }
  const openai = source.get("agents/openai.yaml");
  if (openai !== undefined) files.set("agents/openai.yaml", openai.replaceAll("{{name}}", name));
  return files;
}

/** The core rules for some domains, grouped by domain, as a reference a skill reads on demand. */
export function rulesReference(domains: DomainId[]): string {
  const groups = domains.map((domain) => ({
    domain,
    rules: CORE_RULES.filter((rule) => rule.domain === domain),
  }));
  const lines = [
    "# Rules",
    "",
    "Generated from @peer-ai/standards. The peer-ai `standards_for_file` tool returns the rules that apply to a file, filtered by the project's stage and traits, with its stack profile's and add-on's rules too. Use this list to understand a rule; use the tool to know which apply.",
    "",
    "## Contents",
    "",
    ...groups.map(({ domain, rules }) => {
      const span = rules.length === 0 ? "" : `: ${rules[0]?.id ?? ""} to ${rules.at(-1)?.id ?? ""}`;
      return `- ${DOMAIN_INFO[domain].title}${span}`;
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
