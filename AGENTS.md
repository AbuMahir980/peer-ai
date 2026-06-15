# Peer AI — Agent Instructions

This file is the **agent-agnostic entry point** for the Peer AI development workflow. Most coding agents (Cursor, Claude Code, Codex, and others) read an `AGENTS.md` automatically. If yours reads a different file, mirror this content there (see "Tool-specific config" below).

You are an AI assistant working inside a project that uses the **Peer AI development workflow** — a structured, phase-by-phase process for building software. The full playbook lives in the `.workflow/` folder (or this repo's root if you are inside Peer AI itself).

---

## On every session start

If `.workflow-state.json` and `CONTEXT.md` exist at the app root, **read both before doing anything else**:

1. `.workflow-state.json` — the structured pointer (current phase, step, ticket, branch).
2. `CONTEXT.md` — the narrative log (decisions, daily progress, what's next, open questions).

Then tell the user where things stand and continue from `currentStep` in the active phase file. The state file holds the data; `CONTEXT.md` holds the story. See `.workflow/shared/workflow-state.md`.

If those files do **not** exist yet, this is a fresh project — run the setup phase: `Follow .workflow/shared/00-setup.md`.

---

## The workflow

Each phase is a markdown file you read and follow step by step. When the user says "Follow .workflow/...", read that file and execute it conversationally — ask questions, wait for answers, don't dump everything at once.

| # | Phase | File |
|:-:|-------|------|
| 0 | Setup (run once) | `.workflow/shared/00-setup.md` |
| 1 | Understand | `.workflow/shared/01-understand.md` |
| 2 | Architect | `.workflow/shared/02-architect.md` |
| 3 | System Spec | `.workflow/shared/03-spec-system.md` |
| 4 | API Contract | `.workflow/shared/04-spec-api-contract.md` |
| 5 | Shared Rules | `.workflow/shared/05-rules-shared.md` |
| 6 | Page / Endpoint Specs | `.workflow/frontend/01-spec-pages.md` · `.workflow/backend/01-spec-endpoints.md` |
| 6 | Track Rules | `.workflow/frontend/02-rules.md` · `.workflow/backend/02-rules.md` |
| 7 | Issues | `.workflow/shared/06-issues.md` |
| 8 | Build | `.workflow/frontend/03-build.md` · `.workflow/backend/03-build.md` |
| 9 | Review | `.workflow/frontend/04-review.md` · `.workflow/backend/04-review.md` |
| 10 | Test | `.workflow/frontend/05-test.md` · `.workflow/backend/05-test.md` |
| 11 | Document | `.workflow/shared/07-document.md` |
| 11b | PR Automation | `.workflow/shared/09-pr-automation.md` |
| 12 | Dev Journal | `.workflow/shared/08-dev-journal.md` |

Agent prompts (code review, contract check, security audit, QA) are in `.workflow/agents/`.

---

## Core standards (apply in every interaction)

The full standards are in `.workflow/shared/rules/shared.md`. Key rules:

- **Session context:** maintain `CONTEXT.md` (narrative) and `.workflow-state.json` (pointer). The `notes` field is a one-liner pointer only — narrative belongs in `CONTEXT.md`.
- **Design vs data contract:** when a mockup and an API contract disagree, the contract wins on data shape and field names; the design wins on layout and visual hierarchy. See `.workflow/shared/design-data-contract.md`.
- **Type safety, naming, security, error handling, dependencies** — see the shared standards file.
- **Model recommendations** — each phase suggests a cost-appropriate model; tell the user which to select in their tool before starting a phase.

---

## Tool-specific config

The workflow is agent-agnostic, but each AI tool has its own place for "always-on" rules. **When setting up a project (phase 0), detect or ask which tool the user runs, then create the matching config** so the standards load automatically:

| Tool | Config location | What to create |
|------|-----------------|----------------|
| **Cursor** | `.cursor/rules/` (rename copies to `.mdc`) | Copy `shared.md`, `workflow-driver.md`, and the track rule (`frontend.md` / `backend.md`) into `.cursor/rules/`, renaming each to `.mdc` so Cursor auto-loads them |
| **Claude Code** | `CLAUDE.md` at repo root | A `CLAUDE.md` summarizing the standards + pointing to `.workflow/` |
| **Codex / others** | `AGENTS.md` at repo root | An `AGENTS.md` like this one, scoped to the project |
| **Anything else** | the tool's rules/memory file | Same content, adapted to the tool's format |

Always create the one that fits the user's tool — don't assume Cursor. The source content is identical; only the filename/format changes.

---

## Without an AI tool

Every workflow file describes a sound process a human can follow manually. The AI just makes it faster.
