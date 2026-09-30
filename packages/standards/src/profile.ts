import { CHECKS, SEVERITIES, TRAITS, type Trait } from "@peer-ai/workflow";
import { z } from "zod";
import { SourceSchema, STAGES, traitsNeeded, type Rule, type Stage } from "./rule.ts";

// A stack profile says how to follow core rules in one stack (RFC 0006). Each of its rules names
// the core rule it carries out, and may apply only to some architectures, hold a number the
// project can change, and name the tool setting that enforces it. An automatic rule comes with an
// example that must fail and one that must pass, which the tests run through the real tool.

const Text = z.string().min(1);
const Slug = z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, "use lowercase letters, digits and hyphens");
const CoreRuleId = z.string().regex(/^[A-Z][A-Z0-9]*-\d{2,}$/, "a core rule id, such as CODE-14");

/** A number or a choice a project may change in standards.overrides. */
export type Value = number | string;
const ValueSchema = z.union([z.number(), Text]);

/** The jobs of Peer AI's pipeline workflow that check a rule automatically (RFC 0006, section 4). */
export const PIPELINE_JOBS = ["secrets", "dependencies", "workflows", "code"] as const;
export type PipelineJob = (typeof PIPELINE_JOBS)[number];

/** Where an option holds this, the tool gets the rule's value: its default, or the project's. */
export const VALUE = "$value";

export const EnforcerSchema = z.discriminatedUnion("tool", [
  z.strictObject({
    tool: z.literal("eslint"),
    rule: Text.describe("The ESLint rule, with its plugin's prefix, such as @typescript-eslint/no-explicit-any."),
    options: z.array(z.unknown()).optional().describe(`The rule's options. "${VALUE}" stands for the rule's value.`),
    typed: z.boolean().optional().describe("The rule needs type information, so it runs on TypeScript files only."),
    files: z
      .array(Text)
      .min(1)
      .optional()
      .describe("The files it applies to, as globs within the part, such as **/*.tsx. None: every script."),
    ignores: z.array(Text).min(1).optional().describe("Files within those it leaves alone, such as **/*.test.*."),
  }),
  z.strictObject({
    tool: z.literal("ruff"),
    rule: z
      .string()
      .regex(/^[A-Z]+[0-9]+$/, "a Ruff rule code, such as S608")
      .describe("The Ruff rule's code."),
    settings: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(`Ruff's lint settings the rule reads, such as { pylint: { "max-statements": "${VALUE}" } }.`),
  }),
  z.strictObject({
    tool: z.literal("github-actions"),
    job: z.enum(PIPELINE_JOBS).describe("The job of Peer AI's pipeline workflow that runs the check."),
    finding: Text.optional().describe("What the tool reports for this rule, where one job checks several rules."),
  }),
  z.strictObject({
    tool: z.literal("typescript"),
    option: Text.describe("The compiler option, such as strict."),
    value: z.unknown().describe("The value it must have."),
  }),
]);
export type Enforcer = z.output<typeof EnforcerSchema>;
export type EnforcerTool = Enforcer["tool"];

/** Example code: fixed, or written for the rule's value, such as a function one line too long. */
export type Example = string | ((value: Value) => string);
const ExampleSchema = z.union([
  Text,
  z.custom<(value: Value) => string>((input) => typeof input === "function", "a string or a function of the value"),
]);

export const ExamplesSchema = z.strictObject({
  file: Text.describe("The example's file name, which sets its language, such as example.ts."),
  fails: ExampleSchema.describe("Code the enforcer must refuse."),
  passes: ExampleSchema.describe("Code the enforcer must accept."),
});

