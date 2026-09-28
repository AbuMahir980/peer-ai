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
