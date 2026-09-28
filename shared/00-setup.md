# 00 — Project Setup (run once)

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Auto / fast** — setup is file scaffolding and configuration. It runs before the project's model-selector setting is known, so do not gate on a switch: say once, in one line, that the fastest model (e.g. Auto, Gemini Flash, GPT-4.1 mini) is enough for setup, then continue.

**Context:** This file runs **once** at the start of a project that uses the Peer AI workflow. It wires up the three things every later phase depends on: (1) the **tool-specific rules config** with the **workflow driver** appended, so standards and the workflow load automatically, (2) the driver's **Project settings**, and (3) the **session-continuity files** (`CONTEXT.md` + `.peer-ai-state.json`). After this, the AI can resume any session by reading those two files. Setup asks its questions in a single round so the user answers once.

---

## 1. Confirm the workflow location and clean up

Check that the `peer-ai/` folder exists at the project root (or confirm the repo *is* Peer AI). If it's missing, tell the user to clone or copy it in first (see the README), then stop.

Then check for a nested repository. If `peer-ai/.git` exists, delete it so the playbook is committed as plain files. Left in place, `git add` records `peer-ai/` as an empty gitlink and none of the workflow files land in the project repo. Note what you found; you report it in the next step. Do not wait here.

---

## 2. One question round

Ask everything you need in a single message, so the user answers once:

> "I can see the `peer-ai/` folder at the project root. [If removed: I also deleted a leftover `peer-ai/.git/` so the playbook commits as plain files.] To set up the workflow I need a few answers — reply in one go:
>
> 1. **Which AI coding tool** are you using? **A)** Cursor · **B)** Claude Code · **C)** Codex or another agent that reads `AGENTS.md` · **D)** something else (tell me which file it reads for persistent instructions).
> 2. Does that tool let you **pick a model per chat or per phase** (yes/no)? If yes, I'll suggest a cost-appropriate model at the start of each phase and wait for you to switch; if no, I'll just note the recommendation and carry on.
> 3. **Project name** and a one-line description?
> 4. **Issue tracker** (Linear, Jira, GitHub Issues) and its ticket prefix (e.g. `PROJ`), or none?
> 5. **Git remote** (e.g. `origin`), or local-only for now?
> 6. **Verify command** I should run before calling any ticket done (e.g. `npm run verify`, `npm test`, `pytest`), or none yet?
> 7. **Design reference** (mockup folder, Figma link, HTML preview), or none yet?
> 8. Where are we starting — a brand-new build, or joining existing work?"

**Wait for the user's input.** If an answer is missing, ask only for that one.

---

## 3. Create the rules config, the workflow driver, and the continuity files

Do all of the following, then present the result once.

**Rules config.** The content is identical across tools; only the filename/format changes. **Do not assume Cursor.**

- **A (Cursor):** create `.cursor/rules/` and copy from `peer-ai/shared/rules/`, **renaming** each file from `.md` to `.mdc` — Cursor only auto-loads `.mdc`:
  - `peer-ai/shared/rules/shared.md` → `.cursor/rules/shared.mdc`
  - `peer-ai/shared/rules/workflow-driver.md` → `.cursor/rules/workflow-driver.mdc` (ambient driver)
  - `peer-ai/frontend/rules/frontend.md` → `.cursor/rules/frontend.mdc` (frontend projects)
  - `peer-ai/backend/rules/backend.md` → `.cursor/rules/backend.mdc` (backend projects)
  - `peer-ai/shared/rules/docs-pdf-export.md` → `.cursor/rules/docs-pdf-export.mdc` (optional)
- **B (Claude Code):** create `CLAUDE.md` at the repo root that states the project uses the Peer AI workflow, summarizes the shared standards (from `shared.md`), instructs reading `.peer-ai-state.json` + `CONTEXT.md` at session start, and lists the phase files in `peer-ai/`; use `peer-ai/AGENTS.md` as the structural model. Then **append the full body of `peer-ai/shared/rules/workflow-driver.md`** (everything below its front matter). Without the driver the standards load but the workflow does not.
- **C (Codex / `AGENTS.md`):** create an `AGENTS.md` at the repo root modeled on `peer-ai/AGENTS.md`, scoped to this project, and **append the body of `peer-ai/shared/rules/workflow-driver.md`** for the same reason.
- **D (other):** create the equivalent file the tool reads, with the same content **including the body of the workflow driver appended**.

**Project settings.** Fill in the **Project settings** table at the top of the driver you just installed: verify command, issue tracker and prefix, remote, design reference, branch naming (default `feature/<PREFIX>-XX-short-description`), and model selector (yes/no, from question 2). Write `none` where the user has none, so the driver skips the matching push and tracker steps.

**Continuity files.** These live at the **app root**, not inside `peer-ai/`:

- Copy `peer-ai/templates/.peer-ai-state.json` → app root as `.peer-ai-state.json`. Set `currentPhase` to `understand` (or wherever they're starting — one of the values listed in `peer-ai/shared/workflow-state.md`), `cycle`, `lastUpdated`, and a one-line `notes` pointer. Delete the template's `_comment` key.
- Copy `peer-ai/templates/CONTEXT.md` → app root as `CONTEXT.md`. Fill "Current State", "Open Questions", and "Package / Asset Locations" from the answers.

Then present it all in one message, and explain the split and the rhythm:

> "Set up: [tool] rules config with the workflow driver appended (settings: [one-line summary]), `.peer-ai-state.json`, and `CONTEXT.md`.
>
> Two files, two jobs: `.peer-ai-state.json` is the structured pointer (phase, ticket, branch); `CONTEXT.md` is the narrative (decisions, daily log, what's next). The `notes` field stays a one-liner — the story lives in `CONTEXT.md`. Full rules: `peer-ai/shared/workflow-state.md`.
>
> From now on I'll **read both files at the start of every session** and tell you where we are, and **update both together** at the end of a phase, when you say 'wrap up' / 'update the context' / 'start a new chat', or when context gets full (~80%). You can start a fresh chat any time without losing the thread.
>
> Does everything look right?"

**Wait for the user's input.** Fix anything they flag.

---

## 3b. The feedback file

Copy `peer-ai/templates/peer-ai-feedback.md` to `docs/peer-ai-feedback.md` and
fill in the project name. Create `docs/` if it does not exist.

This is where defects in **the playbook itself** get recorded during the run.
Peer AI is copied into the project, not linked, so nothing fixed locally reaches
the next project unless it is sent back — the file explains the route, and
`shared/rules/shared.md` carries the rule. One line to the user:

> "I've added `docs/peer-ai-feedback.md`. If the workflow itself gets something
> wrong as we go — a step that can't be followed, two files that disagree — I'll
> record it there and we can send it back to the Peer AI repo rather than just
> working around it."

No gate. Continue.

---

## 4. Optional — dev journal and PDF export

Briefly offer the optional add-ons:

> "Two optional extras we can set up now or later:
> - **Dev journal** (decisions/lessons log — Notion or local markdown): `Follow peer-ai/shared/08-dev-journal.md`
> - **PDF-ready doc export** (styled HTML from your `docs/`): copy `docs-pdf-export.md` into your tool's rules
>
> Want either now, or skip and move on?"

**Wait for the user's input.**

---

## 5. Handoff

Tell the user:

> "Setup is done — rules config with the workflow driver, `CONTEXT.md`, and `.peer-ai-state.json` are all in place. Next, start the real work: **`peer-ai/shared/01-understand.md`** to break down requirements."

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
