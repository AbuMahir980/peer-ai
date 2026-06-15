# 01 — Page Specs (Frontend)

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Opus 4.6** — page specs need full system context across UI states, data flows, and RBAC. Before starting, tell the user: "Before we begin, switch to **Opus 4.6** in your AI tool's model selector. Page specs need deep reasoning. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

**Context:** An API contract already exists (`docs/04-api-contract.md`). The goal is to define every page before any implementation work begins.

---

## Steps

### 1. Read inputs

Read `docs/03-system-spec.md` and `docs/04-api-contract.md`. Summarize in a few sentences what the system does and what the API exposes, so the user knows you understood the sources.

**Wait for the user's input** if they want to correct or add context before you continue.

---

### 2. Inventory all pages

Produce a **table** with columns: **Page name**, **Route**, **Roles who see it**, **Priority** (e.g. P0/P1/P2). Order by priority.

Present the table and ask the user to confirm or adjust routes, roles, and priorities. Example phrasing:

> "Here’s the page list I derived from the spec and API. Does this match your product? Please confirm or tell me what to add, remove, or reprioritize."

**Wait for the user's input.**

---

### 3. Deep-dive each page (highest priority first)

For **one page at a time**, work through the following. After each subsection, get confirmation before moving on.

**3a — Layout**

Describe the main regions (header, sidebar, main, modals, etc.) and how they relate.

> "For **[page name]**, I’m picturing this layout: [brief description]. Does that match what you want, or should we change regions or hierarchy?"

**Wait for the user's input.**

**3b — Components**

List each UI component for the page with **props** and **data** each one needs (from API or local state).

> "Here are the components I’d use on this page and what each needs. Anything missing or that should be split/merged?"

**Wait for the user's input.**

**3c — Data sources**

Map the page to **specific endpoints** from `docs/04-api-contract.md` (method, path, request/response shapes as referenced in the contract).

> "This page would call: [list]. Does that align with how the backend will be used?"

**Wait for the user's input.**

**3d — Loading, error, and empty states**

Propose concrete UX for loading, error, and empty (no data) states.

> "For loading I’d use [approach]; for errors [approach]; for empty [approach]. Does that work for you?"

**Wait for the user's input.**

**3e — Role-based visibility**

State what **each role** sees, hides, or cannot access on this page.

> "For **[role]**, they would see [X] but not [Y]. Is that correct?"

**Wait for the user's input.**

**3f — Responsive behavior**

Ask about **mobile-specific** differences (columns hidden, bottom nav, stacked layout, etc.).

> "On small screens, should we [your proposal]? Any breakpoints or mobile-only flows I should encode in the spec?"

**Wait for the user's input.**

**3g — Forms and validation** *(only for pages with user input)*

For pages that contain forms or editable fields, specify: fields list, required vs optional, **client-side validation rules** (format, length, range), **server-side validation** the API enforces (from the contract), inline error display, **optimistic updates** (if any), **autosave** behavior, and **dirty-state** warnings (unsaved changes on navigation).

> "This page has forms. Here are the fields, validation rules, and submit behavior I'd spec: [details]. Does this match what you need — any fields missing, or validation rules to change? Should we support autosave or warn on unsaved changes?"

**Wait for the user's input.**

Repeat **3a–3g** for the next page until all pages in the agreed list are specified.

---

### 4. Shared components

List **shared** components used across multiple pages (name, purpose, main props, which pages use them).

> "These are the shared pieces I’d extract. Add or remove anything?"

**Wait for the user's input.**

---

### 5. Sidebar and navigation per role

Present the **navigation structure** (items, labels, routes, icons if relevant) **per role**. Note items that are hidden or disabled per role.

> "Here’s how I’d structure the sidebar/nav for each role. Does this match your IA and permissions model?"

**Wait for the user's input.**

---

### 6. Save the document

Consolidate everything into a single markdown spec and **save** as:

`docs/06-page-specs.md`

Include: page table, per-page sections (layout, components, data, states, roles, responsive), shared components, and nav per role.

---

### 7. Hand off

Tell the user:

> "Page specs are done. Next, establish frontend rules with **`peer-ai/frontend/02-rules.md`**."

---

### Update workflow state

If `.workflow-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
