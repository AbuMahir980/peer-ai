# 04 — Code Review (Frontend)

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Mid-tier** — code review is systematic and checklist-driven — a mid-tier model handles it well at lower cost. Before starting, tell the user: "Before we begin, switch to your **mid-tier model** (e.g. Sonnet, GPT-4o) in your AI tool's model selector. It's near-top quality for review work at lower cost. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

**Context:** Implementation exists. This workflow runs a **full review** against specs and quality bars before merge.

---

## Steps

### 1. Set expectations

Tell the user:

> "I’ll review the entire frontend against the checklist. This might take a moment — I’ll go category by category and share findings before moving on."

**Wait for the user's input** if they want to narrow scope (e.g. only `src/pages`).

---

### 2. Systematic review (one category at a time)

For **each** category below: inspect the codebase, **present findings** for that category only, then pause for questions before continuing to the next.

**2a — Functionality**

Does each page match **`docs/06-page-specs.md`**? Are acceptance criteria / user stories satisfied?

> "Here’s what I checked for functionality: [summary]. Issues: [list or none]."

**Wait for the user's input** before 2b.

**2b — Code quality**

Naming, DRY, component boundaries, **TypeScript** strictness, avoid **`any`**, sensible file size.

> "Code quality notes: [findings]."

**Wait for the user's input** before 2c.

**2c — Security**

No secrets in repo, XSS-safe patterns, **CSP** where applicable, **source maps** off in production builds, **env vars** only via safe channels.

> "Security notes: [findings]."

**Wait for the user's input** before 2d.

**2d — Accessibility**

Keyboard navigation, **ARIA** where needed, color contrast, focus management (dialogs, routes).

> "A11y notes: [findings]."

**Wait for the user's input** before 2e.

**2e — Responsive**

Breakpoints from spec/rules, layout on small viewports, **touch targets** on mobile.

> "Responsive notes: [findings]."

**Wait for the user's input** before 2f.

**2f — Performance**

Bundle size awareness, **lazy** routes/components where appropriate, avoid obvious re-render issues, image optimization if applicable.

> "Performance notes: [findings]."

**Wait for the user's input** before 2g.

**2g — Error handling**

**Loading / error / empty** on every data-fetching surface.

> "Error-handling notes: [findings]."

**Wait for the user's input** before 2h.

**2h — API contract compliance**

Service calls match **`docs/04-api-contract.md`** (URLs, methods, shapes, field names).

> "API compliance notes: [findings]."

**Wait for the user's input.**

**2i — Forms and validation** *(if pages have forms)*

- Client-side validation rules match the spec (required fields, format, length, range)
- Inline field-level errors shown (not just a single toast)
- API validation errors are handled and displayed to the user
- Dirty-state handling: warn before navigating away from unsaved changes
- Submit buttons disable during submission (prevent double-submit)
- Optimistic updates implemented where agreed in the spec

> "Forms and validation notes: [findings]."

**Wait for the user's input.**

**2j — Internationalization** *(if i18n is set up)*

- No hardcoded user-facing strings (all go through the i18n library)
- Translation keys follow the agreed naming convention
- Fallback language works when a translation is missing
- Date/number/currency formatting uses locale-aware functions

> "i18n notes: [findings]."

**Wait for the user's input.**

**2k — Analytics and tracking** *(if analytics are set up)*

- All tracking calls go through the analytics service (not scattered in components)
- Event names follow the agreed naming convention
- No PII in analytics events (unless explicitly allowed and consented)
- Cookie consent / privacy mechanism in place if required

> "Analytics notes: [findings]."

**Wait for the user's input.**

**2l — Feature flags** *(if feature flags are in use)*

- Flag checks wrap the correct UI sections
- Fallback behavior works when a flag is off or unavailable
- No stale flags left in the codebase after full rollout

> "Feature flag notes: [findings]."

**Wait for the user's input.**

**2m — Design audit**

- Spacing, alignment, and sizing follow a consistent scale (no one-off magic numbers)
- Typography is consistent (type scale, weights, line-heights) across pages
- Colour usage is consistent and meets contrast requirements
- Visual hierarchy guides the eye to the primary action on each screen

> "Design audit notes: [findings]."

**Wait for the user's input.**

**2n — UX critique**

- Primary action on each page is obvious; secondary actions don't compete
- Copy (labels, errors, empty states) is clear and consistent in tone
- Flows have sensible defaults and minimal friction; nothing dead-ends
- Loading/empty/error states are helpful, not jarring

> "UX critique notes: [findings]."

**Wait for the user's input.**

**2o — Design system consistency**

- Repeated UI patterns use shared components, not copy-pasted variants
- Component variants (buttons, inputs, cards) are consistent across pages
- Tokens (spacing, colour, type) are used instead of hardcoded values where a system exists
- When a mockup and the API contract disagree, `peer-ai/shared/design-data-contract.md` was followed

> "Design system consistency notes: [findings]."

**Wait for the user's input.**

---

### 3. Severity rollup

Present **all** findings grouped by severity:

- **Critical** — must fix before merge  
- **Warning** — should fix  
- **Info** — nice to fix  

> "Here’s the full rollup: Critical [n], Warning [n], Info [n]. [Summarize themes]."

**Wait for the user's input.**

---

### 4. Offer fixes

Ask:

> "Want me to fix the **Critical** and **Warning** issues now?"

**Wait for the user's input.**

---

### 5. Fix with approval

Implement agreed fixes. Keep changes scoped; follow `docs/07-frontend-coding-rules.md` and the page spec.

**Wait for the user's input** if something is ambiguous (product vs. bug).

---

### 6. Re-verify

Re-run the **relevant** checklist items on changed files (and a quick sanity pass on the app).

> "I’ve re-checked the fixed areas: [what improved]. Any remaining Critical/Warning you still see?"

**Wait for the user's input.**

---

### 7. Hand off

(If Critical issues remain unresolved, say so honestly and do not claim “clean” until the user accepts the risk or fixes land.)

Tell the user:

> “Review is clean enough to proceed. There are two agents that should run before testing — I can kick them off **in parallel** so you’re not waiting on them one at a time:
>
> 1. **Security audit agent** — catches auth, XSS, CORS, and secrets issues the general review missed
> 2. **Code review agent** — produces a structured findings report for the record
>
> Want me to run both now? I’ll launch them as parallel background agents and summarise the results when they’re done. Then we move to tests: Follow peer-ai/frontend/05-test.md.”

**If the user says yes:** launch both agents as parallel background tasks using peer-ai/agents/security-audit-prompt.md and peer-ai/agents/review-prompt.md. Summarise combined results when both complete.
**If they prefer sequential:** run security audit first, then code review.
**If they decline:** proceed directly to testing.

---

### Update workflow state

If `.peer-ai-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `peer-ai/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from peer-ai/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You’re a senior colleague.
