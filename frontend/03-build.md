# 03 — Build (Frontend)

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Composer 2** — code generation is where Composer 2 excels (beats Opus on coding benchmarks, 86% cheaper). Before starting, tell the user: "Before we begin, switch to **Composer 2** in the model picker (bottom-left of the chat panel). It's built for coding and much more cost-efficient for building. For UI-heavy work (dashboards, charts, layouts), switch to **Gemini 3 Pro** instead. If we hit a complex architectural decision mid-build, I'll tell you to switch to Opus 4.6 temporarily. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

**Context:** Page specs and frontend rules should be in place (`docs/06-page-specs.md`, `docs/07-frontend-coding-rules.md`). This workflow is about **writing and integrating code**.

---

## Steps

### 1. New vs. existing project

First, determine whether this is a new project or work on an existing codebase. Check for clues before asking — if earlier workflow docs exist (`docs/03-system-spec.md`, `docs/06-page-specs.md`) but there's no `src/` folder or `package.json`, it's almost certainly a brand-new project. If code files already exist, it's likely continuation, new features, or refactoring.

If you can confidently infer the answer, confirm it:

> "I can see specs are in place but no code exists yet — this is a **brand-new** project. Sound right?"

Otherwise, ask:

> "Are we starting a **brand new** project or **adding to an existing** one?"

**Wait for the user's input.**

- If **new**: scaffold **Vite + React + TypeScript**, install agreed dependencies, create the folder structure from the rules doc, add **ESLint** and **Prettier**, and align scripts with `docs/07-frontend-coding-rules.md`.
- If **existing**: skip scaffolding; briefly confirm stack and folder layout, then move to step 2.

**Wait for the user's input** after presenting what you created or what you'll assume for the existing repo.

---

### 2. Design mockups (before writing code)

Before code gets written, ask the user which design approach they want. This step produces visual mockups that guide implementation and can be shared with stakeholders for sign-off.

Ask:

> "Before we start coding, let's talk about design mockups. Creating visual mockups first helps catch layout issues early and gives stakeholders something to review.
>
> Which approach do you want?
>
> **A) Figma (MCP)** — I'll create mockups directly in your Figma file. Requires a Figma Professional+ seat and the Figma MCP server configured.
>
> **B) Penpot (MCP)** — I'll create mockups in Penpot, a free open-source design tool with MCP support. Self-hosted, no per-seat cost.
>
> **C) Paper.design (MCP)** — I'll create mockups in Paper, a design-to-code tool that renders real HTML/CSS/Tailwind as you design. The output is production-ready code, not a spec to re-implement. Requires the Paper desktop app and MCP server.
>
> **D) Another design tool** — If you use a different design tool, tell me which one and I'll adapt.
>
> **E) Skip — build directly in code** — No separate design tool. I'll build the UI as live code during the build steps. Fastest path.
>
> Which do you prefer: A, B, C, D, or E?"

**Wait for the user's input.**

**If A (Figma MCP):**
- Ask the user for their Figma file URL
- Confirm the Figma MCP server is configured in Cursor (if not, guide them: they need a Figma personal access token and the MCP server added in Cursor settings)
- Tell the user: "Switch to **Gemini 3 Pro** in the model picker — it's the best model for visual/layout work. Let me know when you've switched."
- **Wait for confirmation**, then create page mockups one at a time in Figma, following `docs/06-page-specs.md` — frames, component layouts, responsive variants, key states (loading, error, empty)
- After each page mockup, ask the user to review it in Figma and confirm or request changes
- When all mockups are approved, tell the user to switch back to **Composer 2** for coding

**If B (Penpot MCP):**
- Ask the user for their Penpot instance URL and project/file link
- Confirm the Penpot MCP server is configured in Cursor (if not, guide them: they need the Penpot MCP server from the penpot/penpot repo and their API credentials)
- Tell the user: "Switch to **Gemini 3 Pro** in the model picker — it's the best model for visual/layout work. Let me know when you've switched."
- **Wait for confirmation**, then create page mockups one at a time in Penpot, following `docs/06-page-specs.md`
- After each page mockup, ask the user to review and confirm or request changes
- When all mockups are approved, tell the user to switch back to **Composer 2** for coding

**If C (Paper.design MCP):**
- Ask the user to confirm they have the Paper desktop app installed (paper.design/downloads) and a file open
- Confirm the Paper MCP server is configured in Cursor (if not, guide them: the Paper MCP server runs automatically when the desktop app is open with a file — no separate setup needed)
- Tell the user: "Switch to **Gemini 3 Pro** in the model picker — it's the best model for visual/layout work. Let me know when you've switched."
- **Wait for confirmation**, then create page mockups one at a time in Paper, following `docs/06-page-specs.md` — since Paper renders real HTML/CSS/Tailwind, the mockups are production-ready code, not just visual specs
- After each page mockup, ask the user to review it in Paper and confirm or request changes
- When all mockups are approved, the code from Paper can be pulled directly into the project. Tell the user to switch back to **Composer 2** for integrating the generated code into the app structure

