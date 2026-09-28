# Workflow State File — Companion Guide

This document explains how `.peer-ai-state.json` works alongside `CONTEXT.md`. Both live at the **app root** (not inside `peer-ai/`).

---

## Two files, two jobs

| File | Purpose | What goes in it |
|------|---------|-----------------|
| `.peer-ai-state.json` | **Structured pointer** — where the agent is in the workflow | Phase, step, ticket ID, branch, ticket lists, timestamps |
| `CONTEXT.md` | **Narrative log** — the story behind the pointer | Decisions, emails, daily summaries, open questions, asset paths |

The workflow driver reads **both** at session start. Never put narrative content in the state file.

---

## The `notes` field — pointer only

The `notes` field in `.peer-ai-state.json` is a **one-liner pointer**, not a narrative dump. It tells the next session *where to look* and *what to do first* — nothing more.

### Good `notes` value

```json
"notes": "READ CONTEXT.md at app root for the full narrative. Next action: create milestone branch, copy handoff docs to docs/handoff/, create tickets per screen, begin Auth shell."
```

Why this works:
- Points to `CONTEXT.md` for the full story
- States the single next action in one line
- No email threads, no decision history, no day-by-day log

### Bad `notes` value

```json
"notes": "Stakeholder sent the green light email on Monday. We decided to go greenfield only. The v2 spec supersedes the v1 draft. Branch is feature/auth-shell. Seed accounts use a bypass code. Backend team said don't file individual contract tickets mid-build. We read all the handoff files. Plan updated to the latest spec version. Next: reply to stakeholder, create branch, copy docs..."
```

Why this fails:
- Narrative belongs in `CONTEXT.md`, not here
- Will bloat the state file across sessions
- Next session reads a wall of text instead of a clean pointer
- Duplicates content that should live in one canonical place

---

## When to update both files

Update **both** `.peer-ai-state.json` and `CONTEXT.md` together as a **single atomic action** when:

- The user says "update the context", "wrap up", or "start a new chat"
- Context usage is visibly near ~80%
- A phase or ticket transition completes
- An interruption ends and work resumes

Never update one without the other at session end.

---

## Field reference

| Field | Type | Description |
|-------|------|-------------|
| `currentPhase` | string | One of the fixed values listed under "`currentPhase` values" below — one per phase file |
| `currentStep` | number | Step number within the active phase file |
| `phaseFile` | string | Path to the active `peer-ai/` phase file |
| `cycle` | string | Human-readable cycle or milestone label |
| `milestoneBranch` | string | Long-lived branch for the current cycle |
| `ticket` | string | Active issue tracker ID (e.g. `PROJ-42`) |
| `ticketTitle` | string | Short title of the active ticket |
| `ticketsCompleted` | string[] | IDs of finished tickets |
| `ticketsCancelled` | string[] | IDs of tickets dropped from scope (kept so they are not re-created) |
| `ticketsInProgress` | string[] | IDs currently in progress |
| `ticketsRemaining` | string[] | IDs not yet started |
| `pendingAgents` | string[] | Agent prompts queued to run |
| `lastVerifyResult` | string | `pass` or `fail` from last verification run |
| `lastVerifyTimestamp` | string | ISO 8601 timestamp of last verify |
| `pdfExportOffered` | string | Phase name the PDF-export offer was last made for — empty if never. Stops the offer repeating on every document, or vanishing after the first |
| `lastUpdated` | string | ISO 8601 timestamp of last state update |
| `notes` | string | **One-liner pointer only** — see examples above |

---

## `currentPhase` values

Use exactly one of these values, so two sessions or two tools never name the same phase differently. The template carries the same list in a `_comment` key; delete that key once the file is filled in.

| Value | Phase file |
|-------|-----------|
| `setup` | `shared/00-setup.md` |
| `understand` | `shared/01-understand.md` |
| `architect` | `shared/02-architect.md` |
| `spec-system` | `shared/03-spec-system.md` |
| `spec-api-contract` | `shared/04-spec-api-contract.md` |
| `rules-shared` | `shared/05-rules-shared.md` |
| `spec-pages` | `frontend/01-spec-pages.md` |
| `spec-endpoints` | `backend/01-spec-endpoints.md` |
| `rules-track` | `frontend/02-rules.md` or `backend/02-rules.md` |
| `issues` | `shared/06-issues.md` |
| `build` | `frontend/03-build.md` or `backend/03-build.md` |
| `review` | `frontend/04-review.md` or `backend/04-review.md` |
| `test` | `frontend/05-test.md` or `backend/05-test.md` |
| `document` | `shared/07-document.md` |
| `pr-automation` | `shared/09-pr-automation.md` |
| `done` | Cycle complete. The next cycle starts again at `understand` or `issues`. |

**These values are checked, not merely suggested.** The workflow driver's
session-start step validates `currentPhase` against this table and corrects it
when it does not match, because a published list that nothing enforces drifts
anyway — this run found state files carrying `frontend-build` (the track is
already in `phaseFile`, so the value is `build`) and `review-complete` (a
status, not a phase; `phaseFile` said the value should be `test`). Both were
invented before the table existed and no phase ever re-read them.

The dev journal (`shared/08-dev-journal.md`) has no phase value: it runs alongside the phases and does not move the pointer. `phaseFile` always names the exact file, so the track (frontend or backend) is never ambiguous.

---

## Setup in a new project

1. Copy `templates/.peer-ai-state.json` → your app root as `.peer-ai-state.json`
2. Copy `templates/CONTEXT.md` → your app root as `CONTEXT.md`
3. Copy `peer-ai/shared/rules/workflow-driver.md` → your tool's rules config (`.cursor/rules/workflow-driver.mdc` for Cursor; appended to `CLAUDE.md` or `AGENTS.md` for other tools) and fill in its Project settings table
4. Fill in both files on day one with project name, cycle, and initial phase
5. Commit both files to git so the team shares the same pointer
