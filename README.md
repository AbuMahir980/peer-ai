# Peer AI — Development Workflow

A portable, agent-agnostic framework for AI-assisted software development. Point your AI agent at it and it walks you through the entire process — from a stakeholder's email to a tested, documented application.

Works with **Cursor**, **Claude Code**, **Codex**, **ChatGPT**, **Copilot**, and cloud agents. The workflow files are plain markdown and the entry point (`AGENTS.md`) is the cross-tool standard most agents auto-read — the AI tool is interchangeable; the process is not.

---

## What is this?

Peer AI is a structured engineering playbook packaged as markdown instructions. Each file tells an AI assistant how to guide you through one phase of development:

- **Conversational** — the AI asks questions and waits; it doesn't dump everything at once
- **Phase-gated** — each step produces output the next step depends on
- **Agent-integrated** — code review, contract check, security audit, and QA agents slot into the flow at the right moments
- **Context-persistent** — `CONTEXT.md` + `.workflow-state.json` let you start a fresh chat without losing place

---

## What's in this repo

| Folder | Who uses it | What's in it |
|--------|------------|--------------|
| `AGENTS.md` | Any AI agent | Agent-agnostic entry point — most tools auto-read it |
| `shared/` | Everyone | Setup, requirements, architecture, API contracts, issues, documentation, dev journal, workflow state guide, design-data-contract |
| `frontend/` | Frontend devs | Page specs, coding standards, build, review, test |
| `backend/` | Backend devs | Endpoint specs, coding standards, build, review, test |
| `agents/` | CI/CD & reviewers | Automated code review, QA, security audit, contract check prompts |
| `templates/` | Project setup | `CONTEXT.md` and `.workflow-state.json` starters |
| `CONTRIBUTING.md` | Maintainers | How to safely edit workflow files |

---

## Quick start — new project

### 1. Clone the workflow into your project

```bash
mkdir my-app
cd my-app
git init

# Clone into .workflow/
git clone https://github.com/YOUR_USERNAME/peer-ai.git .workflow
```

Or copy locally:

```bash
cp -r /path/to/peer-ai .workflow
```

### 2. Let the AI set it up (recommended)

Open the project in your AI tool and run the one-time setup phase:

```
Follow .workflow/shared/00-setup.md
```

The setup phase will:

