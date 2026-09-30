import { CHECKS, DOMAIN_IDS, DOMAINS, SEVERITIES, TRAITS, type DomainId, type Trait } from "peer-ai-workflow";
import { z } from "zod";

// What every rule has (RFC 0003): an id, the rule in plain words, why it matters, a question a
// reviewer can answer, the stage it applies from, how it's checked, how serious breaking it
// usually is, and where it comes from when an outside standard is the source.

export const STAGES = ["prototype", "mvp", "production"] as const;
export type Stage = (typeof STAGES)[number];

const Text = z.string().min(1);

export const SourceSchema = z.strictObject({
  name: Text.describe("The outside standard and its version, such as OWASP ASVS 5.0."),
  ref: Text.describe("The requirement within it, such as 8.2.2."),
  url: z.url().optional(),
});

export const RuleSchema = z
  .strictObject({
    id: z.string().regex(/^[A-Z][A-Z0-9]*-\d{2,}$/, "use the domain's prefix and a number, such as SEC-07"),
    domain: z.enum(DOMAIN_IDS),
    title: Text.max(100).describe("The rule in one short line."),
    rule: Text.describe("The rule itself, in plain words."),
    why: Text.describe("What goes wrong without it."),
    ask: Text.regex(/\?$/, "the ask is a question").describe("The question a reviewer answers."),
    stage: z.enum(STAGES).describe("The rule applies from this stage on."),
    check: z.enum(CHECKS),
    severity: z.enum(SEVERITIES).describe("How serious breaking it usually is, on RFC 0002's scale."),
    when: z.array(z.enum(TRAITS)).min(1).optional().describe("The traits a product must have for the rule to apply."),
    sources: z.array(SourceSchema).min(1).optional(),
  })
  .superRefine((rule, ctx) => {
    const prefix = DOMAINS[rule.domain];
    if (!rule.id.startsWith(`${prefix}-`)) {
      ctx.addIssue({ code: "custom", path: ["id"], message: `a ${rule.domain} rule's id starts with ${prefix}-` });
    }
  });

export type RuleInput = z.input<typeof RuleSchema>;
export type Rule = z.output<typeof RuleSchema>;

/** The sets that apply only to a product with the trait of the same name. */
const SET_TRAITS: Partial<Record<DomainId, Trait>> = { money: "money", "safety-critical": "safety-critical" };

/** The traits a product needs for this rule to apply. */
export function traitsNeeded(rule: Pick<Rule, "domain" | "when">): Trait[] {
  const set = SET_TRAITS[rule.domain];
  return [...new Set([...(set === undefined ? [] : [set]), ...(rule.when ?? [])])];
}
