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

/** What a skill produces (RFC 0004): a review report, a document, or changes to work items. */
export type SkillKind = "review" | "document" | "work";

export const SKILL_KINDS: Record<SkillId, SkillKind> = {
  "requirements-analysis": "document",
  "product-spec": "document",
  architecture: "document",
  "system-design": "document",
  "api-design": "document",
  "data-modelling": "document",
  "threat-model": "document",
  "design-system": "document",
  "issue-planning": "work",
  "implement-ticket": "work",
  "code-review": "review",
  "security-review": "review",
  "contract-check": "review",
  "accessibility-review": "review",
  "design-review": "review",
  "performance-review": "review",
  "reliability-review": "review",
  "data-migration-review": "review",
  "dependency-review": "review",
  "compliance-review": "review",
  "test-strategy": "document",
  "qa-acceptance": "review",
  "ai-feature-review": "review",
  "release-readiness": "review",
  "infrastructure-review": "review",
  "observability-review": "review",
  "incident-response": "work",
  documentation: "document",
  "tech-debt-triage": "work",
};

/** The tools Peer AI's MCP server offers, in the order it lists them. Skills name them. */
export const MCP_TOOL_IDS = [
  "project_map",
  "next_work",
  "work_item",
  "standards_for_file",
  "create_work_item",
  "update_work_item",
  "run_verify",
  "record_review",
  "check_document",
  "advance_work_item",
  "draft_feedback",
] as const;
export type McpToolId = (typeof MCP_TOOL_IDS)[number];

/** The peer-ai commands. Skills name them. */
export const CLI_COMMAND_IDS = [
  "init",
  "migrate",
  "assess",
  "render",
  "doctor",
  "check",
  "check-report",
  "check-document",
  "feedback",
  "ship",
  "waive",
  "work",
  "tidy",
  "close-merged",
  "mcp",
] as const;
export type CliCommandId = (typeof CLI_COMMAND_IDS)[number];

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

/**
 * The skills that fill each map item, in order (RFC 0004). standards, ci and environments have
 * none: next_work says what to set up for them instead.
 */
export const MAP_ITEM_SKILLS: Partial<Record<KnownMapItemId, SkillId[]>> = {
  requirements: ["requirements-analysis"],
  architecture: ["architecture"],
  "threat-model": ["threat-model"],
  specs: ["product-spec", "system-design"],
  "api-contract": ["api-design"],
  "data-model": ["data-modelling"],
  "data-inventory": ["compliance-review"],
  dpia: ["compliance-review"],
  design: ["design-system"],
  tests: ["test-strategy"],
  "load-testing": ["performance-review"],
  infrastructure: ["infrastructure-review"],
  observability: ["observability-review"],
  slos: ["observability-review"],
  runbooks: ["incident-response"],
  docs: ["documentation"],
};

export const CUSTOM_MAP_ITEM_PATTERN = /^x-[a-z0-9]+(-[a-z0-9]+)*$/;
