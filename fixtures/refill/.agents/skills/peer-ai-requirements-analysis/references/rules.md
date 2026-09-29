# Rules

Generated from @peer-ai/standards. The peer-ai MCP tool `standards_for_file` returns the rules that apply to a file, filtered by the project's stage and traits, with its stack profile's and add-on's rules too. Use this list to understand a rule; use the tool to know which apply.

## Contents

- Requirements: REQ-01 to REQ-04

## Requirements

What the product must do, for whom, and how anyone will know it works.

### REQ-01 A requirement names who it's for and the problem

A requirement says who it's for and the problem it solves, not only the solution someone has in mind.

- Why: A solution with no stated problem can't be questioned or improved, and often solves the wrong thing well.
- Ask: Does this requirement say who it's for and what problem it solves?
- From prototype. Checked by AI review. Severity: low.

### REQ-02 Every feature has acceptance criteria before it's built

Before a feature is built, it has acceptance criteria: what done looks like, written so it can be tested.

- Why: Without them, "done" means whatever the builder thought, and disagreements surface after the work is finished.
- Ask: Does this feature have testable acceptance criteria?
- From MVP. Checked by AI review. Severity: medium.

### REQ-03 The needs behind the features are written down

The needs that shape everything are written down: who uses the product and what they need to access it, how many people and how much data, where it operates and which laws apply, and how available it must be.

- Why: These needs decide the architecture, and discovering them late means rebuilding it.
- Ask: Are the product's users, scale, laws and availability needs written down?
- From MVP. Checked by AI review. Severity: medium.

### REQ-04 Ideas outside the agreed scope go to the backlog

An idea outside the agreed scope of a piece of work goes to the backlog, not into the change.

- Why: Scope that grows inside a change makes it late, hard to review and risky to ship.
- Ask: Does this change include anything outside its agreed scope?
- From MVP. Checked by AI review. Severity: low.
