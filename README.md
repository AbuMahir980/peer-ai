# Peer AI — Development Workflow

A portable, agent-agnostic framework for AI-assisted software development. Point your AI agent at it and it walks you through the entire process — from a stakeholder's email to a tested, documented application.

Works with **Cursor**, **Claude Code**, **Codex**, **ChatGPT**, **Copilot**, and cloud agents. The workflow files are plain markdown — the AI tool is interchangeable; the process is not.

---

## What is this?

Peer AI is a structured engineering playbook packaged as markdown files. Each file tells an AI assistant how to guide you through one phase of development:

- **Conversational** — the AI asks questions and waits; it never dumps everything at once
- **Phase-gated** — each step produces output the next step depends on
- **Agent-integrated** — code review, contract check, security audit, and QA agents slot into the flow at the right moments
- **Context-persistent** — `CONTEXT.md` + `.workflow-state.json` let you start a fresh chat without losing your place

---

## What's in this repo

| Folder | Who uses it | What's in it |
|--------|-------------|--------------|
| `AGENTS.md` | Any AI agent | Agent-agnostic entry point — most tools auto-read it |
| `shared/` | Everyone | Setup, requirements, architecture, API contracts, issues, documentation, dev journal, workflow state guide, design-data-contract |
| `frontend/` | Frontend devs | Page specs, coding standards, build, review, test |
| `backend/` | Backend devs | Endpoint specs, coding standards, build, review, test |
| `agents/` | CI/CD & reviewers | Automated code review, QA, security audit, contract check prompts |
| `templates/` | Project setup | `CONTEXT.md` and `.workflow-state.json` starters |
| `CONTRIBUTING.md` | Maintainers | How to safely edit workflow files |

---

## Quick start — new project

> **Note:** The steps below are for a *new app that wants to use* Peer AI — not for this repo itself. You clone `peer-ai` from GitHub and install it as a `.workflow/` subfolder inside your own project. The repo is named `peer-ai`; it lives at `.workflow/` inside each project that adopts it.

### 1. Add the workflow to your project

Clone `peer-ai` into a `.workflow/` subfolder inside your app, then remove its `.git/` so it doesn't conflict with your project's own git history:

```bash
mkdir my-app && cd my-app
git init
git clone https://github.com/YOUR_USERNAME/peer-ai.git .workflow
rm -rf .workflow/.git
```

Or copy locally:

```bash
cp -r /path/to/peer-ai .workflow
```

### 2. Run the one-time setup

Open the project in your AI tool and run:

```
Follow .workflow/shared/00-setup.md
```

The setup phase will:

1. **Detect your AI tool** and create the matching always-on rules config — it won't assume Cursor. Each tool has its own location:
   - Cursor → `.cursor/rules/` (`.mdc` files)
   - Claude Code → `CLAUDE.md` at the project root
   - Codex / others → `AGENTS.md` at the project root
2. **Bootstrap session context** — copy and fill in `CONTEXT.md` and `.workflow-state.json` at your project root with you.
3. Offer optional extras (dev journal, PDF export).

**Manual alternative (Cursor only):** copy rule files from `.workflow/shared/rules/` and rename each from `.md` to `.mdc` so Cursor auto-loads them:

```bash
mkdir -p .cursor/rules
cp .workflow/shared/rules/shared.md        .cursor/rules/shared.mdc
cp .workflow/shared/rules/workflow-driver.md .cursor/rules/workflow-driver.mdc
cp .workflow/frontend/rules/frontend.md    .cursor/rules/frontend.mdc
cp .workflow/templates/CONTEXT.md          ./CONTEXT.md
cp .workflow/templates/.workflow-state.json ./.workflow-state.json
```

### 3. Start building

After setup, your project will look like this:

```
my-app/
  AGENTS.md (or CLAUDE.md)   ← your tool's auto-loaded rules
  .cursor/rules/              ← Cursor only: .mdc copies of the rule files
  .workflow/                  ← the full playbook (this repo)
    AGENTS.md
    shared/
    frontend/
    backend/
    agents/
    templates/
  CONTEXT.md                  ← narrative session log (you and the AI maintain this)
  .workflow-state.json        ← structured workflow pointer (the AI maintains this)
  docs/                       ← phase outputs land here
  src/                        ← your code (created during Build)
```

---

## The workflow — one line per phase

With the **workflow driver** installed, you don't need to type "Follow .workflow/..." — the agent picks up from `.workflow-state.json` automatically. You can still invoke any phase manually:

| # | Phase | Manual command |
|:-:|-------|----------------|
| 0 | Setup *(run once)* | `Follow .workflow/shared/00-setup.md` |
| 1 | Understand | `Follow .workflow/shared/01-understand.md` |
| 2 | Architect | `Follow .workflow/shared/02-architect.md` |
| 3 | System Spec | `Follow .workflow/shared/03-spec-system.md` |
| 4 | API Contract | `Follow .workflow/shared/04-spec-api-contract.md` |
| 5 | Shared Rules | `Follow .workflow/shared/05-rules-shared.md` |
| 6 | Page / Endpoint Specs | `Follow .workflow/frontend/01-spec-pages.md` or `.workflow/backend/01-spec-endpoints.md` |
| 6b | Track Rules | `Follow .workflow/frontend/02-rules.md` or `.workflow/backend/02-rules.md` |
| 7 | Issues | `Follow .workflow/shared/06-issues.md` |
| 8 | Build | `Follow .workflow/frontend/03-build.md` or `.workflow/backend/03-build.md` |
| 9 | Review | `Follow .workflow/frontend/04-review.md` or `.workflow/backend/04-review.md` |
| 10 | Test | `Follow .workflow/frontend/05-test.md` or `.workflow/backend/05-test.md` |
| 11 | Document | `Follow .workflow/shared/07-document.md` |
| 11b | PR Automation | `Follow .workflow/shared/09-pr-automation.md` |
| 12 | Dev Journal | `Follow .workflow/shared/08-dev-journal.md` |

