<!-- Copy this file to your app root as CONTEXT.md on day one. Replace [PLACEHOLDER] values and the _italic guidance_ under each header. Remove this comment when done. -->

# Session Context Log

This file is the **narrative companion** to `.workflow-state.json`. The workflow driver (or any AI following the workflow) reads **both files** at every session start. The state file holds structured pointers (phase, ticket, step); this file holds the story (decisions, daily progress, what's next).

**Update this file** when the user says "update the context", "wrap up", or "start a new chat", or when context usage is visibly high (~80%).

---

## Current State

_One paragraph: where the project stands right now — active phase, milestone, branch, and the immediate next action._

`[PLACEHOLDER: e.g. In the build phase on milestone feature/auth-shell. Auth login done; customer list in progress. Next: finish customer detail page.]`

---

## Key Decisions

_Canonical decisions made during this project. Use a table so they are easy to scan and reference._

| Date | Decision | Source |
|------|----------|--------|
| `[PLACEHOLDER: YYYY-MM-DD]` | `[PLACEHOLDER: e.g. Single-page app, no SSR]` | `[PLACEHOLDER: e.g. stakeholder email, team sync]` |
| | | |

---

## What Was Done — By Day

_Dated log of work completed each session. Add a new `### YYYY-MM-DD` block at the end of every session._

### `[PLACEHOLDER: YYYY-MM-DD (Day name)]`

- `[PLACEHOLDER: What was accomplished]`
- `[PLACEHOLDER: Docs or specs updated]`
- `[PLACEHOLDER: Blockers hit and how they were resolved]`

---

## What's Next

_Numbered list of the exact actions to take at the start of the next session, in order._

1. `[PLACEHOLDER: First action]`
2. `[PLACEHOLDER: Second action]`
3. `[PLACEHOLDER]`

---

## Open Questions

_Questions that are not yet answered. Remove or move to Key Decisions once resolved._

| Question | Status |
|----------|--------|
| `[PLACEHOLDER: e.g. One repo or split frontend/backend?]` | `[PLACEHOLDER: Open / Leaning toward X / Resolved]` |

---

## Package / Asset Locations

_Paths to handoff packages, design files, seed data, mockups, or other artefacts the agent needs to find without searching._

| Asset | Path |
|-------|------|
| `[PLACEHOLDER: e.g. Design mockups]` | `[PLACEHOLDER: absolute or repo-relative path]` |
| `[PLACEHOLDER: e.g. Seed data]` | `[PLACEHOLDER: path]` |

---

## Canvases / Artefacts

_Links or paths to canvases, Figma files, diagrams, or other visual artefacts produced during the project._

| Artefact | Purpose | Location |
|----------|---------|----------|
| `[PLACEHOLDER: e.g. implementation-plan]` | `[PLACEHOLDER: e.g. Screen-by-screen build plan]` | `[PLACEHOLDER: path or link]` |