export const ProfileRuleSchema = z
  .strictObject({
    id: z.string().regex(/^[A-Z][A-Z0-9]*-\d{2,}$/, "use the profile's prefix and a number, such as TS-01"),
    title: Text.max(100),
    rule: Text,
    why: Text,
    ask: Text.regex(/\?$/, "the ask is a question"),
    stage: z.enum(STAGES),
    check: z.enum(CHECKS),
    severity: z.enum(SEVERITIES),
    when: z.array(z.enum(TRAITS)).min(1).optional(),
    sources: z.array(SourceSchema).min(1).optional(),
    carries: CoreRuleId.describe("The core rule this rule carries out in the stack."),
    architectures: z
      .array(Slug)
      .min(1)
      .optional()
      .describe("The architecture labels it applies to. A rule with none applies to every architecture."),
    default: z
      .strictObject({ value: ValueSchema, unit: Text.optional() })
      .optional()
      .describe("A number or a choice the project may change, which {value} in the text stands for."),
    enforcer: EnforcerSchema.optional(),
    examples: ExamplesSchema.optional(),
  })
  .superRefine((rule, ctx) => {
    const issue = (path: string, message: string) => {
      ctx.addIssue({ code: "custom", path: [path], message });
    };
    if (rule.check === "auto" && rule.enforcer === undefined) issue("enforcer", "an automatic rule names its enforcer");
    if (rule.check !== "auto" && rule.enforcer !== undefined) issue("check", "a rule with an enforcer is automatic");
    if (rule.enforcer !== undefined && rule.examples === undefined) {
      issue("examples", "an enforced rule has an example that must fail and one that must pass");
    }
    const settings =
      rule.enforcer?.tool === "eslint"
        ? rule.enforcer.options
        : rule.enforcer?.tool === "ruff"
          ? rule.enforcer.settings
          : undefined;
    const usesValue =
      `${rule.title} ${rule.rule}`.includes("{value}") || JSON.stringify(settings ?? []).includes(VALUE);
    if (usesValue && rule.default === undefined) issue("default", "a rule that uses {value} has a default");
  });

export type ProfileRuleInput = z.input<typeof ProfileRuleSchema>;

export const ProfileSchema = z.strictObject({
  id: Slug.describe("How a project lists the profile in standards.profiles, such as react-native."),
  name: Text,
  prefix: z.string().regex(/^[A-Z][A-Z0-9]*$/, "capital letters and digits, such as REACT"),
  about: Text.describe("What the profile covers, for its page."),
  stacks: z
    .array(Slug)
    .describe("The stack tags it applies to, as detection writes them. None: every part, when listed."),
  extends: z.array(Slug).optional().describe("Profiles it builds on, which apply wherever it does."),
  rules: z.array(ProfileRuleSchema),
});

export type ProfileInput = z.input<typeof ProfileSchema>;

/** A profile rule as the tools use it: with its profile, and the domain of the core rule it carries. */
export type ProfileRule = z.output<typeof ProfileRuleSchema> & { profile: string; domain: Rule["domain"] };

export interface Profile {
  id: string;
  name: string;
  prefix: string;
  about: string;
  stacks: string[];
  extends: string[];
  rules: ProfileRule[];
}

/**
 * Checks every profile against the schema and against the core: prefixes and ids used once, each
 * rule's id starting with its profile's prefix, each carried rule a core rule, and every profile
 * it extends known, without a loop.
 */
export function checkProfiles(
  inputs: ProfileInput[],
  core: readonly Rule[],
  corePrefixes: readonly string[],
): { profiles: Profile[]; problems: string[] } {
  const problems: string[] = [];
  const profiles: Profile[] = [];
  const coreById = new Map(core.map((rule) => [rule.id, rule]));
  const ids = new Set<string>();
  const prefixes = new Set<string>(corePrefixes);
  const ruleIds = new Set<string>();
  for (const input of inputs) {
    const result = ProfileSchema.safeParse(input);
    if (!result.success) {
      for (const issue of result.error.issues) problems.push(`${input.id}: ${issue.path.join(".")}: ${issue.message}`);
      continue;
    }
    const profile = result.data;
    if (ids.has(profile.id)) problems.push(`${profile.id}: the profile id is used twice`);
    if (prefixes.has(profile.prefix)) problems.push(`${profile.id}: the prefix ${profile.prefix} is already used`);
    ids.add(profile.id);
    prefixes.add(profile.prefix);
    const rules: ProfileRule[] = [];
    for (const rule of profile.rules) {
      if (!rule.id.startsWith(`${profile.prefix}-`)) {
        problems.push(`${rule.id}: a ${profile.id} rule's id starts with ${profile.prefix}-`);
      }
      if (ruleIds.has(rule.id)) problems.push(`${rule.id}: the id is used twice`);
      ruleIds.add(rule.id);
      const carried = coreById.get(rule.carries);
      if (carried === undefined) {
        problems.push(`${rule.id}: it carries ${rule.carries}, which isn't a core rule`);
        continue;
      }
      rules.push({ ...rule, profile: profile.id, domain: carried.domain });
    }
    profiles.push({ ...profile, extends: profile.extends ?? [], rules });
  }
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  for (const profile of profiles) {
    for (const base of profile.extends) {
      if (!byId.has(base)) problems.push(`${profile.id}: it extends ${base}, which isn't a profile`);
    }
    if (reachable(byId, profile.extends).has(profile.id)) problems.push(`${profile.id}: it extends itself`);
  }
  return { profiles, problems };
}

