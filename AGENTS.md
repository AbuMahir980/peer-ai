# Peer AI — Agent Instructions

This file is the **agent-agnostic entry point** for the Peer AI development workflow. Most coding agents (Cursor, Claude Code, Codex, and others) read an `AGENTS.md` automatically. If yours reads a different file, mirror this content there (see "Tool-specific config" below).

You are an AI assistant working inside a project that uses the **Peer AI development workflow** — a structured, phase-by-phase process for building software. The full playbook lives in the `peer-ai/` folder (or this repo's root if you are inside Peer AI itself).

---

## On every session start

If `.workflow-state.json` and `CONTEXT.md` exist at the app root, **read both before doing anything else**:

1. `.workflow-state.json` — the structured pointer (current phase, step, ticket, branch).
2. `CONTEXT.md` — the narrative log (decisions, daily progress, what's next, open questions).

Then tell the user where things stand and continue from `currentStep` in the active phase file. The state file holds the data; `CONTEXT.md` holds the story. See `peer-ai/shared/workflow-state.md`.

If those files do **not** exist yet, this is a fresh project — run the setup phase: `Follow peer-ai/shared/00-setup.md`.

---

## The workflow

Each phase is a markdown file you read and follow step by step. When the user says "Follow peer-ai/...", read that file and execute it conversationally — ask questions, wait for answers, don't dump everything at once.

| # | Phase | File |
|:-:|-------|------|
| 0 | Setup (run once) | `peer-ai/shared/00-setup.md` |
| 1 | Understand | `peer-ai/shared/01-understand.md` |
| 2 | Architect | `peer-ai/shared/02-architect.md` |
| 3 | System Spec | `peer-ai/shared/03-spec-system.md` |
| 4 | API Contract | `peer-ai/shared/04-spec-api-contract.md` |
| 5 | Shared Rules | `peer-ai/shared/05-rules-shared.md` |
| 6 | Page / Endpoint Specs | `peer-ai/frontend/01-spec-pages.md` · `peer-ai/backend/01-spec-endpoints.md` |
| 6 | Track Rules | `peer-ai/frontend/02-rules.md` · `peer-ai/backend/02-rules.md` |
| 7 | Issues | `peer-ai/shared/06-issues.md` |
| 8 | Build | `peer-ai/frontend/03-build.md` · `peer-ai/backend/03-build.md` |
| 9 | Review | `peer-ai/frontend/04-review.md` · `peer-ai/backend/04-review.md` |
| 10 | Test | `peer-ai/frontend/05-test.md` · `peer-ai/backend/05-test.md` |
| 11 | Document | `peer-ai/shared/07-document.md` |
| 11b | PR Automation | `peer-ai/shared/09-pr-automation.md` |
| 12 | Dev Journal | `peer-ai/shared/08-dev-journal.md` |

Agent prompts (code review, contract check, security audit, QA) are in `peer-ai/agents/`.

---

## Core standards (apply in every interaction)

The full standards are in `peer-ai/shared/rules/shared.md`. Key rules:

- **Session context:** maintain `CONTEXT.md` (narrative) and `.workflow-state.json` (pointer). The `notes` field is a one-liner pointer only — narrative belongs in `CONTEXT.md`.
- **Design vs data contract:** when a mockup and an API contract disagree, the contract wins on data shape and field names; the design wins on layout and visual hierarchy. See `peer-ai/shared/design-data-contract.md`.
- **Type safety, naming, security, error handling, dependencies** — see the shared standards file.
- **Model recommendations** — each phase suggests a cost-appropriate model; tell the user which to select in their tool before starting a phase.

---

## Tool-specific config

The workflow is agent-agnostic, but each AI tool has its own place for "always-on" rules. **When setting up a project (phase 0), detect or ask which tool the user runs, then create the matching config** so the standards load automatically:

| Tool | Config location | What to create |
|------|-----------------|----------------|
| **Cursor** | `.cursor/rules/` (rename copies to `.mdc`) | Copy `shared.md`, `workflow-driver.md`, and the track rule (`frontend.md` / `backend.md`) into `.cursor/rules/`, renaming each to `.mdc` so Cursor auto-loads them |
| **Claude Code** | `CLAUDE.md` at repo root | A `CLAUDE.md` summarizing the standards + pointing to `peer-ai/` |
| **Codex / others** | `AGENTS.md` at repo root | An `AGENTS.md` like this one, scoped to the project |
| **Anything else** | the tool's rules/memory file | Same content, adapted to the tool's format |

Always create the one that fits the user's tool — don't assume Cursor. The source content is identical; only the filename/format changes.

---

## Without an AI tool

Every workflow file describes a sound process a human can follow manually. The AI just makes it faster.
