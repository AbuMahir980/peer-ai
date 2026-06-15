# 06 — Linear Issues

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Sonnet 4.6** — extracting issues from specs is structured work. Before starting, tell the user: "Before we begin, switch to **Sonnet 4.6** in your AI tool's model selector. Issue extraction is structured work — Sonnet handles it efficiently at 40% less cost than Opus. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

Context: requirements and technical specs are written. Your job is to turn them into trackable issues, dependencies, and a cycle plan, then save a single issue plan document.

---

## Process

### 1. Discover spec documents

**Produce:** List which spec files you will read. At minimum, locate and read (from the project, typically under `docs/` or paths the user specifies):

- Requirements / PM spec
- Architecture doc
- System spec (e.g. `03-spec-system` or equivalent)
- API contract (e.g. `04-spec-api-contract` or equivalent)
- Page specs (frontend) and/or endpoint specs (backend)

If paths differ, search the repo or ask.

**Ask:**

> "Are these the right spec paths, or are there extra docs (spikes, design files) I should include?"

**Wait for the user's input.**

---

### 2. Extract issues from specs

**Produce:** From each spec, extract discrete work items. Present them **grouped** for the user:

1. **Foundation** — auth, database, base layout, shared infra
2. **Feature** — one bucket per page, endpoint group, or coherent user-facing slice
3. **Testing** — test plans, e2e, contract tests, load tests as needed
4. **Documentation** — README, ADRs, runbooks, API docs updates

For each candidate issue, draft:

- **Title** — concise, action-oriented
- **Description** containing:
  - What to build (short)
  - **Acceptance criteria** (checklist, testable)
  - **Technical notes** (deps, endpoints, spec section refs)
- **Priority** — P1–P4
- **Labels** — e.g. `frontend`, `backend`, `api-contract`, `auth`, `database`, `testing`, `documentation`, `bug`, `security`, `devops` (adapt to their scheme)
- **Size** — S / M / L / XL

**Priority guide (default framing):**

| Priority | Meaning | Example |
|----------|---------|---------|
| P1 | Blocks other work | Auth API, initial DB |
| P2 | Core MVP | Main list/detail flows |
| P3 | Important, not blocking | Filters, exports |
| P4 | Deferrable | Polish, nice-to-haves |

**Size guide (default framing):**

| Size | Typical span |
|------|----------------|
| S | ~0.5–1 day |
| M | ~1–2 days |
| L | ~3–5 days |
| XL | 5+ days — should be split |

**Ask:**

> "Here's the first pass of issues by Foundation / Feature / Testing / Documentation. What should we rename, merge, or split before we lock priorities?"

**Wait for the user's input.**

---

### 3. Review priorities and XL breakdown

**Produce:** Apply the user's feedback. Re-list any changed issues. Ensure no XL remains without a proposed split or explicit user acceptance.

**Ask:**

> "Any priorities you want shifted (P1↔P2, etc.)? Any XL issue you want broken into smaller tickets now?"

**Wait for the user's input.**

---

### 4. Dependencies and critical path

**Produce:**

- Map **dependencies** between issues (blocks / blocked-by). Use text arrows, a mermaid diagram, or a table — whatever is clearest.
- Identify the **critical path**: the longest dependent chain that would delay delivery if any link slips.

**Ask:**

> "Does this dependency map match reality — anything missing, or any dependency we should remove?"

**Wait for the user's input.**

---

### 5. Cycles / sprints

**Produce:** Propose a cycle plan (e.g. 1–2 week slices): what ships each cycle, aligned with dependencies and something demoable per cycle. Call out **Milestone Zero** (foundation) if applicable.

**Ask:**

> "Does this grouping into cycles work for your team cadence, or should we move issues between cycles?"

**Wait for the user's input.**

---

### 6. Linear export format

**Produce:** Final issue list formatted for execution — each issue with full description template, labels, priority, size, dependencies.

**Ask:**

> "Do you want the issues as **markdown** you can paste into Linear (or attach to issues), or do you want **API-ready** structured data (e.g. JSON) for Linear's API? If API, confirm you have token/access details handled outside this chat."

**Wait for the user's input.**

**Produce:** Deliver in the chosen format. (Do not claim API creation succeeded unless the user confirms integration.)

---

### 7. Save the issue plan

**Produce:** One consolidated document containing:

- Grouped issue catalog (Foundation / Feature / Testing / Documentation)
- Full descriptions, priorities, labels, sizes
- Dependency map and critical path
- Cycle plan
- Linear export section (markdown or API-oriented appendix as chosen)

**Save:** Write to **`docs/08-issue-plan.md`** in the user's project.

`08` is the next number after **`docs/07-frontend-coding-rules.md`** (from `peer-ai/frontend/02-rules.md`), so filenames under `docs/` follow chronological workflow order: 01–05 shared track, 06–07 frontend track, then this issue plan.

**Ask:**

> "Open `docs/08-issue-plan.md` and skim — anything to tweak before we close this step?"

**Wait for the user's input.** (If the user says it's fine, proceed.)

### PDF-ready export

After saving the issue plan, offer:

> "Want me to generate a PDF-ready HTML version in `docs-pdf/`? You can open it in a browser and print/save as PDF to share with stakeholders or the team."

**Wait for the user's input.** If yes, tell the user: "Switch to **Composer 2** for the HTML export — it's pure templating work and much cheaper. Let me know when you've switched." Wait for confirmation, then generate `docs-pdf/08-issue-plan.html` following the styling rules in `peer-ai/shared/rules/docs-pdf-export.md`. Ensure `docs-pdf/` is gitignored. After the export, remind the user to switch back to the previous model. If no, move on.

---

### 8. GitHub + Linear integration and PR conventions

**Produce:** Before the user starts building, confirm that the GitHub repository and Linear workspace are connected and the team follows these conventions. Present them clearly:

**Branch naming (required):**

```
feature/PROJ-XX-short-description
```

Format: `feature/<linear-ticket-id>-<short-description>`. The Linear ticket ID at the start creates an automatic link between the code and the task.

**Commit messages (required):**

```
PROJ-XX: short description of the change
```

Reference the Linear ticket ID in every commit message. This enables automatic ticket status updates.

**Pull request conventions:**

| Rule | Detail |
|------|--------|
| Title format | `[PROJ-XX] Short description of what this does` |
| Description | Brief explanation of what changed and why — not a restatement of the ticket |
| Checks before review | Lint, type check, build must all pass |
| Review requirement | One peer review required before merge |
| Response time | Reviewers respond within one working day |
| Merge strategy | Squash and merge preferred — keeps main history clean |
| After merge | Delete the feature branch |
| Nitpicks | Mark nitpick comments clearly so they are not treated as blocking |

**GitHub-Linear auto-sync:**

| GitHub action | Linear effect |
|---------------|---------------|
| Branch created with ticket ID in name | Ticket moves to In Progress |
| PR opened referencing the ticket | PR appears linked inside the Linear ticket |
| PR merged into main | Ticket moves to Done |

**CI checks (minimum):**

A basic GitHub Actions workflow should run on every PR: lint, type check, build. This catches obvious issues before human review.

**Ask:**

> "Does your project have these GitHub + Linear conventions set up? If not, should we add the branch protection rules and GitHub Actions config as issues in the plan?"

**Wait for the user's input.**

---

### 9. Next step for implementation

Tell the user:

> "Issues are planned. Start building by following **`peer-ai/frontend/03-build.md`** (frontend) or **`peer-ai/backend/03-build.md`** (backend), depending on your track."

---

### Update workflow state

If `.peer-ai-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
