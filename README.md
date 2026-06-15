# Peer AI — Development Workflow

A portable, agent-agnostic framework for AI-assisted software development. Type one line in Cursor (or paste a phase file into Claude, ChatGPT, or Copilot), and the AI walks you through the entire process — from a stakeholder's email to a tested, documented application.

Works with **Cursor**, **Claude**, **ChatGPT**, **Copilot**, and **Linear cloud agents**. The workflow files are plain markdown — the AI tool is interchangeable; the process is not.

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
| `shared/` | Everyone | Requirements, architecture, API contracts, issues, documentation, dev journal, workflow state guide, design-data-contract |
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

### 2. Copy cursor rules

```bash
mkdir -p .cursor/rules

# Shared (every project)
cp .workflow/shared/cursor-rules/shared.mdc .cursor/rules/
cp .workflow/shared/cursor-rules/workflow-driver.mdc .cursor/rules/   # recommended
cp .workflow/shared/cursor-rules/docs-pdf-export.mdc .cursor/rules/    # optional

# Frontend project:
cp .workflow/frontend/cursor-rules/frontend.mdc .cursor/rules/

# Backend project (instead of frontend):
# cp .workflow/backend/cursor-rules/backend.mdc .cursor/rules/
```

### 3. Bootstrap session context (day one)

```bash
cp .workflow/templates/CONTEXT.md ./CONTEXT.md
cp .workflow/templates/.workflow-state.json ./.workflow-state.json
```

Fill in `CONTEXT.md` with your project name, stakeholders, and initial state. Update `.workflow-state.json` with your starting phase.

**Why both files?**

| File | Role |
|------|------|
| `.workflow-state.json` | Structured pointer — current phase, step, ticket, branch. The `notes` field is a **one-liner** only. |
| `CONTEXT.md` | Narrative log — decisions, emails, what was done each day, what's next, open questions. |

The workflow driver reads both at every session start. See `shared/workflow-state.md` for the full pattern and good vs bad `notes` examples.

### 4. Open in Cursor and start

```bash
cursor .
```

Your project structure:

```
my-app/
  .cursor/rules/           ← AI loads these silently every chat
    shared.mdc
    workflow-driver.mdc    ← ambient driver (no "Follow .workflow/..." needed)
    frontend.mdc
  .workflow/               ← Full playbook
    shared/
    frontend/
    backend/
    agents/
    templates/
  CONTEXT.md               ← Narrative session log (you maintain this)
  .workflow-state.json     ← Structured workflow pointer (agent maintains this)
  docs/                    ← Phase outputs land here
  src/                     ← Your code (created during Build)
```

---

## The workflow — one line per phase

With the **workflow driver** installed, you don't need to type "Follow .workflow/..." — the agent picks up from `.workflow-state.json` automatically. You can still invoke phases manually:

| # | Phase | Manual command |
|:-:|-------|----------------|
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

## Using without Cursor

1. Open the workflow file (e.g. `shared/01-understand.md`)
2. Paste its contents into your AI chat as instructions
3. Follow the process the same way

Cursor rules won't auto-load — paste `shared/cursor-rules/shared.mdc` as additional context.

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
→ Check `.mdc` files are in `.cursor/rules/` and `.workflow/` exists. Restart Cursor.

**"The AI can't find a workflow file"**
→ `.workflow/` must be at project root.

**"I lost context between chats"**
→ Say "update the context" or "wrap up" before ending. Ensure `CONTEXT.md` and `.workflow-state.json` exist at app root.

**"Mock data doesn't match the real backend"**
→ The API contract (`docs/04-api-contract.md`) is source of truth. Run `Follow .workflow/agents/contract-check-prompt.md`.

---

## License

Use freely. Fork, adapt, and take it to any project or company.
