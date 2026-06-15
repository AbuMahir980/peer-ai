# 03 — System Spec (PM Spec)

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Most capable** — user stories and acceptance criteria require full system context. Before starting, tell the user: "Before we begin, switch to your **most capable model** (e.g. Opus, o3, Claude) in your AI tool's model selector. Spec writing needs precise reasoning. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

---

## How this works

The user has completed architecture (`docs/02-architecture.md` should exist). Your job is to write a **product / system specification** — what the system does from the user's perspective — so the team has a single narrative before implementation.

---

## Step 1: Read requirements and architecture

Read **`docs/01-requirements-summary.md`** and **`docs/02-architecture.md`**. If either file is missing, ask the user to provide the path or paste the content.

> "I've read the requirements summary and architecture doc. Is there anything in them that's already outdated, or any stakeholder nuance I should reflect in the spec?"

**Wait for the user's input.**

## Step 2: Write the product overview

Produce **one paragraph** (or two short paragraphs max) that a non-technical stakeholder could understand: what this is, who uses it, what problem it solves, and how it fits the wider product or system.

> "Here's the product overview. Does this match how you'd explain the project to leadership or a new teammate? What should I change?"

**Wait for the user's input.**

Revise until they confirm.

## Step 3: Define user roles and permissions

Ask about roles before you lock a table.

> "Who are the user roles we need in this release — names and a one-line job for each? For each role, what should they **see** (pages, data) and what should they **do** (actions)? What must they explicitly **not** be able to do?"

**Wait for the user's input.**

Produce a **table**: **Role** | **Description** | **Can see / do** | **Cannot see / do** (and optionally **Notes**). Iterate if they want changes.

> "Here's the roles and permissions table. Any role missing, or any permission too broad or too tight?"

**Wait for the user's input.**

## Step 4: User stories and MoSCoW priorities

Brainstorm with the user: group stories by **feature area**. Use the format: **As a [role], I want [action] so that [outcome].** Tag each with **Must / Should / Could / Won't (this phase)**.

> "I'll draft stories by area. Before I prioritize: are there any Must-haves you already know about, or anything you want in 'Won't have' so scope stays honest?"

**Wait for the user's input.**

Produce the grouped list with MoSCoW tags.

> "Here's the story set with MoSCoW. Which items should move up or down, and is anything missing?"

**Wait for the user's input.**

Adjust priorities based on their answers.

## Step 5: Acceptance criteria (Must and Should)

For every **Must have** and **Should have** story, write **Given / When / Then** acceptance criteria (multiple scenarios where needed: happy path, empty state, permission denied, etc.).

> "Here are the acceptance criteria for Must and Should stories. Which scenarios are wrong, too weak, or missing edge cases you care about?"

**Wait for the user's input.**

Update criteria accordingly.

## Step 6: Data requirements per feature

For each **feature area**, produce a concise spec: **what data** the UI needs, **source** (system/API/table), **fields or entities** (high level), **freshness** (real-time, polled, cached, on load only), and **fallback** when data is missing or slow (loading, error, stale banner, etc.).

> "Here's data requirements by feature. Are the sources and freshness assumptions realistic? Any field or integration I got wrong?"

**Wait for the user's input.**

Revise as needed.

## Step 7: Non-functional requirements

Draft NFRs covering **performance**, **browser support**, **responsiveness / devices**, **accessibility**, **security**, and any other category that fits (e.g. offline, localization). Use sensible defaults only where the user hasn't specified.

> "For non-functionals: what are your targets or policies for performance (e.g. page load, API latency), which browsers and versions must work, mobile/tablet expectations, accessibility level (e.g. WCAG), and security (auth, PII, audit logs)? Tell me what's mandatory vs nice-to-have."

**Wait for the user's input.**

Merge their answers into a clear **Non-functional requirements** section.

> "Here's the NFR section updated with what you said. Anything to add or tighten?"

**Wait for the user's input.**

## Step 8: Save the output

Combine overview, roles, stories with MoSCoW, acceptance criteria, data requirements, and NFRs into one document and save as **`docs/03-system-spec.md`**.

Tell the user:

> "Saved to `docs/03-system-spec.md`. When you're ready, continue with **`peer-ai/shared/04-spec-api-contract.md`** to define the frontend–backend API contract."

### PDF-ready export

After saving the markdown, offer:

> "Want me to generate a PDF-ready HTML version in `docs-pdf/`? You can open it in a browser and print/save as PDF to share with stakeholders."

**Wait for the user's input.** If yes, tell the user: "Switch to your **fastest model** (e.g. Auto, Gemini Flash) for the HTML export — it's pure templating work and much cheaper. Let me know when you've switched." Wait for confirmation, then generate `docs-pdf/03-system-spec.html` following the styling rules in `peer-ai/shared/rules/docs-pdf-export.md`. Ensure `docs-pdf/` is gitignored. After the export, remind the user to switch back to the previous model. If no, move on.

---

### Update workflow state

If `.peer-ai-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague helping them think through this.
