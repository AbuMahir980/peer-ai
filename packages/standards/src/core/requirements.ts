import type { RuleInput } from "../rule.ts";

// What the product must do, for whom, and how anyone will know it works.

export const requirements = [
  {
    id: "REQ-01",
    domain: "requirements",
    title: "A requirement names who it's for and the problem",
    rule: "A requirement says who it's for and the problem it solves, not only the solution someone has in mind.",
    why: "A solution with no stated problem can't be questioned or improved, and often solves the wrong thing well.",
    ask: "Does this requirement say who it's for and what problem it solves?",
    stage: "prototype",
    check: "ai-review",
    severity: "low",
  },
  {
    id: "REQ-02",
    domain: "requirements",
    title: "Every feature has acceptance criteria before it's built",
    rule: "Before a feature is built, it has acceptance criteria: what done looks like, written so it can be tested.",
    why: 'Without them, "done" means whatever the builder thought, and disagreements surface after the work is finished.',
    ask: "Does this feature have testable acceptance criteria?",
    stage: "mvp",
    check: "ai-review",
    severity: "medium",
  },
  {
    id: "REQ-03",
    domain: "requirements",
    title: "The needs behind the features are written down",
    rule: "The needs that shape everything are written down: who uses the product and what they need to access it, how many people and how much data, where it operates and which laws apply, and how available it must be.",
    why: "These needs decide the architecture, and discovering them late means rebuilding it.",
    ask: "Are the product's users, scale, laws and availability needs written down?",
    stage: "mvp",
    check: "ai-review",
    severity: "medium",
  },
  {
    id: "REQ-04",
    domain: "requirements",
    title: "Ideas outside the agreed scope go to the backlog",
    rule: "An idea outside the agreed scope of a piece of work goes to the backlog, not into the change.",
    why: "Scope that grows inside a change makes it late, hard to review and risky to ship.",
    ask: "Does this change include anything outside its agreed scope?",
    stage: "mvp",
    check: "ai-review",
    severity: "low",
  },
] satisfies RuleInput[];
