// Writes the readable pages in docs/ from the rules: one page per domain, and an index. The
// rules in src/ are the source; a test fails if the committed pages fall behind them.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMAIN_IDS, type DomainId } from "@peer-ai/workflow";
import { CORE_RULES, DOMAIN_INFO, traitsNeeded, type Rule } from "../src/index.ts";

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

export function renderIndex(): string {
  const rows = DOMAIN_IDS.map((domain) => {
    const count = CORE_RULES.filter((rule) => rule.domain === domain).length;
    const { title } = DOMAIN_INFO[domain];
    return count === 0 ? `| ${title} | Coming |` : `| [${title}](${domain}.md) | ${String(count)} |`;
  });
  return `${[
    "# Peer AI standards",
    "",
    "Generated from the rules in `src/core/`. Don't edit these pages by hand: change a rule, then run `pnpm --filter @peer-ai/standards generate`.",
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
  ].join("\n")}\n`;
}

/** Every page, by file name. */
export function renderAll(): Map<string, string> {
  const pages = new Map<string, string>([["README.md", renderIndex()]]);
  for (const domain of DOMAIN_IDS) {
    const page = renderDomain(domain);
    if (page !== undefined) pages.set(`${domain}.md`, page);
  }
  return pages;
}

const invokedDirectly = process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  mkdirSync(DOCS_DIR, { recursive: true });
  for (const file of readdirSync(DOCS_DIR)) rmSync(join(DOCS_DIR, file));
  for (const [file, content] of renderAll()) {
    writeFileSync(join(DOCS_DIR, file), content);
    console.log(`wrote docs/${file}`);
  }
}