1. **Detect your AI tool** and create the matching always-on rules config — `.cursor/rules/` for Cursor, `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex/others. (It won't assume Cursor.)
2. **Bootstrap session context** — copy `CONTEXT.md` and `.workflow-state.json` to your app root and fill in the basics with you.
3. Offer optional extras (dev journal, PDF export).

**Manual alternative (Cursor):** copy from `shared/rules/` and rename each file from `.md` → `.mdc` (Cursor only auto-loads `.mdc`):

```bash
mkdir -p .cursor/rules
cp .workflow/shared/rules/shared.md .cursor/rules/shared.mdc
cp .workflow/shared/rules/workflow-driver.md .cursor/rules/workflow-driver.mdc   # recommended
cp .workflow/frontend/rules/frontend.md .cursor/rules/frontend.mdc               # or backend.mdc
cp .workflow/templates/CONTEXT.md ./CONTEXT.md
cp .workflow/templates/.workflow-state.json ./.workflow-state.json
```

**Why two session files?**

| File | Role |
|------|------|
| `.workflow-state.json` | Structured pointer — current phase, step, ticket, branch. The `notes` field is a **one-liner** only. |
| `CONTEXT.md` | Narrative log — decisions, emails, what was done each day, what's next, open questions. |

Every AI following this workflow reads both at session start. See `shared/workflow-state.md` for the full pattern and good vs bad `notes` examples.

### 3. Start building

Your project structure after setup (Cursor shown; other tools use their own rules file):

```
my-app/
  AGENTS.md (or CLAUDE.md) ← your tool's auto-loaded rules (created by 00-setup.md)
  .cursor/rules/           ← if using Cursor: copies of shared/rules/*.md renamed to *.mdc
    shared.mdc
    workflow-driver.mdc
    frontend.mdc
  .workflow/               ← Full playbook
    AGENTS.md              ← agent-agnostic entry point
    shared/
      rules/               ← source rule files (tool-agnostic .md — no tool-specific extension)
    frontend/
    backend/
    agents/
    templates/
  CONTEXT.md               ← Narrative session log
  .workflow-state.json     ← Structured workflow pointer
  docs/                    ← Phase outputs land here
  src/                     ← Your code (created during Build)
```

---

## The workflow — one line per phase

With the **workflow driver** installed, you don't need to type "Follow .workflow/..." — the agent picks up from `.workflow-state.json` automatically. You can still invoke phases manually:

| # | Phase | Manual command |
|:-:|-------|----------------|
| 0 | Setup *(run once)* | `Follow .workflow/shared/00-setup.md` |
| 1 | Understand | `Follow .workflow/shared/01-understand.md` |
| 2 | Architect | `Follow .workflow/shared/02-architect.md` |
| 3 | System Spec | `Follow .workflow/shared/03-spec-system.md` |
| 4 | API Contract | `Follow .workflow/shared/04-spec-api-contract.md` |
| 5 | Shared Rules | `Follow .workflow/shared/05-rules-shared.md` |
| 6 | Page/Endpoint Specs | `Follow .workflow/frontend/01-spec-pages.md` or `backend/01-spec-endpoints.md` |
| 6 | Track Rules | `Follow .workflow/frontend/02-rules.md` or `backend/02-rules.md` |
| 7 | Issues | `Follow .workflow/shared/06-issues.md` |
| 8 | Build | `Follow .workflow/frontend/03-build.md` or `backend/03-build.md` |
| 9 | Review | `Follow .workflow/frontend/04-review.md` or `backend/04-review.md` |
| 10 | Test | `Follow .workflow/frontend/05-test.md` or `backend/05-test.md` |
| 11 | Document | `Follow .workflow/shared/07-document.md` |
| 11b | PR Automation | `Follow .workflow/shared/09-pr-automation.md` |
| 12 | Dev Journal | `Follow .workflow/shared/08-dev-journal.md` |

Agents (code review, contract check, security audit, QA) are suggested automatically at handoff points. Run them manually anytime with `Follow .workflow/agents/<name>.md`.

---

## CONTEXT.md + state file pattern

This is the session continuity system — the main innovation beyond a static playbook.

**Problem:** AI chat context windows fill up. Starting a new chat loses narrative history.

**Solution:** Two complementary files at the app root:

1. **`.workflow-state.json`** — machine-readable pointer (phase, step, ticket, branch). Updated after every ticket and phase transition.
2. **`CONTEXT.md`** — human-readable narrative (decisions, emails, daily log, open questions, asset paths). Updated at session end.

**Atomic save rule:** When wrapping up, the agent updates **both** files together, then confirms: *"Context saved. Safe to start a new chat."*

The `notes` field in the state file is **not** a dump zone:

```json
// ✅ Good
"notes": "READ CONTEXT.md. Next action: create milestone branch, create issues per screen, begin Auth shell."

// ❌ Bad — this belongs in CONTEXT.md
"notes": "Stakeholder emailed Monday. We decided greenfield. Read 15 handoff files. Branch is feature/..."
```

Full documentation: `shared/workflow-state.md`

---

## Design vs data contract

When mockups and API contracts disagree: **contract wins on data** (field names, types, shapes); **design wins on visuals** (layout, spacing, hierarchy). See `shared/design-data-contract.md`.

---

## Design quality

The build phase includes a structured **design-quality pass** after each UI page works — layout & spacing, typography, responsive, edge cases, motion, and accessibility/performance — as plain workflow steps (no tool-specific skills required). The review phase adds matching audit categories: design audit, UX critique, and design-system consistency. See `frontend/03-build.md` (step 9) and `frontend/04-review.md` (categories 2m–2o).

---

## Using with other AI tools

The framework is agent-agnostic. The setup phase creates whatever config your tool auto-loads:

- **Cursor** → `.cursor/rules/*.mdc`
- **Claude Code** → `CLAUDE.md` at the repo root
- **Codex / others** → `AGENTS.md` at the repo root (this repo ships one as the model)
- **Any chat tool** → open a phase file (e.g. `shared/01-understand.md`), paste it as instructions, and paste `shared/rules/shared.md` as additional context

The rule *content* is identical everywhere — only the filename/format changes to match the tool. The source files live in `shared/rules/`, `frontend/rules/`, and `backend/rules/` as plain `.md` files with no tool-specific extension.

---

## Model selection (cost optimization)

Not every phase needs the most expensive model. Each workflow file includes a model recommendation. Rough guide:

| Phase type | Model | Why |
|------------|-------|-----|
| Specs & architecture (01–05) | Opus 4.6 | Deep reasoning |
| Issues (06) | Sonnet 4.6 | Structured extraction |
| Build (03) | Composer 2 | Best coding benchmarks, ~86% cheaper |
| Review (04) | Sonnet 4.6 | Checklist-driven |
| Test (05) | Composer 2 | Implementation work |
| Agents | Auto / Gemini Flash | Structured output |
| Document (07) | Auto / Gemini Flash | Templated updates |

Estimated savings: **~50–60%** vs using Opus for everything.

---

## Adapting this framework

- Add project-specific cursor rules as patterns emerge
- Create new templates for recurring document types
- Update workflow docs based on what works
- Add agent prompts for repetitive tasks

Read `CONTRIBUTING.md` before editing workflow files — it explains required structure and what not to change.

---

## Troubleshooting

**"The AI doesn't follow the workflow"**
→ Check your tool's rules config exists and is loaded (`.cursor/rules/` for Cursor, `CLAUDE.md` / `AGENTS.md` for others) and that `.workflow/` exists. Re-run `Follow .workflow/shared/00-setup.md` if unsure, and restart your tool.

**"The AI can't find a workflow file"**
→ `.workflow/` must be at project root.

**"I lost context between chats"**
→ Say "update the context" or "wrap up" before ending. Ensure `CONTEXT.md` and `.workflow-state.json` exist at app root.

**"Mock data doesn't match the real backend"**
→ The API contract (`docs/04-api-contract.md`) is source of truth. Run `Follow .workflow/agents/contract-check-prompt.md`.

---

## License

Use freely. Fork, adapt, and take it to any project or company.
