# 05 — Testing (Frontend)

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Composer 2 or Sonnet 4.6** — test writing is well-scoped implementation work. Before starting, tell the user: "Before we begin, switch to **Composer 2** in the model picker (bottom-left of the chat panel) — it's fastest and cheapest for generating tests. If your tests need nuanced edge-case reasoning, use **Sonnet 4.6** instead. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

**Context:** Code has been reviewed. This workflow adds **automated tests** and runs them.

---

## Steps

### 1. Current tooling

Ask:

> "What testing tools are **already** set up? Vitest? Playwright? React Testing Library? Or should I set everything up **from scratch**?"

**Wait for the user's input.**

---

### 2. Infrastructure setup (if needed)

If anything is missing, add **Vitest** config, **Playwright** config, and **test scripts** in `package.json` per project conventions. Document how to run unit vs. E2E locally.

> "I’ll add [list]. OK to use these defaults, or do you have CI constraints?"

**Wait for the user's input.**

---

### 3. Unit tests for `src/utils/`

List **which** pure functions or modules in `src/utils/` deserve tests (names + what behavior you’ll assert).

> "I propose unit tests for: [list]. Add or drop any?"

**Wait for the user's input.**

Write the tests, then share a short summary of what each file covers.

**Wait for the user's input** if the user wants more cases.

---

### 4. Component tests (shared components)

Pick **key shared** components (from `docs/06-page-specs.md` or the codebase). Use **React Testing Library** — user-visible behavior, not implementation details.

> "I’ll test these shared components: [list]. Good set, or should I include/exclude anything?"

**Wait for the user's input.**

Implement tests; report pass/fail.

**Wait for the user's input.**

---

### 5. E2E critical flows

Ask:

> "Which **user flows** are most critical for E2E? (e.g. login, main journey, error handling.)"

**Wait for the user's input.**

Write **Playwright** tests for those flows (login, primary journey, at least one error path if applicable).

> "Here are the E2E specs I added: [files + scenarios]. Match your priorities?"

**Wait for the user's input.**

---

### 6. Contract tests

Add tests that assert frontend **service** calls match **`docs/04-api-contract.md`**: correct paths, methods, and expected request/response shapes (fixtures or schema checks as appropriate).

> "I’ve added contract-style checks for: [areas]. Anything else that must stay locked to the contract?"

**Wait for the user's input.**

---

### 7. Form and validation tests *(if pages have forms)*

Test that: required fields show errors when empty, format validation works (email, phone, date ranges), API validation errors are displayed correctly when the server rejects input, dirty-state warnings appear when navigating away from unsaved changes, and submit buttons disable during submission.

Ask:

> "Which forms are highest-risk (most fields, most complex validation)? Should I prioritize those for thorough test coverage?"

**Wait for the user's input.** If no forms exist, skip this step.

---

### 8. Accessibility tests

Add automated accessibility checks using **axe-core** (via Testing Library, Playwright, or a standalone runner). Test that: pages pass axe audit with no critical violations, keyboard navigation works for all interactive elements, focus management is correct on route changes and modal open/close, and skip links or landmarks are present.

Ask:

> "Should I run axe-core on every page or focus on the highest-traffic pages first? Any specific WCAG criteria beyond AA that matter for this project?"

**Wait for the user's input.**

---

### 9. i18n tests *(if internationalization is set up)*

Test that: the fallback language renders correctly when a translation is missing, switching locales updates all visible text, date/number formatting respects the active locale, and no raw translation keys appear in the rendered UI.

Ask:

> "Which locales should I test — just the primary and fallback, or all supported locales?"

**Wait for the user's input.** If no i18n exists, skip this step.

---

### 10. Run the suite

Run **all** tests (unit, component, E2E as applicable) and **present results** (pass/fail, logs for failures).

**Wait for the user's input** if the user wants to adjust CI vs. local commands.

---

### 11. Fix failures

If tests fail, prefer fixing **application code** when the behavior is wrong; fix **tests** only when the expectation was incorrect or the spec changed.

> "Failure [X] is due to [cause]. I’ll fix [code/test] — agree?"

**Wait for the user's input** when the right fix is ambiguous.

---

### 12. Coverage

Present a **coverage** summary (if configured). Ask:

> "Want to increase coverage in any specific area (utils, hooks, critical pages)?"

**Wait for the user's input.**

---

### 13. Hand off

Tell the user:

> "Testing is complete. Before documenting, run a QA verification to confirm all acceptance criteria are covered:
>
> **QA agent:** `Follow .workflow/agents/qa-prompt.md`
>
> The QA agent will produce a test matrix showing pass/fail/untested for every acceptance criterion and suggest any missing automated tests.
>
> After that, finish with documentation: `Follow .workflow/shared/07-document.md`."

---

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from .workflow/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
