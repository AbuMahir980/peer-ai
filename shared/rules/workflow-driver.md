---
description: Ambient workflow driver — automatically follows the development workflow without needing "Follow .workflow/..." commands
globs: **/*
alwaysApply: true
---

# Workflow Driver

You are **always** inside the development workflow. You do not wait for the user to say "Follow .workflow/...". You read the current state, follow the process, and enforce every gate.

This file is the **ambient workflow driver** — the always-on rule that makes the AI follow the workflow without needing explicit "Follow .workflow/..." prompts. The content is tool-agnostic. The setup phase (`00-setup.md`) copies this file into whichever location your tool uses: `.cursor/rules/workflow-driver.mdc` for Cursor, appended to `CLAUDE.md` for Claude Code, or into `AGENTS.md` for Codex/others. Customize the placeholders for your project: verify command, issue tracker name, design guide path, and branch naming conventions.

---

## 1. On every session start

**First action — before doing anything else:**

1. Read `.workflow-state.json` in the app root.
2. Read `CONTEXT.md` in the app root — this is the narrative companion. It carries email threads, daily session summaries, decisions made, open questions, and what comes next. The state file has the structured data; CONTEXT.md has the story. **Read both before doing anything.**
3. Tell the user where we are:

   > "Resuming **[currentPhase]** phase — **[ticket]**: [ticketTitle]. [Brief context from `notes` field if present.]"

4. Read the phase file (`phaseFile` from state) and pick up from `currentStep`.
5. If `ticketsInProgress` is empty and `ticketsRemaining` has items, the next action is starting the first remaining ticket (move to In Progress in your issue tracker, create branch off milestone, push the ticket branch, read acceptance criteria).

**If the user's first message is unrelated** (a question, an email to process, a bug to fix): treat it as an **interruption** (see section 4). Handle it, then resume.

---

## 2. During work — follow the phase file

Read and follow the steps in the active `.workflow/` phase file. Key rules:

### Build phase (`.workflow/frontend/03-build.md` or `.workflow/backend/03-build.md`)

For each ticket:

**Before code:**
- **Correct branch (mandatory):** `git branch --show-current` must match this ticket's issue branch or the milestone branch from `.workflow-state.json`. If wrong, checkout or create the correct branch before editing.
- Issue tracker: move ticket **Backlog → In Progress** (mandatory first step).
- Create ticket branch off the milestone branch, then **`git push -u origin <ticket-branch>`** so the branch appears on the remote before merge.
- **Design guide first (UI work):** open the project's design reference (e.g. `docs/mockup/`, Figma, or agreed HTML preview) and locate the screen being built. Visual/layout hierarchy should match the design unless the spec explicitly overrides it — then read the page spec for behaviour, states, and data. When design and contract conflict, follow `shared/design-data-contract.md`.
- Read acceptance criteria from your issue plan (`docs/08-issue-plan.md` or issue tracker).
- Read page/endpoint spec from the relevant docs.

**During code:**
- Follow project coding rules in `.cursor/rules/` and `docs/`.
- Build with mock data first if the workflow specifies it.
- Write tests **alongside** the code, not after.

**After code, before saying "done" on any ticket:**
- Run the project's verify command (e.g. `npm run verify`, `npm test`, or your CI equivalent). Report the result. If red, fix and re-run. **Never skip this.**
- Merge ticket branch into milestone branch, then push the milestone branch if ahead of origin.
- **Commit and push** `.workflow-state.json` and any updated cursor rules when phase/ticket changes.
- Issue tracker — **all required, no exceptions:**
  1. Mark issue **Done** and tick acceptance criteria in the description.
  2. Add a **completion comment** (3–5 bullets: shipped, mock vs live, deviations, follow-ups).
  3. Post a **project-level update** — one sentence of progress.
- Update `.workflow-state.json`: move ticket from remaining/in-progress → completed, set next ticket, update `lastVerifyResult` and `lastUpdated`.
- Delete the merged ticket branch on origin and locally.

### Review / Test / Document phases

Follow the active phase file step by step. Do not skip numbered steps or handoff gates.

---

## 3. Phase transitions — automatic handoffs

When a phase completes, follow the handoff from the phase file **and** advance the state:

```
build → offer code review + contract check agents → advance to review
review → offer security audit agent → advance to test
test → offer QA agent → advance to document
document → open PR, advance to done, post project update
```

Update `.workflow-state.json` at every transition: set `currentPhase`, `phaseFile`, `currentStep` to 1, update `notes` with a one-liner pointer (not narrative).

---

## 4. Interruptions

If the user brings something unrelated mid-workflow (email, bug report, question, doc update):

1. **Before switching:** update `.workflow-state.json` `notes` with where you were:
   `"notes": "Was building PROJ-35, step 5 (form validation). Interrupted for stakeholder email about timeline."`
2. **Handle the interruption fully** — don't half-do it. Use the correct branch for the interruption topic.
3. **After:** tell the user:
   > "Interruption handled. Resuming **[phase]** — **[ticket]**, step **[N]**."
4. If the interruption changed docs or decisions, update `CONTEXT.md` and cross-reference affected docs before resuming.
5. **Resume strictly:** confirm `git branch` matches the owning ticket/milestone before continuing implementation.

---

## 4a. Context update — mandatory at session end or ~80% context

When the user says "update the context", "wrap up", "start a new chat", or when context usage is visibly high (~80%+), do all of the following before the session ends:

1. **Update `CONTEXT.md`** at the app root — add a new dated entry under "What Was Done — By Day" covering what was done this session. Update "Current State", "What's Next", and "Open Questions" to reflect where things stand right now.
2. **Update `.workflow-state.json`** — set `lastUpdated`, update `currentPhase`, `currentStep`, `notes` (one-liner pointer only — see `shared/workflow-state.md`), and any other fields that changed this session.
3. **Confirm to the user:** "Context saved. Safe to start a new chat — the next session will read both files and pick up from here."

Do NOT wait for the user to ask for each file individually. This is a single atomic action — all three happen together.

The `notes` field is a pointer, not a narrative. Full story lives in `CONTEXT.md`. See `shared/workflow-state.md` for good vs bad examples.

---

## 5. Mandatory gates — never skip these

| Gate | When | What to do |
|------|------|------------|
| **Correct branch** | Before commits/pushes | Checkout owning milestone or ticket branch; create/push if missing. |
| **Verify** | Before any "done", "complete", "ready for PR" | Run project verify command. Red = not done. |
| **Push ticket branch** | After creating a ticket branch | `git push -u origin <ticket-branch>` before merge. |
| **Push milestone branch** | After merging ticket → milestone | `git push origin <milestone-branch>`. |
| **Issue tracker update** | After each ticket completes | Done + AC checkboxes + completion comment + project update. |
| **State file update** | After each ticket or phase transition | Write and commit `.workflow-state.json`. |
| **Tests with code** | With every new feature | Co-located test files. Not batched. Not deferred. |
| **Design-quality pass** | After each UI page works | Run the design-quality pass (layout, typography, responsive, edge cases) per `.workflow/frontend/03-build.md` step 9. Fix hierarchy/responsive breaks before the next page. |
| **Context save** | Session end or ~80% context | Update both `CONTEXT.md` and `.workflow-state.json` atomically (§4a). |

---

## 6. What the state file looks like

Location: app root `.workflow-state.json` (**tracked in git**).

See `templates/.workflow-state.json` for the starter schema and `shared/workflow-state.md` for field documentation and `notes` field rules.

---

## 7. Model recommendations

When advancing to a new phase, remind the user which model to switch to (see `shared/rules/shared.md` for the full table):

| Phase | Model | Reason |
|-------|-------|--------|
| Build | Composer 2 | Best coding benchmarks, cheapest |
| Review | Sonnet 4.6 | Systematic, checklist-driven |
| Test | Composer 2 or Sonnet 4.6 | Test writing is implementation |
| Document | Auto or Gemini Flash | Templated updates |
| Agents (review, contract, QA) | Auto or Gemini Flash | Structured output |
| Security audit agent | Sonnet 4.6 | Security edge cases need deeper reasoning |

---

## 8. Relationship to other rules

- **`shared.md`** (or your project's shared rules) — coding standards, issue completion, journal, PDF export.
- **`frontend.md` / `backend.md`** — track-specific coding conventions during build.
- **`design-data-contract.md`** — when design mockups and API contracts disagree.
- **`workflow-state.md`** — companion guide for the state file and `notes` field rules.

The **state file** is the authoritative "where are we" source for phase/step. **CONTEXT.md** is the authoritative narrative source for decisions and history.
