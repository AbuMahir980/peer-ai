# 07 — Documentation

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Auto or Gemini Flash** — documentation is mostly templated and straightforward. Before starting, tell the user: "Before we begin, switch to **Auto** or **Gemini Flash** in your AI tool's model selector. Documentation is templated work — no need for a premium model (85-90% cheaper). Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

Context: a cycle or milestone is complete. Update living docs, record what shipped, and communicate with stakeholders or handoff recipients.

---

## Process

### 1. Establish what shipped

**Produce:** Offer two paths: (A) the user summarizes what completed this cycle, or (B) you infer from `git log` and/or Linear (or issue list) if they grant access to those sources.

**Ask:**

> "What did we complete this cycle — or should I read the git log / issue tracker to draft the list? If I should read git, which branch or date range?"

**Wait for the user's input.**

---

### 2. Update the project README

**Produce:** Once scope is clear, identify README sections that typically need updates: what the project is, how to run it, structure, env vars, deploy, contacts.

**Ask:**

> "Which README sections are outdated or missing? Anything you want emphasized for new contributors (e.g. troubleshooting, architecture diagram)?"

**Wait for the user's input.**

**Produce:** Draft README updates; apply to the project's **`README.md`** when the user approves.

**Ask:**

> "Does this README diff look right, or should we adjust tone/depth?"

**Wait for the user's input.**

---

### 3. Update CHANGELOG.md

**Produce:** Add entries for everything shipped this cycle using **[Keep a Changelog](https://keepachangelog.com/)** format (`Added`, `Changed`, `Fixed`, `Deprecated`, `Removed`, `Security` as appropriate), with version or date heading per project convention.

**Save:** Merge into **`CHANGELOG.md`** at the repo root (or project-standard location if they use monorepo packages).

**Ask:**

> "Changelog grouping and version label — match your release tagging, or should I use an `[Unreleased]` section until you tag?"

**Wait for the user's input.**

---

### 4. Architecture decisions (ADRs)

**Produce:** Ask whether any decisions this cycle warrant an ADR (cross-cutting choice, trade-offs, alternatives rejected). Use the template at **`peer-ai/shared/templates/architecture-decision-record.md`** (or `docs/adr/` naming convention `001-title.md`).

**Ask:**

> "Were there architecture decisions this cycle that need ADRs? If yes, list them briefly; if no, we'll skip."

**Wait for the user's input.**

**Produce:** For each confirmed decision, draft an ADR and save under **`docs/adr/`** (or path the user specifies).

**Ask:**

> "Review each ADR for accuracy — anything to correct before we finalize?"

**Wait for the user's input.**

---

### 5. Update the API contract

**Produce:** If endpoints were added, changed, or deprecated, update the living API contract doc (the artifact from the spec phase, e.g. under `docs/`).

**Ask:**

> "Did the API surface change this cycle? If yes, point me to the contract file path or paste the delta; if no, we'll note 'no API contract changes.'"

**Wait for the user's input.**

**Produce:** Apply edits to the agreed contract file.

**Ask:**

> "Does the updated contract match what actually shipped?"

**Wait for the user's input.**

---

### 6. Stakeholder update

**Produce:** Draft a stakeholder summary using **`peer-ai/shared/templates/stakeholder-review.md`** as the structural guide: outcomes in plain language, what's next, risks, demo/screenshot placeholders.

**Ask:**

> "Who is the audience (exec, PM, clients), and what tone do you want — formal brief, casual update, or bullet-only? Any dates or metrics I must include?"

**Wait for the user's input.**

**Produce:** Complete the stakeholder document.

**Ask:**

> "Read-through: anything too technical, or missing?"

**Wait for the user's input.**

**Save:** Write to a path the user prefers — e.g. **`docs/stakeholder-update-YYYY-MM-DD.md`** or alongside cycle notes. Confirm filename with them if unsure.

**Ask:**

> "What filename and folder should I use for the stakeholder update?"

**Wait for the user's input.**

---

### 7. Handoff notes

**Ask:**

> "Is someone else picking up work next — do you need handoff notes (state, blockers, assumptions, links to specs/issues)?"

**Wait for the user's input.**

**Produce:** If yes, write handoff notes (current state, in-progress, known issues, links). Save to **`docs/handoff-YYYY-MM-DD.md`** or path they specify.

**Ask:**

> "Anything to add to the handoff before we close?"

**Wait for the user's input.** (Skip this ask if handoff was not needed.)

---

### 8. Save summary of documentation work

**Produce:** Short checklist for the user: README, CHANGELOG, ADRs, API contract, stakeholder file, handoff — each with final path.

**Ask:**

> "Anything we didn't document that should be captured now?"

**Wait for the user's input.**

### PDF-ready export

After confirming all docs are finalized, offer:

> "Want me to generate PDF-ready HTML versions for any docs we created or updated this cycle? I'll put them in `docs-pdf/` — you can open them in a browser and print/save as PDF to share with stakeholders. Which ones should I export?"

**Wait for the user's input.** If yes, tell the user: "Switch to **Composer 2** for the HTML export — it's pure templating work and much cheaper. Let me know when you've switched." Wait for confirmation, then generate the requested HTML files following the styling rules in `peer-ai/shared/rules/docs-pdf-export.md`. Ensure `docs-pdf/` is gitignored. After the export, remind the user to switch back to the previous model. If no, move on.

---

### 9. Close and point to next workflow

Tell the user:

> "Documentation is done. Next:
>
> - If you haven't set up PR automation yet, follow **`peer-ai/shared/09-pr-automation.md`** to configure GitHub Actions, branch protection, and automated review comments.
> - If PR automation is already set up, and you want to run a retrospective or set up your dev journal, follow **`peer-ai/shared/08-dev-journal.md`**.
> - If there's another cycle, go back to **`peer-ai/shared/01-understand.md`** for new features or **`peer-ai/shared/06-issues.md`** to plan the next batch of work."

---

### Update workflow state

If `.workflow-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
