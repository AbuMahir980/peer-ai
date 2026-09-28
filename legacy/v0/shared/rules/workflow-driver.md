---
description: Ambient workflow driver — automatically follows the development workflow without needing "Follow peer-ai/..." commands
globs: **/*
alwaysApply: true
---

# Workflow Driver

You are **always** inside the development workflow. You do not wait for the user to say "Follow peer-ai/...". You read the current state, follow the process, and enforce every gate.

This file is the **ambient workflow driver** — the always-on rule that makes the AI follow the workflow without needing explicit "Follow peer-ai/..." prompts. The content is tool-agnostic. The setup phase (`00-setup.md`) copies this file into whichever location your tool uses: `.cursor/rules/workflow-driver.mdc` for Cursor, appended to `CLAUDE.md` for Claude Code, or appended to `AGENTS.md` for Codex/others. Every project-specific value lives in the **Project settings** table in §0, marked `[PLACEHOLDER: …]`; setup fills it in. Nothing else in this file should need editing.

---

## 0. Project settings (filled in by setup)

| Setting | Value |
|---------|-------|
| **Verify command** | `[PLACEHOLDER: e.g. npm run verify, npm test, pytest — or "none yet" until Build sets one]` |
| **Issue tracker** | `[PLACEHOLDER: e.g. Linear, Jira, GitHub Issues — or "none"]` |
| **Ticket prefix** | `[PLACEHOLDER: e.g. PROJ]` |
| **Remote** | `[PLACEHOLDER: e.g. origin — or "none" for a local-only repo]` |
| **Design reference** | `[PLACEHOLDER: e.g. docs/mockup/, a Figma link, an HTML preview — or "none"]` |
| **Branch naming** | `[PLACEHOLDER: e.g. feature/PROJ-XX-short-description]` |
| **Merge policy** | `[PLACEHOLDER: PR only if every change reaches the milestone branch through a reviewed pull request (the default, and required if branch protection is on); local merge for a solo project with no review and no protection]` |
| **Model selector** | `[PLACEHOLDER: yes if the tool lets you pick a model per chat or phase (e.g. Cursor); no if the model is fixed for the session (e.g. Claude Code, Codex, most chat tools)]` |

Two variants follow from this table and apply everywhere below:

- **No remote** (`Remote: none`): skip every `git push`. Merge ticket branches into the milestone branch locally and delete them locally. Add the pushes back when a remote is added.
- **No issue tracker** (`Issue tracker: none`): wherever a step says to move, comment on, or update a ticket, instead tick the acceptance criteria in `docs/08-issue-plan.md` and add a one-line entry under "What Was Done — By Day" in `CONTEXT.md`. Project-level updates are not needed.
- **Merge policy** (`PR only` vs `local merge`): with `PR only`, a ticket branch reaches the milestone branch **through a pull request**, never a local merge — open it, let the checks run, and merge it there. With `local merge`, merge locally as described below. `PR only` is the default and is **mandatory** once `09-pr-automation.md` has set up branch protection, because a local merge will simply be refused. Note that `shared/rules/shared.md` requires one peer review before merge; under `local merge` that review has nowhere to happen, so choose it only for a solo project.

Everything else in this file is mandatory as written. `<remote>`, `<ticket-branch>` and `<milestone-branch>` below stand for the values from this table and the current ticket.

---

## 1. On every session start

**First action — before doing anything else:**

1. Read `.peer-ai-state.json` in the app root.
2. Read `CONTEXT.md` in the app root — this is the narrative companion. It carries email threads, daily session summaries, decisions made, open questions, and what comes next. The state file has the structured data; CONTEXT.md has the story. **Read both before doing anything.**
2b. **Check `currentPhase` is one of the published values** (`shared/workflow-state.md`). If it is not — an invented name, or a status like `review-complete` rather than a phase — say so, work out the right value from `phaseFile`, correct it, and note the correction. A value nobody validates drifts: two sessions or two tools will name the same phase differently, and nothing downstream can match on it.
3. Tell the user where we are:

   > "Resuming **[currentPhase]** phase — **[ticket]**: [ticketTitle]. [Brief context from `notes` field if present.]"

4. Read the phase file (`phaseFile` from state) and pick up from `currentStep`.
5. If `ticketsInProgress` is empty and `ticketsRemaining` has items, the next action is starting the first remaining ticket (move it to In Progress in the issue tracker, create the ticket branch off the milestone branch, push it if there is a remote, read the acceptance criteria).

**If the user's first message is unrelated** (a question, an email to process, a bug to fix): treat it as an **interruption** (see section 4). Handle it, then resume.

---

## 2. During work — follow the phase file

Read and follow the steps in the active `peer-ai/` phase file. Key rules:

### Build phase (`peer-ai/frontend/03-build.md` or `peer-ai/backend/03-build.md`)

For each ticket:

**Before code:**
- **Correct branch (mandatory):** `git branch --show-current` must match this ticket's issue branch or the milestone branch from `.peer-ai-state.json`. If wrong, checkout or create the correct branch before editing.
- Issue tracker: move ticket **Backlog → In Progress** (mandatory first step; no-tracker variant in §0).
- Create the ticket branch off the milestone branch using the **Branch naming** from §0, then **`git push -u <remote> <ticket-branch>`** so the branch appears on the remote before merge (skip if `Remote: none`).
- **Design guide first (UI work):** open the **Design reference** from §0 and locate the screen being built (if `none`, work from the page spec alone). Visual/layout hierarchy should match the design unless the spec explicitly overrides it — then read the page spec for behaviour, states, and data. When design and contract conflict, follow `shared/design-data-contract.md`.
- Read acceptance criteria from your issue plan (`docs/08-issue-plan.md` or issue tracker).
- Read page/endpoint spec from the relevant docs.

**During code:**
- Follow project coding rules in your tool's rules config (see setup) and `docs/`.
- Build with mock data first if the workflow specifies it.
- Write tests **alongside** the code, not after.

**After code, before saying "done" on any ticket:**
- Run the **Verify command** from §0. Report the result. If red, fix and re-run. **Never skip this.** If the setting is still `none yet`, establishing one is the first task of Build.
- Get the ticket branch into the milestone branch, per **Merge policy** in §0:
  - `PR only` — open a pull request from the ticket branch into `<milestone-branch>`, wait for the checks to pass, then merge it there (squash preferred) and delete the ticket branch. **Do not merge locally.**
  - `local merge` — merge the ticket branch into the milestone branch, then push the milestone branch to `<remote>` if it is ahead (skip if `Remote: none`).
- **Commit** (and push, if there is a remote) `.peer-ai-state.json` and any updated AI rules / standards files when phase/ticket changes.
- Issue tracker — **all required** (no-tracker variant in §0):
  1. Mark issue **Done** and tick acceptance criteria in the description.
  2. Add a **completion comment** (3–5 bullets: shipped, mock vs live, deviations, follow-ups).
  3. Post a **project-level update** — one sentence of progress.
- Update `.peer-ai-state.json`: move ticket from remaining/in-progress → completed, set next ticket, update `lastVerifyResult` and `lastUpdated`.
- Delete the merged ticket branch locally and, if there is a remote, on `<remote>`.

### Review / Test / Document phases

Follow the active phase file step by step. Do not skip numbered steps or handoff gates.

---

## 3. Phase transitions — automatic handoffs

When a phase completes, follow the handoff from the phase file **and** advance the state:

```
build → offer code review + contract check agents → advance to review
review → offer security audit agent → advance to test
test → offer QA agent → advance to document
document → open PR (if there is a remote), advance to done, post project update (if there is a tracker)
```

Update `.peer-ai-state.json` at every transition: set `currentPhase`, `phaseFile`, `currentStep` to 1, update `notes` with a one-liner pointer (not narrative).

---

## 4. Interruptions

If the user brings something unrelated mid-workflow (email, bug report, question, doc update):

1. **Before switching:** update `.peer-ai-state.json` `notes` with where you were:
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
2. **Update `.peer-ai-state.json`** — set `lastUpdated`, update `currentPhase`, `currentStep`, `notes` (one-liner pointer only — see `shared/workflow-state.md`), and any other fields that changed this session.
3. **Confirm to the user:** "Context saved. Safe to start a new chat — the next session will read both files and pick up from here."

Do NOT wait for the user to ask for each file individually. This is a single atomic action — all three happen together.

The `notes` field is a pointer, not a narrative. Full story lives in `CONTEXT.md`. See `peer-ai/shared/workflow-state.md` for good vs bad examples.

---

## 5. Mandatory gates — never skip these

| Gate | When | What to do |
|------|------|------------|
| **Correct branch** | Before commits/pushes | Checkout owning milestone or ticket branch; create/push if missing. |
| **Verify** | Before any "done", "complete", "ready for PR" | Run the Verify command from §0. Red = not done. |
| **Push ticket branch** | After creating a ticket branch | `git push -u <remote> <ticket-branch>` before merge. Skipped only when `Remote: none`. |
| **Pull request** | Before a ticket branch reaches the milestone branch | Required when **Merge policy** is `PR only`. A local merge in that mode is a defect, not a shortcut — and once branch protection exists it simply fails. |
| **CI green** | Before merging any pull request | Every required check passing. A check that was skipped is not a check that passed. |
| **Push milestone branch** | After merging ticket → milestone | `git push <remote> <milestone-branch>`. Skipped only when `Remote: none`, and not needed under `PR only` (the merge happens on the remote). |
| **Issue tracker update** | After each ticket completes | Done + AC checkboxes + completion comment + project update. No tracker: tick AC in `docs/08-issue-plan.md`, note in `CONTEXT.md`. |
| **State file update** | After each ticket or phase transition | Write and commit `.peer-ai-state.json`. |
| **Tests with code** | With every new feature | Co-located test files. Not batched. Not deferred. |
| **Design-quality pass** | After each UI page works | Run the design-quality pass (layout, typography, responsive, edge cases) per `peer-ai/frontend/03-build.md` step 9. Fix hierarchy/responsive breaks before the next page. |
| **Context save** | Session end or ~80% context | Update both `CONTEXT.md` and `.peer-ai-state.json` atomically (§4a). |

---

## 6. What the state file looks like

Location: app root `.peer-ai-state.json` (**tracked in git**).

See `peer-ai/templates/.peer-ai-state.json` for the starter schema and `peer-ai/shared/workflow-state.md` for field documentation and `notes` field rules.

---

## 7. Model recommendations

When advancing to a new phase, recommend the model tier (see `shared/rules/shared.md` for the full table). If **Model selector** in §0 is `yes`, ask the user to switch and wait for confirmation; if `no`, state the tier in one line and continue:

| Phase | Model | Reason |
|-------|-------|--------|
| Build | Fast coding model (e.g. Composer, Codex, GPT-4o) | Best coding benchmarks, lowest cost |
| Review | Mid-tier (e.g. Sonnet, GPT-4o) | Systematic, checklist-driven |
| Test | Fast coding or mid-tier | Test writing is implementation |
| Document | Auto / fast (e.g. Auto, Gemini Flash) | Templated updates |
| Agents (review, contract, QA) | Auto / fast (e.g. Auto, Gemini Flash) | Structured output |
| Security audit agent | Mid-tier (e.g. Sonnet, GPT-4o) | Security edge cases need deeper reasoning |

---

## 8. Relationship to other rules

- **`shared.md`** (or your project's shared rules) — coding standards, issue completion, journal, PDF export.
- **`frontend.md` / `backend.md`** — track-specific coding conventions during build.
- **`design-data-contract.md`** — when design mockups and API contracts disagree.
- **`workflow-state.md`** — companion guide for the state file and `notes` field rules.

The **state file** is the authoritative "where are we" source for phase/step. **CONTEXT.md** is the authoritative narrative source for decisions and history.
