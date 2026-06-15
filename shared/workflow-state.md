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
"notes": "READ CONTEXT.md at app root for the full narrative. Next action: create milestone branch, copy handoff docs to docs/handoff/, create Linear tickets per screen, begin Auth shell."
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
| `currentPhase` | string | Active phase name (`understand`, `build`, `review`, `test`, `document`, etc.) |
| `currentStep` | number | Step number within the active phase file |
| `phaseFile` | string | Path to the active `peer-ai/` phase file |
| `cycle` | string | Human-readable cycle or milestone label |
| `milestoneBranch` | string | Long-lived branch for the current cycle |
| `ticket` | string | Active issue tracker ID (e.g. `PROJ-42`) |
| `ticketTitle` | string | Short title of the active ticket |
| `ticketsCompleted` | string[] | IDs of finished tickets |
| `ticketsInProgress` | string[] | IDs currently in progress |
| `ticketsRemaining` | string[] | IDs not yet started |
| `pendingAgents` | string[] | Agent prompts queued to run |
| `lastVerifyResult` | string | `pass` or `fail` from last verification run |
| `lastVerifyTimestamp` | string | ISO 8601 timestamp of last verify |
| `lastUpdated` | string | ISO 8601 timestamp of last state update |
| `notes` | string | **One-liner pointer only** — see examples above |

---

## Setup in a new project

1. Copy `templates/.peer-ai-state.json` → your app root as `.peer-ai-state.json`
2. Copy `templates/CONTEXT.md` → your app root as `CONTEXT.md`
3. Copy `shared/rules/workflow-driver.md` → your app `.cursor/rules/`
4. Fill in both files on day one with project name, cycle, and initial phase
5. Commit both files to git so the team shares the same pointer
