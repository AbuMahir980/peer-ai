# 00 — Project Setup (run once)

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Auto / fast** — setup is mostly file scaffolding and configuration. Before starting, tell the user: "Before we begin, switch to your **fastest model** (e.g. Auto, Gemini Flash, GPT-4.1 mini) in your AI tool's model selector. Setup is scaffolding work — no need for a premium model. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

**Context:** This file runs **once** at the start of a project that uses the Peer AI workflow. It wires up the two things every later phase depends on: (1) the **tool-specific rules config** so standards load automatically, and (2) the **session-continuity files** (`CONTEXT.md` + `.peer-ai-state.json`). After this, the AI can resume any session by reading those two files.

---

## 1. Confirm the workflow location

Check that the `peer-ai/` folder exists at the project root (or confirm the repo *is* Peer AI). If it's missing, tell the user to clone or copy it in first (see the README), then stop.

> "I can see the `peer-ai/` folder at the project root. Ready to set up the workflow for this project?"

**Wait for the user's input.**

---

## 2. Detect the AI tool and create matching rules config

The workflow is agent-agnostic, but each AI tool loads "always-on" rules from a different place. Find out which tool the user runs, then create the config that fits it — **do not assume Cursor.**

Ask:

> "Which AI coding tool are you using for this project?
>
> **A) Cursor** — I'll create `.cursor/rules/` with the workflow rule files.
> **B) Claude Code** — I'll create a `CLAUDE.md` at the repo root.
> **C) Codex or another agent that reads `AGENTS.md`** — I'll create a project `AGENTS.md`.
> **D) Something else** — tell me what it reads and I'll adapt.
>
> Which one: A, B, C, or D?"

**Wait for the user's input.**

Then create the matching config from the workflow's source rules. The content is identical across tools — only the filename/format changes.

**If A (Cursor):**
- Create `.cursor/rules/` in the project root.
- Copy from `peer-ai/shared/rules/` and **rename** each file from `.md` to `.mdc` — Cursor only auto-loads files with the `.mdc` extension:
  - `peer-ai/shared/rules/shared.md` → `.cursor/rules/shared.mdc`
  - `peer-ai/shared/rules/workflow-driver.md` → `.cursor/rules/workflow-driver.mdc` (ambient driver — recommended)
  - `peer-ai/frontend/rules/frontend.md` → `.cursor/rules/frontend.mdc` (frontend projects)
  - `peer-ai/backend/rules/backend.md` → `.cursor/rules/backend.mdc` (backend projects)
  - `peer-ai/shared/rules/docs-pdf-export.md` → `.cursor/rules/docs-pdf-export.mdc` (optional)
- The content is identical — only the extension changes so Cursor recognises the file as a rule.

**If B (Claude Code):**
- Create `CLAUDE.md` at the repo root that: states the project uses the Peer AI workflow, summarizes the shared standards (from `shared.md`), instructs reading `.peer-ai-state.json` + `CONTEXT.md` at session start, and lists the phase files in `peer-ai/`. Use `peer-ai/AGENTS.md` as the structural model.

**If C (Codex / AGENTS.md):**
- Create an `AGENTS.md` at the repo root modeled on `peer-ai/AGENTS.md`, scoped to this project.

**If D (other):**
- Ask what file/format the tool uses for persistent instructions, then create the equivalent with the same content.

After creating the config, confirm:

> "I've set up the rules config for [tool]. These standards will now load automatically every session. Look right?"

**Wait for the user's input.**

---

## 3. Bootstrap session-continuity files

These two files live at the **app root** (not inside `peer-ai/`). They are how the AI resumes work across chats.

- Copy `peer-ai/templates/.peer-ai-state.json` → app root as `.peer-ai-state.json`
- Copy `peer-ai/templates/CONTEXT.md` → app root as `CONTEXT.md`

Then fill in the basics with the user:

> "I'll set up your two session-continuity files. Quick questions so I can fill them in:
> - **Project name** and a one-line description?
> - Any **issue tracker** in use (Linear, Jira, GitHub Issues) and its ticket prefix (e.g. `PROJ`)?
> - Where are we starting — a brand-new build, or joining existing work?"

**Wait for the user's input.**

Fill `CONTEXT.md`'s "Current State", "Open Questions", and "Package / Asset Locations" with what they gave you. Set `.peer-ai-state.json` `currentPhase` to `understand` (or wherever they're starting), `cycle`, and a one-line `notes` pointer.

Explain the split briefly:

> "Two files, two jobs: `.peer-ai-state.json` is the structured pointer (phase, ticket, branch); `CONTEXT.md` is the narrative (decisions, daily log, what's next). The `notes` field stays a one-liner — the story lives in `CONTEXT.md`. Full rules: `peer-ai/shared/workflow-state.md`."

---

## 4. Confirm the maintenance rhythm

Tell the user how these files stay current so they know what to expect:

> "From now on I'll:
> - **Read both files at the start of every session** and tell you where we are.
> - **Update both at the end of a phase, when you say 'wrap up' / 'update the context' / 'start a new chat', or when context gets full (~80%)** — as a single atomic action.
>
> That means you can start a fresh chat anytime without losing the thread."

**Wait for the user's input.**

---

## 5. Optional — dev journal and PDF export

Briefly offer the optional add-ons:

> "Two optional extras we can set up now or later:
> - **Dev journal** (decisions/lessons log — Notion or local markdown): `Follow peer-ai/shared/08-dev-journal.md`
> - **PDF-ready doc export** (styled HTML from your `docs/`): copy `docs-pdf-export.md` into your tool's rules
>
> Want either now, or skip and move on?"

**Wait for the user's input.**

---

## 6. Handoff

Tell the user:

> "Setup is done — rules config, `CONTEXT.md`, and `.peer-ai-state.json` are all in place. Next, start the real work: **`peer-ai/shared/01-understand.md`** to break down requirements."

---

### Update workflow state

You just created `.peer-ai-state.json` and `CONTEXT.md` in this phase. Make sure they reflect the starting point: `currentPhase` set, `lastUpdated` stamped, and a one-line `notes` pointer. Keep narrative in `CONTEXT.md`, not in `notes`. See `peer-ai/shared/workflow-state.md`.

---

### Journal entry

If journaling is active (check docs/journal-config.json), offer a kickoff entry before handing off:

> "Before we move on, I can capture this project's kickoff as a journal entry — why it exists, key constraints, initial expectations. Want me to draft one?"

**Wait for the user's input.** If yes, draft using the kickoff template from peer-ai/shared/08-dev-journal.md (Part A) and write to the configured tool. If no, proceed to the handoff above.

## Tone

Be collaborative, not robotic. You're a senior colleague getting the project's foundation right so every later session runs smoothly.
