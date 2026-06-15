# Design vs Data Contract — Conflict Resolution

When a design spec (mockup, Figma, HTML preview) and an API/data contract disagree, use this rule:

---

## The principle

| Source wins on… | Examples |
|-----------------|----------|
| **API / data contract** | Field names, data types, response shapes, nullable fields, enum values, pagination structure |
| **Design spec** | Layout, spacing, visual hierarchy, component placement, typography, colour, responsive breakpoints |

---

## In practice

- The UI must **display the data the contract defines** — even if the mockup labels a field differently or omits it.
- The UI must **look like the design defines** — even if the contract returns extra fields the mockup didn't show.
- If the contract is missing a field the design needs → log it as a **contract gap** and resolve before building.
- If the design shows a field the contract doesn't provide → log it as a **design gap** and resolve before building.
- **Never silently pick one side.** Name the conflict, log it, get agreement, then update the canonical doc.

---

## Where conflicts get logged

During build, record discrepancies in your project's findings log (e.g. `FINDINGS.md`) with the category: `contract`, `design`, `spec`, or `package-handoff`.

See also: `.workflow/agents/contract-check-prompt.md` for automated verification after API integration.