**If D (another tool):**
- Ask which tool they use and whether it has an MCP server or API
- If it has MCP support, guide setup and follow the same mockup-per-page flow as A/B/C
- If no MCP support, suggest they create mockups manually in their tool, then share screenshots or links. The AI can review the mockups against the spec and flag any mismatches before coding begins
- When ready, proceed to step 3

**If E (skip design tool):**
- Acknowledge the choice and move on. The UI will be built as live code during the build steps below
- No model switch needed — stay on **Composer 2**

---

### 3. Application shell

Plan and build: **root layout**, **sidebar** (or nav), **React Router**, **auth guard**, **role-based route protection**. Present the plan, get confirmation, then implement.

> "Here's the shell I'll build: [routes, guards, layout]. Does this match `docs/06-page-specs.md` and your auth model?"

**Wait for the user's input.**

After implementing, ask the user to run the app and confirm layout and navigation.

> "Please run the dev server and click through the shell. Does navigation and the auth placeholder behave as you expect?"

**Wait for the user's input.**

---

### 4. Mock data layer

For **every endpoint** described in `docs/04-api-contract.md`, add **mock functions** that return **typed** test data matching the **exact** contract shapes. Wire **`VITE_USE_MOCK_DATA`** (or the project's agreed toggle) so services switch between mock and real.

> "I've added mocks for [list endpoints]. Can you toggle mock mode and confirm the app still loads and types check?"

**Wait for the user's input.**

---

### 5. Build pages one at a time

Ask:

> "Which page should we build first? We'll follow `docs/06-page-specs.md`."

**Wait for the user's input.**

For the **chosen** page:

- Implement according to the spec (and mockups from step 2 if they exist)
- Connect to **mock** data  
- Implement **loading**, **error**, and **empty** states  
- Make it **responsive** per spec  

Then ask the user to test.

> "This page is wired to mocks with states and responsive layout. Please try it on mobile width and with empty/error scenarios if you can. Anything to change?"

**Wait for the user's input.**

### Linear issue update

Once the user confirms the page is done, update the Linear ticket for this work:

1. **Tick acceptance criteria** — check off every completed checkbox in the ticket description. Use Linear MCP if available; otherwise list the items for the user to tick manually.
2. **Add a completion comment** — post a concise comment (3–5 bullets) on the issue: what was built, what data source (mock/real), any deviations, any follow-ups.
3. **Add a project update** — post a one-sentence progress update to the Linear project (e.g. "Fleet Status page complete — KPI ribbon, table, drawer, responsive layout all working against mock data.").

If Linear MCP is not connected, draft all three as text and tell the user to paste them into Linear.

---

### 6. Repeat for remaining pages

After each page is done, ask:

> "Which page should we do next?"

**Wait for the user's input.**

Repeat step 5 until all pages from the spec are implemented against mocks.

---

### 7. Real API integration (readiness check)

When all pages work with mocks, ask:

> "Ready to integrate **real** APIs? Which endpoints are **available** from the backend right now, and are there any differences from `docs/04-api-contract.md`?"

**Wait for the user's input.**

---

### 8. Replace mocks incrementally

Replace mock services with **real** API calls **one group at a time** (e.g. by domain or route). After each group, run through the affected pages and fix issues.

> "I've switched [this group] to live calls. Please exercise [these flows]. See any errors or shape mismatches?"

**Wait for the user's input** before moving to the next group.

After all groups are switched to live APIs, suggest a contract verification:

> "Now that we're on real APIs, it's a good time to verify everything matches the contract. Want to run a contract check? Type: `Follow .workflow/agents/contract-check-prompt.md`"

**Wait for the user's input.** If they say yes, pause the build workflow — they'll come back after the contract check. If they say no or want to do it later, continue to step 9.

---

### 9. Polish pass

Apply **animations** (if spec'd), **final responsive** checks, **accessibility** pass (focus, labels, contrast), and **performance** sanity (lazy routes, large lists).

> "I've done a polish pass. Any areas you want extra attention before we call the build done?"

**Wait for the user's input.**

---

### 10. Final Linear project update

Before handing off, post a project-level update to the Linear project summarizing the full build phase:

> "[App name] build phase complete. [N] pages implemented against [mock/real] data. Shell, auth guard, routing, and responsive layout all in place. Moving to code review and contract check."

If Linear MCP is not connected, draft the update for the user to paste.

---

### 11. Hand off

Tell the user:

> "Build is complete. There are two agents that should run before the full review — I can kick them off **in parallel** to save time:
>
> 1. **Code review agent** — produces a structured findings report
> 2. **Contract check agent** — verifies your implementation matches the API contract
>
> Want me to run both now? I'll launch them as parallel background agents and summarise the results when they're done. Then we move to the full interactive review: `Follow .workflow/frontend/04-review.md`."

**If the user says yes:** launch both agents as parallel background tasks using `.workflow/agents/review-prompt.md` and `.workflow/agents/contract-check-prompt.md`. Summarise combined results when both complete.
**If they prefer sequential:** run code review first, then contract check.
**If they decline:** proceed directly to the review phase.

---

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from .workflow/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
