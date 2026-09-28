import { DOMAIN_IDS, type DomainId, type Trait } from "@peer-ai/workflow";
import { aiFeatures } from "./core/ai-features.ts";
import { apiDesign } from "./core/api-design.ts";
import { architecture } from "./core/architecture.ts";
import { backend } from "./core/backend.ts";
import { codeQuality } from "./core/code-quality.ts";
import { data } from "./core/data.ts";
import { delivery } from "./core/delivery.ts";
import { designAccessibility } from "./core/design-accessibility.ts";
import { frontend } from "./core/frontend.ts";
import { mobile } from "./core/mobile.ts";
import { money } from "./core/money.ts";
import { operations } from "./core/operations.ts";
import { performance } from "./core/performance.ts";
import { privacyCompliance } from "./core/privacy-compliance.ts";
import { reliability } from "./core/reliability.ts";
import { requirements } from "./core/requirements.ts";
import { safetyCritical } from "./core/safety-critical.ts";
import { security } from "./core/security.ts";
import { systemDesign } from "./core/system-design.ts";
import { testing } from "./core/testing.ts";
import { RuleSchema, STAGES, traitsNeeded, type Rule, type RuleInput, type Stage } from "./rule.ts";

export { DOMAIN_INFO } from "./domains.ts";
export { RuleSchema, SourceSchema, STAGES, traitsNeeded, type Rule, type RuleInput, type Stage } from "./rule.ts";

const CORE_INPUTS: RuleInput[] = [
  ...requirements,
  ...architecture,
  ...systemDesign,
  ...apiDesign,
  ...frontend,
  ...mobile,
  ...designAccessibility,
  ...backend,
  ...data,
  ...performance,
  ...reliability,
  ...security,
  ...privacyCompliance,
  ...testing,
  ...delivery,
  ...operations,
  ...aiFeatures,
  ...codeQuality,
  ...money,
  ...safetyCritical,
];

/** Checks every rule against the schema and that no id is used twice. */
export function checkRules(inputs: RuleInput[]): { rules: Rule[]; problems: string[] } {
  const rules: Rule[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const input of inputs) {
    const result = RuleSchema.safeParse(input);
    if (!result.success) {
      for (const issue of result.error.issues) problems.push(`${input.id}: ${issue.path.join(".")}: ${issue.message}`);
      continue;
    }
    if (seen.has(result.data.id)) problems.push(`${result.data.id}: the id is used twice`);
    seen.add(result.data.id);
    rules.push(result.data);
  }
  return { rules, problems };
}

const checked = checkRules(CORE_INPUTS);
if (checked.problems.length > 0) {
  throw new Error(`Peer AI's standards aren't valid:\n- ${checked.problems.join("\n- ")}`);
}

/** Every core rule, in domain order. */
export const CORE_RULES: readonly Rule[] = [...checked.rules].sort(
  (a, b) =>
    DOMAIN_IDS.indexOf(a.domain) - DOMAIN_IDS.indexOf(b.domain) || a.id.localeCompare(b.id, "en", { numeric: true }),
);

export interface Selection {
  stage: Stage;
  traits?: readonly Trait[];
  domains?: readonly DomainId[];
}

/** The rules that apply to a project at its stage, with its traits, optionally in some domains only. */
export function rulesFor({ stage, traits = [], domains }: Selection): Rule[] {
  const reached = STAGES.indexOf(stage);
  return CORE_RULES.filter(
    (rule) =>
      STAGES.indexOf(rule.stage) <= reached &&
      traitsNeeded(rule).every((trait) => traits.includes(trait)) &&
      (domains === undefined || domains.includes(rule.domain)),
  );
}