Agents (code review, contract check, security audit, QA) are suggested automatically at handoff points. Run them manually anytime: `Follow .workflow/agents/<name>.md`.

---

## CONTEXT.md + state file pattern

This is the session continuity system — the main innovation beyond a static playbook.

**Problem:** AI context windows fill up. Starting a new chat loses all narrative history.

**Solution:** Two files at the project root that the AI reads at the start of every session:

| File | Role |
|------|------|
| `.workflow-state.json` | Structured pointer — current phase, step, ticket, branch. Updated after every ticket and phase transition. |
| `CONTEXT.md` | Narrative log — decisions, daily progress, open questions, asset paths. Updated at session end. |

**Atomic save rule:** When you say "wrap up" or "start a new chat", the agent updates **both** files together, then confirms: *"Context saved. Safe to start a new chat."*

The `notes` field in the state file is a one-liner pointer — not a narrative dump:

```json
// ✅ Good
"notes": "READ CONTEXT.md. Next: create milestone branch, create issues per screen, begin auth shell."

// ❌ Bad — this belongs in CONTEXT.md
"notes": "Stakeholder emailed Monday. We decided to go greenfield. Read all 15 handoff files. Branch is feature/..."
```

Full documentation: `shared/workflow-state.md`

---

## Design vs data contract

When mockups and API contracts disagree: **contract wins on data** (field names, types, shapes); **design wins on visuals** (layout, spacing, hierarchy). See `shared/design-data-contract.md`.

---

## Design quality

After each UI page works, the build phase runs a structured **design-quality pass** — layout & spacing, typography, responsive breakpoints, edge cases, motion, and accessibility — as plain workflow steps, no special tooling required. The review phase adds matching audit categories: design audit, UX critique, and design-system consistency. See `frontend/03-build.md` (step 9) and `frontend/04-review.md` (categories 2m–2o).

---

## Using with other AI tools

The setup phase creates whichever config your tool auto-loads:

- **Cursor** → `.cursor/rules/*.mdc`
- **Claude Code** → `CLAUDE.md` at the project root
- **Codex / others** → `AGENTS.md` at the project root (this repo ships one as the reference model)
- **Any chat tool** → open a phase file, paste it as instructions, and paste `shared/rules/shared.md` as additional context

The rule *content* is identical across all tools — only the filename and location change. Source files live in `shared/rules/`, `frontend/rules/`, and `backend/rules/` as plain `.md` with no tool-specific extension.

---

## Model selection (cost guide)

Not every phase needs the most capable model. Each workflow file includes a model recommendation. The names below are illustrative — pick the equivalent tier in your tool:

| Phase type | Recommended tier | Why |
|------------|-----------------|-----|
| Specs & architecture (01–05) | Most capable (e.g. Opus, o3) | Deep reasoning and trade-off analysis |
| Issues (06) | Mid-tier (e.g. Sonnet) | Structured extraction from a spec |
| Build (03) | Fast coding model (e.g. Composer, GPT-4o) | Best coding benchmarks, lowest cost |
| Review (04) | Mid-tier | Checklist-driven, systematic |
| Test (05) | Fast coding model | Test writing is implementation work |
| Agents (review, QA, security) | Fast / auto | Structured output from a prompt |
| Document (07) | Fast / auto | Templated updates |

Estimated savings vs using the most capable model everywhere: **~50–60%**.

---

## Adapting this framework

- Add project-specific AI rules as patterns emerge
- Create new templates for recurring document types
- Update workflow phase files based on what works
- Add agent prompts for repetitive tasks

Read `CONTRIBUTING.md` before editing workflow files — it explains required structure and what not to change.

---

## Troubleshooting

**"The AI doesn't follow the workflow"**
→ Check that your tool's rules config exists and is loaded (`.cursor/rules/` for Cursor, `CLAUDE.md` or `AGENTS.md` for others) and that `.workflow/` is at the project root. Re-run `Follow .workflow/shared/00-setup.md` if unsure, then restart your tool.

**"The AI can't find a workflow file"**
→ `.workflow/` must be at the project root, not nested inside `src/` or any subfolder.

**"I lost context between chats"**
→ Say "update the context" or "wrap up" before ending a session. Make sure `CONTEXT.md` and `.workflow-state.json` exist at the project root.

**"Mock data doesn't match the real backend"**
→ The API contract (`docs/04-api-contract.md`) is the source of truth. Run `Follow .workflow/agents/contract-check-prompt.md`.

---

## License

Use freely. Fork, adapt, and take it to any project or company.
