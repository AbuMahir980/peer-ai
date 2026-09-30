// Writes the readable pages in docs/ from the rules: one page per domain, one per stack profile in
// docs/profiles/, and an index. The rules in src/ are the source; a test fails if the committed
// pages fall behind them.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMAIN_IDS, type DomainId } from "peer-ai-workflow";
import { CORE_RULES, DOMAIN_INFO, PROFILES, traitsNeeded, withValue, type Profile, type Rule } from "../src/index.ts";

export const DOCS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");

const STAGE_NAMES = { prototype: "Prototype", mvp: "MVP", production: "Production" } as const;
const CHECK_NAMES = { auto: "A tool", "ai-review": "AI review", person: "A person" } as const;
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function renderRule(rule: Rule): string {
  const traits = traitsNeeded(rule);
  const sources = (rule.sources ?? [])
    .map((source) =>
      source.url === undefined ? `${source.name}, ${source.ref}` : `[${source.name}, ${source.ref}](${source.url})`,
    )
    .join("; ");
  return [
    `## ${rule.id} · ${rule.title}`,
    "",
    rule.rule,
    "",
    `**Why:** ${rule.why}`,
    "",
    `**Ask:** ${rule.ask}`,
    "",
    "| Applies from | Checked by | Severity | Applies when | Source |",
    "|--------------|------------|----------|--------------|--------|",
    `| ${STAGE_NAMES[rule.stage]} | ${CHECK_NAMES[rule.check]} | ${capitalise(rule.severity)} | ${traits.length === 0 ? "Always" : traits.map((t) => `\`${t}\``).join(", ")} | ${sources === "" ? "–" : sources} |`,
  ].join("\n");
}

/** The page for one domain, or undefined when it has no rules yet. */
export function renderDomain(domain: DomainId): string | undefined {
  const rules = CORE_RULES.filter((rule) => rule.domain === domain);
  if (rules.length === 0) return undefined;
  const { title, about } = DOMAIN_INFO[domain];
  return `${[`# ${title}`, "", about, "", ...rules.flatMap((rule) => [renderRule(rule), ""])].join("\n").trimEnd()}\n`;
}

const TOOL_NAMES = {
  eslint: "ESLint",
  ruff: "Ruff",
  typescript: "the TypeScript compiler",
  "github-actions": "Peer AI's pipeline workflow",
} as const;

/** What checks a rule, and in which tool: `max-depth`, in ESLint. */
function enforcedBy(enforcer: NonNullable<Profile["rules"][number]["enforcer"]>): string {
  const what =
    enforcer.tool === "typescript"
      ? enforcer.option
      : enforcer.tool === "github-actions"
        ? `${enforcer.job} job`
        : enforcer.rule;
  return `\`${what}\`, in ${TOOL_NAMES[enforcer.tool]}`;
}

function renderProfileRule(rule: Profile["rules"][number]): string {
  const shown = withValue(rule, rule.default?.value);
  const enforcer = rule.enforcer === undefined ? "–" : enforcedBy(rule.enforcer);
  const lines = [
    `## ${rule.id} · ${shown.title}`,
    "",
    shown.rule,
    "",
    `**Why:** ${rule.why}`,
    "",
    `**Ask:** ${shown.ask}`,
  ];
  if (rule.default !== undefined) {
    const unit = rule.default.unit === undefined ? "" : ` ${rule.default.unit}`;
    lines.push(
      "",
      `**Default:** ${String(rule.default.value)}${unit}. A project changes it in \`standards.overrides\`, with its reason.`,
    );
  }
  const architectures = rule.architectures === undefined ? "Any" : rule.architectures.map((a) => `\`${a}\``).join(", ");
  lines.push(
    "",
    "| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |",
    "|--------------|------------|----------|---------|---------------|-------------|",
    `| ${STAGE_NAMES[rule.stage]} | ${CHECK_NAMES[rule.check]} | ${capitalise(rule.severity)} | [${rule.carries}](../${rule.domain}.md) | ${architectures} | ${enforcer} |`,
  );
  return lines.join("\n");
}

/** The page for one stack profile. */
export function renderProfile(profile: Profile): string {
  const bases = profile.extends.map((id) => `[${id}](${id}.md)`).join(", ");
  const facts = [
    `List it in \`standards.profiles\` as \`${profile.id}\`.`,
    profile.stacks.length === 0
      ? "It applies to the project as a whole: its rules go with the pipeline's files in `.github/`, and with files outside every part."
      : `It applies to parts tagged ${profile.stacks.map((tag) => `\`${tag}\``).join(", ")}.`,
    ...(bases === "" ? [] : [`It builds on ${bases}, which apply wherever it does.`]),
  ];
  return `${[`# ${profile.name}`, "", profile.about, "", facts.join(" "), "", ...profile.rules.flatMap((rule) => [renderProfileRule(rule), ""])].join("\n").trimEnd()}\n`;
}

export function renderIndex(): string {
  const rows = DOMAIN_IDS.map((domain) => {
    const count = CORE_RULES.filter((rule) => rule.domain === domain).length;
    const { title } = DOMAIN_INFO[domain];
    return count === 0 ? `| ${title} | Coming |` : `| [${title}](${domain}.md) | ${String(count)} |`;
  });
  return `${[
    "# Peer AI standards",
    "",
    "Generated from the rules in `src/core/`. Don't edit these pages by hand: change a rule, then run `pnpm --filter peer-ai-standards generate`.",
    "",
    "Every rule has an id, the rule in plain words, why it matters, a question a reviewer can answer, the stage it applies from, how it's checked and how serious breaking it usually is. The design is in [RFC 0003](../../../rfcs/0003-how-a-standard-is-written.md).",
    "",
    "- **Checked by a tool:** a linter, the type checker, a test or a scanner fails the build.",
    "- **Checked by AI review:** Peer AI's review checks it on every change and shows its evidence in a report.",
    "- **Checked by a person:** a real decision, such as accepting a risk.",
    "",
    "| Domain | Rules |",
    "|--------|-------|",
    ...rows,
    "",
    "## Stack profiles",
    "",
    "A stack profile says how to follow the core rules in one stack, and which tool enforces each automatic rule. The design is in [RFC 0006](../../../rfcs/0006-stack-profiles-and-their-enforcers.md).",
    "",
    "| Profile | Id | Builds on | Rules |",
    "|---------|----|-----------|-------|",
    ...PROFILES.map(
      (profile) =>
        `| [${profile.name}](profiles/${profile.id}.md) | \`${profile.id}\` | ${profile.extends.length === 0 ? "–" : profile.extends.join(", ")} | ${String(profile.rules.length)} |`,
    ),
  ].join("\n")}\n`;
}

/** Every page, by file name. */
export function renderAll(): Map<string, string> {
  const pages = new Map<string, string>([["README.md", renderIndex()]]);
  for (const domain of DOMAIN_IDS) {
    const page = renderDomain(domain);
    if (page !== undefined) pages.set(`${domain}.md`, page);
  }
  for (const profile of PROFILES) pages.set(`profiles/${profile.id}.md`, renderProfile(profile));
  return pages;
}

const invokedDirectly = process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  rmSync(DOCS_DIR, { recursive: true, force: true });
  for (const [file, content] of renderAll()) {
    mkdirSync(dirname(join(DOCS_DIR, file)), { recursive: true });
    writeFileSync(join(DOCS_DIR, file), content);
    console.log(`wrote docs/${file}`);
  }
}
