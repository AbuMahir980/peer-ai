# Contributing to the Peer AI Development Workflow

This guide explains how to propose and make changes to the workflow files without breaking the structure that the AI assistant relies on.

---

## How the workflow is structured

```
peer-ai/
  AGENTS.md         # Agent-agnostic entry point (most tools auto-read this)
  shared/           # Tracks used by everyone (setup, requirements, architecture, API, issues, docs, journal, companion guides)
  shared/rules/  # Always-on rule files (plain .md — no tool-specific extension)
  frontend/         # Frontend-specific tracks (page specs, rules, build, review, test)
  backend/          # Backend-specific tracks (endpoint specs, rules, build, review, test)
  agents/           # Automated agent prompts (code review, contract check, QA, security audit)
  templates/        # CONTEXT.md and .peer-ai-state.json starters for new projects
  README.md         # Entry point and quick reference
  CONTRIBUTING.md   # This file
```

**Numbering convention:** Phase files are numbered in execution order (e.g. `00-setup.md`, `01-spec-endpoints.md`, `02-rules.md`, `03-build.md`). The number determines the sequence the user follows.

**Shared vs track-specific:** Files in `shared/` are used by both frontend and backend developers. Files in `frontend/` and `backend/` are track-specific.

### File types (not everything is a numbered phase)

| Type | Examples | Has phase structure? | How to edit |
|------|----------|:--:|-------------|
| **Numbered phase files** | `shared/01-understand.md`, `frontend/03-build.md` | Yes | Follow "Required sections in every workflow file" below |
| **Companion guides** | `shared/workflow-state.md`, `shared/design-data-contract.md` | No | Plain reference docs. Keep them short and decision-oriented; no AI header / model directive / wait-for-input. Cross-reference from the phases that need them. |
| **Rule configs** | `shared/rules/*.md`, root `AGENTS.md` | No | Source rules in plain `.md`. When a project sets up (phase 0), the AI copies these into the tool-specific location (`.cursor/rules/*.mdc` for Cursor, `CLAUDE.md` for Claude, etc.). Keep `shared.md`, `workflow-driver.md`, and `AGENTS.md` in sync when standards change. |
| **Templates** | `templates/CONTEXT.md`, `templates/.peer-ai-state.json` | No | Starters a project copies to its app root on day one. Use `[PLACEHOLDER: …]` markers and a top copy comment. `00-setup.md` is what instructs the AI to copy them. |

