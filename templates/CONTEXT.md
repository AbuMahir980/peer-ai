# Session Context Log

This file is the **narrative companion** to `.workflow-state.json`. Copy it to your app root on day one and keep it updated throughout the project.

The workflow driver reads **both files** at every session start. The state file holds structured pointers (phase, ticket, step); this file holds the story (decisions, emails, daily progress, what's next).

**Update this file** when the user says "update the context", "wrap up", or "start a new chat", or when context usage is visibly high (~80%).

---

## Current State

_One paragraph: where the project stands right now — active phase, milestone, branch, and the immediate next action._

Example: "We are in the **build** phase on milestone `feature/auth-shell`. Auth login is done; customer list is in progress. Next: finish customer detail page."

---

## Key Decisions

_Canonical decisions made during this project. Use a table so they are easy to scan and reference._

| Date | Decision | Source |
|------|----------|--------|
| YYYY-MM-DD | _e.g. Greenfield only — no in-place refactor_ | _e.g. stakeholder email, team sync_ |
| | | |

---

## What Was Done — By Day

_Dated log of work completed each session. Add a new `### YYYY-MM-DD` block at the end of every session._

### YYYY-MM-DD (Day name)

- _What was accomplished_
- _Docs or specs updated_
- _Blockers hit and how they were resolved_

---

## What's Next

_Numbered list of the exact actions to take at the start of the next session, in order._

1. _First action_
2. _Second action_
3. _

---

## Open Questions

_Questions that are not yet answered. Remove or move to Key Decisions once resolved._

| Question | Status |
|----------|--------|
| _e.g. Separate branches per app or one monorepo branch?_ | _Open / Leaning toward X / Resolved_ |

---

## Package / Asset Locations

_Paths to handoff packages, design files, seed data, mockups, or other artefacts the agent needs to find without searching._

| Asset | Path |
|-------|------|
| _e.g. Handoff package v1.0_ | _absolute or repo-relative path_ |
| _e.g. Design mockup HTML_ | _path_ |

---

## Canvases / Artefacts

_Links or paths to Cursor canvases, Figma files, diagrams, or other visual artefacts produced during the project._

| Artefact | Purpose | Location |
|----------|---------|----------|
| _e.g. implementation-plan.canvas.tsx_ | _Screen-by-screen build plan_ | _Cursor canvases folder / path_ |