/** Every profile the given ones extend, directly or through others. */
function reachable(byId: ReadonlyMap<string, Profile>, start: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...start];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...(byId.get(id)?.extends ?? []));
  }
  return seen;
}

/** A part of the product, as a profile sees it. */
export interface Part {
  /** Stack tags, such as ["typescript", "expo"]. None: every listed profile applies. */
  stack?: readonly string[];
  /** The part's architecture label, such as layered. */
  architecture?: string;
}

/**
 * The listed profiles that apply to a part, with the profiles they extend, bases first. A listed
 * profile applies when the part's stack has one of its tags, when it names no stacks, or when the
 * part names no stack. A profile it extends comes only with it, never on its own tag.
 */
export function profilesFor(all: readonly Profile[], listed: readonly string[], part: Part): Profile[] {
  const byId = new Map(all.map((profile) => [profile.id, profile]));
  const stack = part.stack ?? [];
  const direct = listed.filter((id) => {
    const profile = byId.get(id);
    if (profile === undefined) return false;
    return stack.length === 0 || profile.stacks.length === 0 || profile.stacks.some((tag) => stack.includes(tag));
  });
  const applying = new Set([...direct, ...reachable(byId, direct)]);
  const ordered: Profile[] = [];
  const visit = (id: string) => {
    const profile = byId.get(id);
    if (profile === undefined || ordered.includes(profile) || !applying.has(id)) return;
    for (const base of profile.extends) visit(base);
    ordered.push(profile);
  };
  for (const id of all.map((profile) => profile.id)) visit(id);
  return ordered;
}

/** A profile rule as it applies to one project: its value set, and {value} filled in. */
export type AppliedRule = ProfileRule & { value?: Value };

export interface ProfileSelection extends Part {
  listed: readonly string[];
  stage: Stage;
  traits?: readonly Trait[];
  /** Values the project changed, by rule id, from standards.overrides. */
  overrides?: Readonly<Record<string, { value: Value }>>;
}

/** Puts the rule's value in its text, and in its enforcer's options. */
export function withValue(rule: ProfileRule, value: Value | undefined): AppliedRule {
  if (value === undefined) return rule;
  const fillText = (text: string) => text.replaceAll("{value}", String(value));
  const enforcer: Enforcer | undefined =
    rule.enforcer?.tool === "eslint" && rule.enforcer.options !== undefined
      ? { ...rule.enforcer, options: fillOptions(rule.enforcer.options, value) }
      : rule.enforcer?.tool === "ruff" && rule.enforcer.settings !== undefined
        ? { ...rule.enforcer, settings: fill(rule.enforcer.settings, value) as Record<string, unknown> }
        : rule.enforcer;
  return {
    ...rule,
    title: fillText(rule.title),
    rule: fillText(rule.rule),
    ask: fillText(rule.ask),
    ...(enforcer === undefined ? {} : { enforcer }),
    value,
  };
}

/** The options or settings with the rule's value put where they say $value. */
function fill(option: unknown, value: Value): unknown {
  if (option === VALUE) return value;
  if (Array.isArray(option)) return option.map((inner) => fill(inner, value));
  if (option !== null && typeof option === "object") {
    return Object.fromEntries(Object.entries(option).map(([key, inner]) => [key, fill(inner, value)]));
  }
  return option;
}

const fillOptions = (options: unknown, value: Value): unknown[] => fill(options, value) as unknown[];

/**
 * The profile rules that apply to a part at the project's stage, with its traits and its
 * architecture, and with the project's values in place of the defaults.
 */
export function applyProfiles(all: readonly Profile[], selection: ProfileSelection): AppliedRule[] {
  const reached = STAGES.indexOf(selection.stage);
  const traits = selection.traits ?? [];
  return profilesFor(all, selection.listed, selection)
    .flatMap((profile) => profile.rules)
    .filter(
      (rule) =>
        STAGES.indexOf(rule.stage) <= reached &&
        traitsNeeded(rule).every((trait) => traits.includes(trait)) &&
        (rule.architectures === undefined ||
          (selection.architecture !== undefined && rule.architectures.includes(selection.architecture))),
    )
    .map((rule) => {
      const changed = selection.overrides?.[rule.id]?.value;
      return withValue(rule, changed !== undefined && overrideFits(rule, changed) ? changed : rule.default?.value);
    });
}

/** Whether a project's value can stand in for the rule's default: a rule with one, and a value of its type. */
export function overrideFits(rule: ProfileRule, value: Value): boolean {
  return rule.default !== undefined && typeof value === typeof rule.default.value;
}
