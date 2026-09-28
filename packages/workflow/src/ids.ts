// The fixed vocabularies the workflow is built on. Config and state are checked against
// these lists, so a misspelt activity or skill fails validation instead of being ignored.

/** The activities a work item can call. They replace v0's fixed line of phases. */
export const ACTIVITY_IDS = [
  "understand",
  "architect",
  "specify",
  "contract",
  "standards",
  "delivery-setup",
  "plan",
  "build",
  "verify",
  "test",
  "ship",
  "operate",
  "document",
  "retro",
] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

/** Peer AI's own skills. Each one is also a capability that config can extend with add-ons. */
export const SKILL_IDS = [
  "requirements-analysis",
  "product-spec",
  "architecture",
  "system-design",
  "api-design",
  "data-modelling",
  "threat-model",
  "design-system",
  "issue-planning",
  "implement-ticket",
  "code-review",
  "security-review",
  "contract-check",
  "accessibility-review",
  "design-review",
  "performance-review",
  "reliability-review",
  "data-migration-review",
  "dependency-review",
  "compliance-review",
  "test-strategy",
  "qa-acceptance",
  "ai-feature-review",
  "release-readiness",
  "infrastructure-review",
  "observability-review",
  "incident-response",
  "documentation",
  "tech-debt-triage",
] as const;
export type SkillId = (typeof SKILL_IDS)[number];

/** AI tools Peer AI renders instructions for. */
export const TOOL_IDS = ["claude-code", "codex", "cursor", "copilot", "gemini-cli", "other"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

/**
 * What a product is or does that switches on rules only some products need (RFC 0003). A
 * project lists its traits in its config; `peer-ai assess` suggests them from what it finds.
 */
export const TRAITS = [
  "money",
  "safety-critical",
  "several-audiences",
  "offline",
  "real-time",
  "uploads",
  "ai-features",
] as const;
export type Trait = (typeof TRAITS)[number];

/**
 * The standards' domains, each with the prefix its rule ids use (RFC 0003). The last two are
 * sets that apply only to a product with the trait of the same name.
 */
export const DOMAINS = {
  requirements: "REQ",
  architecture: "ARC",
  "system-design": "SYS",
  "api-design": "API",
  frontend: "FE",
  mobile: "MOB",
  "design-accessibility": "DES",
  backend: "BE",
  data: "DATA",
  performance: "PERF",
  reliability: "REL",
  security: "SEC",
  "privacy-compliance": "PRIV",
  testing: "TEST",
  delivery: "DEL",
  operations: "OPS",
  "ai-features": "AI",
  "code-quality": "CODE",
  money: "MONEY",
  "safety-critical": "SAFE",
} as const;
export type DomainId = keyof typeof DOMAINS;
export const DOMAIN_IDS = Object.keys(DOMAINS) as DomainId[];

/** How a rule is checked (RFC 0003): a tool, Peer AI's review with evidence, or a person's decision. */
export const CHECKS = ["auto", "ai-review", "person"] as const;
export type CheckKind = (typeof CHECKS)[number];

/**
 * What `peer-ai assess` records on the project map. A project can add its own items
 * with an `x-` prefix, such as `x-legal-review`.
 */
export const MAP_ITEM_IDS = [
  "requirements",
  "architecture",
  "threat-model",
  "specs",
  "api-contract",
  "data-model",
  "data-inventory",
  "dpia",
  "design",
  "standards",
  "ci",
  "environments",
  "tests",
  "load-testing",
  "infrastructure",
  "observability",
  "slos",
  "runbooks",
  "docs",
] as const;
export type KnownMapItemId = (typeof MAP_ITEM_IDS)[number];

export const CUSTOM_MAP_ITEM_PATTERN = /^x-[a-z0-9]+(-[a-z0-9]+)*$/;
