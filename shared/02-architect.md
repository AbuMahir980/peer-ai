# 02 — System Architecture

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Opus 4.6** — architecture decisions require deep trade-off reasoning. Before starting, tell the user: "Before we begin, switch to **Opus 4.6** in your AI tool's model selector. Architecture needs the deepest reasoning model. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

---

## How this works

The user has already completed requirements capture (`docs/01-requirements-summary.md` should exist). Your job is to define the full system architecture — components, data flows, API conventions at a high level, cross-cutting concerns, and ADRs — before detailed specs or code.

---

## Step 1: Read the requirements summary

Read `docs/01-requirements-summary.md` in the project. If the file is missing or empty, ask the user to paste its contents or confirm where the requirements live.

> "I've pulled in your requirements summary. Anything important that's changed since this was written, or any gaps I should know about before we architect?"

**Wait for the user's input.**

## Step 2: Capture known technical constraints

Produce a short note (bullet list) of constraints you can infer from the requirements. Then ask what is already decided.

> "Beyond what's in the requirements doc — what's already fixed? For example: tech stack, hosting or cloud, team members who own frontend vs backend, databases or services we must use or avoid, compliance, or existing systems we must integrate with. Tell me what's non-negotiable and what's still open."

**Wait for the user's input.**

Update your working notes with their answers before continuing.

## Step 3: Define system components

Produce a **table** with columns: **Component** | **Purpose** | **Owner** | **Technology** | **Deployment** — covering every major piece (frontends, APIs, databases, queues, external integrations, etc.). Use placeholders like "TBD" only where the user said it's undecided.

> "Here's my component table. Which rows are wrong, missing, or need a different owner or tech choice?"

**Wait for the user's input.**

Revise the table based on their feedback.

## Step 4: Trace data flows for key user actions

Ask which user actions matter most for integration and debugging.

> "Which 3–5 user actions should we trace end-to-end? Think: login, the main 'happy path' for each persona, and anything that hits external systems or sensitive data. You can pick them, or I can suggest a set from the requirements."

**Wait for the user's input.**

For each agreed action, produce a **numbered trace** from UI → API → services → storage → response → UI (include auth checks and note where external calls happen). Ask if the flows match reality.

> "Do these flows match how you expect the system to behave? Any missing branches (errors, webhooks, batch jobs)?"

**Wait for the user's input.**

## Step 5: Propose architecture pattern and choose

Present **2–3 pattern options** (e.g. monolith, modular monolith, BFF, multi-app with shared auth, microservices) with **trade-offs**: team size, complexity, deploy independence, operational cost, and fit to their constraints. Recommend one default.

> "Given your constraints, I'm leaning toward [X] because [reason]. Do you want to go with that, or pick another option — and is there anything specific (scaling, team split, legacy systems) that should override the default?"

**Wait for the user's input.**

Record the **chosen pattern** and **why** in one short paragraph.

## Step 6: Define API layer conventions (high level)

Produce a first draft: base path/versioning style, auth mechanism (conceptual), response shape (envelope or not), and how errors surface (status + codes). Then ask for preferences.

> "For the API layer, do you have preferences on: REST vs GraphQL (or RPC), how auth should work (e.g. JWT bearer, sessions, API keys for services), and whether responses should use a standard envelope? If you don't care, I'll recommend defaults and we can lock them in."

**Wait for the user's input.**

Align the draft with their choices and note that **detailed** request/response shapes belong in `docs/04-api-contract.md` later.

## Step 7: Define cross-cutting concerns

Produce sections (bullets are fine) for: **authentication & authorization**, **error handling & logging**, **configuration & secrets**, **deployment & environments**, **monitoring & observability** — each tied to their stack where known.

> "Does this cover how you want auth, errors, config, deploys, and monitoring handled? What's missing or different in your org?"

**Wait for the user's input.**

Revise based on feedback.

## Step 8: Document architecture decisions (ADRs)

For each **significant** decision (pattern choice, split of apps/services, major tech picks, integration approach), produce a mini **ADR**: **Decision**, **Context**, **Consequences** (2–4 sentences each).

> "Here are the ADRs for the big calls we made. Any decision you want added, reworded, or marked as 'provisional'?"

**Wait for the user's input.**

Incorporate edits.

## Step 9: Save the output

Combine everything into one coherent document and save it as **`docs/02-architecture.md`**.

Tell the user:

> "Saved to `docs/02-architecture.md`. When you're ready, continue with **`peer-ai/shared/03-spec-system.md`** to write the product/system spec."

### PDF-ready export

After saving the markdown, offer:

> "Want me to generate a PDF-ready HTML version in `docs-pdf/`? You can open it in a browser and print/save as PDF to share with stakeholders."

**Wait for the user's input.** If yes, tell the user: "Switch to **Composer 2** for the HTML export — it's pure templating work and much cheaper. Let me know when you've switched." Wait for confirmation, then generate `docs-pdf/02-architecture.html` following the styling rules in `peer-ai/shared/rules/docs-pdf-export.md`. Ensure `docs-pdf/` is gitignored. After the export, remind the user to switch back to the previous model. If no, move on.

---

### Update workflow state

If `.workflow-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague helping them think through this.