**Agent-agnostic rule:** the workflow must not assume a specific AI tool. When a file needs to reference where rules live, list the options (`.cursor/rules/` for Cursor, `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex/others) rather than hardcoding Cursor. The `00-setup.md` phase is responsible for creating the config that matches the user's tool.

---

## Required sections in every workflow file

Every workflow `.md` file must contain these sections **in this order**:

### 1. AI instruction header (first line)

```markdown
> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally -- ask the user questions, wait for their answers, then move to the next step.
```

This tells the AI how to behave. **Never remove or reword this.**

### 2. Model directive (second blockquote)

```markdown
> **Model: [Model Name]** -- [reason]. Before starting, tell the user: "Before we begin, switch to **[Model Name]** in your model selector..." **Wait for the user to confirm before proceeding.**
```

This controls which AI model is recommended for the phase. Refer to the model lineup in the README to choose the right model.

### 3. Numbered steps

Each step follows the pattern:

```markdown
## N. Step title

[Instructions for the AI -- what to do, what to present]

Ask:

> "[Question for the user]"

**Wait for the user's input.**
```

Every step **must** end with `**Wait for the user's input.**` -- this is what makes the workflow conversational instead of the AI dumping everything at once.

### 4. Handoff section

The second-to-last section always points the user to the next file:

```markdown
## N. Handoff

Tell the user:

> "[Phase] is done. Next, follow **`peer-ai/[path/to/next-file.md]`**."
```

### 5. Issue tracker update (in build phases)

Build workflow files (`frontend/03-build.md`, `backend/03-build.md`) must include an "Issue tracker update" block after each unit of work (page, endpoint group). This block instructs the AI to: (1) tick acceptance criteria checkboxes, (2) add a completion comment, and (3) post a project-level update. See `peer-ai/shared/rules/shared.md` for the full rule.

### 6. Update workflow state section

After the handoff, before the journal entry, every phase file includes a state-update block. This is what keeps the session-continuity files (`CONTEXT.md` + `.peer-ai-state.json`) current as the project moves through phases:

```markdown
### Update workflow state

If `.peer-ai-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.
```

### 7. Journal entry section

Immediately after the state-update block, before the Tone section:

```markdown
### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> "Before we move on, I can capture what we did in this phase as a journal entry -- decisions, trade-offs, and lessons learned. Want me to draft one?"

**Wait for the user's input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.
```

### 8. Tone section (always last)

```markdown
## Tone

Be collaborative, not robotic. You're a senior colleague.
```

---

## How to add a new section to an existing file

1. **Identify where it belongs** -- new sections go before the Save/Handoff section, never after.
2. **Follow the ask-then-wait pattern** -- present information, ask a question, then add `**Wait for the user's input.**`
3. **Renumber everything after your insertion** -- steps must be sequential with no gaps.
4. **Update the Save section** if it lists what to include in the output document -- add your new topic to the list.
5. **Update the Generate/Draft section** if it references step numbers (e.g. "all agreed decisions from steps 1-8" becomes "steps 1-9").

---

## How to propose a new workflow file

1. **Choose the right folder** -- `shared/` for cross-track, `frontend/` or `backend/` for track-specific, `agents/` for automated review prompts.
2. **Pick the right number** -- it should slot into the execution sequence. If it goes between existing files, you'll need to renumber the ones that follow.
3. **Include all required sections** -- AI header, model directive, numbered steps with wait-for-input, handoff, update-workflow-state block, journal entry, tone.
4. **Update the README** -- add the new file to the Quick Reference Card, the narrative description, and the workflow diagram.
5. **Update `shared.md`** -- if the new file needs to be referenced by the AI in every chat.
6. **Update the previous file's handoff** -- so the previous phase points to your new file instead of skipping it.

---

## PR and commit conventions

When working on any project that uses this workflow, follow these conventions:

**Branch naming:**
```
feature/PROJ-XX-short-description
```

**Commit messages:**
```
PROJ-XX: short description of the change
```

**Pull requests:**
- Title: `[PROJ-XX] Short description of what this does`
- Description: explain what changed and why
- All checks must pass before requesting review (lint, type check, build)
- One peer review required before merge
- Squash and merge preferred
- Delete feature branch after merging

**GitHub + issue tracker integration** (when active):
Branch creation with ticket ID in name → ticket auto-moves to In Progress. PR merged → ticket auto-moves to Done.

---

## What NOT to change

- **File numbering** without renumbering all downstream files and updating all handoff references
- **The AI instruction header** wording -- this is battle-tested to produce the right AI behavior
- **The `**Wait for the user's input.**` lines** -- removing these causes the AI to dump all steps at once
- **The Tone section** -- it must always be the last section in the file
- **The update-workflow-state and journal entry sections** -- they must appear between the handoff and tone sections, in that order (state update, then journal)
- **Model directive format** -- must include "switch to **[Model]** in your AI tool's model selector" and "Wait for the user to confirm"
- **Handoff file paths** -- if you change these, the workflow chain breaks

---

## How to edit workflow files using the AI

The best way to make changes is through your AI coding tool (Cursor, Claude Code, Codex, etc.):

1. Open a new AI tool chat (fresh context)
2. Tell the AI exactly what you want changed and in which file
3. Be specific: "In `peer-ai/backend/02-rules.md`, add a new section after section 10 about [topic]. Follow the same ask-then-wait pattern as the other sections."
4. Review the AI's changes before accepting

**Do not** ask the AI to "rewrite the whole workflow" or "improve everything" -- this leads to unintended changes. Be surgical.

---

## How to test your changes

1. Open a **new** chat (fresh context — same principle in any AI tool)
2. Type: `Follow peer-ai/[path/to/file-you-changed.md]`
3. Walk through the entire flow, answering the AI's questions
4. Verify:
   - The AI follows each step in order
   - It waits for your input at each step
   - It recommends the correct model at the start
   - The handoff at the end points to the correct next file
   - The journal entry prompt appears before the handoff

---

## How to sync changes

After editing files in `peer-ai`, sync them to any project that uses the workflow:

```bash
# From the project root (e.g. inside your project monorepo)
cp -r /path/to/peer-ai/* peer-ai/
```

Then re-run the tool-specific sync for whichever tool the project uses.

**Cursor** — copy and rename `.md` → `.mdc`:
```bash
cp peer-ai/shared/rules/shared.md .cursor/rules/shared.mdc
cp peer-ai/shared/rules/workflow-driver.md .cursor/rules/workflow-driver.mdc
cp peer-ai/frontend/rules/frontend.md .cursor/rules/frontend.mdc
```

**Claude Code** — update `CLAUDE.md` with the same content.

**Codex / others** — update `AGENTS.md` with the same content.

Then commit and push both repos.

---

## Style guidelines for writing workflow steps

- **Write as instructions to the AI**, not as documentation for humans. The AI reads these files and follows them.
- **Use blockquotes (`>`)** for example questions the AI should ask the user.
- **Bold the "Wait for the user's input" line** -- it's a critical control signal.
- **Be framework-agnostic** -- don't hardcode specific technologies. Instead, present options and let the user choose.
- **Include "skip this step" paths** for optional concerns (e.g. "If no background jobs are in scope, skip this step").
- **Keep the tone collaborative** -- the AI is a senior colleague, not a tutorial bot.
