# 02 — Frontend Rules

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Opus 4.6** — track rules require reasoning about project-wide consistency. Before starting, tell the user: "Before we begin, switch to **Opus 4.6** in your AI tool's model selector. Setting rules needs careful reasoning. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

**Context:** You are setting up or confirming frontend coding standards for **this specific project** so future work stays consistent.

---

## Steps

### 1. Project structure

Present a **recommended folder layout**, for example:

- `src/pages` — route-level views
- `src/components` — reusable UI
- `src/hooks` — custom hooks (or equivalent for your framework)
- `src/services` — API and external integrations
- `src/utils` — pure helpers
- `src/types` — shared TypeScript types (if using TS)
- `src/styles` — global styles / tokens if needed
- `src/assets` — static assets
- `src/config` — env-driven config
- `src/mocks` — mock data and handlers

Adjust folder names and nesting to match the user's framework conventions (e.g. `app/` for Next.js/Nuxt, `src/` for Vite/CRA, `lib/` for SvelteKit).

> "Here's the structure I recommend for this project. Do you want to adjust any folders or add something project-specific (e.g. `features/`)?"

**Wait for the user's input.**

---

### 2. Component rules

Present rules such as: **functional components only** (or equivalent for the framework), **destructured props**, **business logic in custom hooks/composables** (not bloated components), colocation where it helps.

> "I suggest we standardize on: [summarize rules]. Does that match how your team works, or should we tweak anything?"

**Wait for the user's input.**

---

### 3. State management

Ask how **complex** they expect client state to be (few forms vs. lots of shared server/UI state).

> "How complex do you expect global/client state to be for this app? Based on that, I'd recommend [state your recommendation -- e.g. local state + framework context, Zustand, Pinia, Redux, Signals, Svelte stores -- and why]. Does that sound right?"

**Wait for the user's input.**

---

### 4. API integration pattern

Present: **service layer** (one place per domain), **typed responses**, **central HTTP client** with auth/interceptors, error normalization.

> "I'd use a small API client plus typed service functions. Any constraints (e.g. existing client, OpenAPI codegen)?"

**Wait for the user's input.**

---

### 5. Styling approach

Ask which stack they prefer: **Tailwind**, **CSS Modules**, **styled-components**, or a mix.

> "For styling, do you want Tailwind, CSS Modules, styled-components, or something else? I'll lock the rules to your choice."

**Wait for the user's input.**

---

### 6. Simulation / mock data

Explain the mock-data toggle pattern (e.g. `VITE_USE_MOCK_DATA`, `NEXT_PUBLIC_USE_MOCKS`, or equivalent): develop UI without the backend, deterministic demos, faster tests.

> "I recommend an env toggle that swaps real services for mocks. Are you happy with that pattern and naming?"

**Wait for the user's input.**

---

### 7. Performance guidelines

Present concise guidelines: framework-appropriate memoization (e.g. `React.memo`/`useMemo`/`useCallback`, Vue `computed`, Svelte reactive declarations) where profiling shows benefit, **route-level lazy loading**, and avoiding premature optimization.

> "Here's how I'd keep performance sane without over-engineering. Anything you want stricter or looser?"

**Wait for the user's input.**

---

### 8. Error, loading, and empty states

State the requirement: **every page that fetches data** must define loading, error, and empty states (aligned with `docs/06-page-specs.md` when it exists).

> "We should require loading/error/empty on every data-driven page. Any global patterns (skeleton library, toast errors) you want mandated?"

**Wait for the user's input.**

---

### 9. Testing conventions

Present rules for frontend testing: **unit tests** for utility functions and hooks (Vitest, Jest, or equivalent), **component tests** for critical UI (Testing Library, Vue Test Utils, etc.), **E2E tests** for key user flows (Playwright, Cypress), **test file naming** (`.test.ts` or `.spec.ts`), colocation vs `__tests__/` directory, and **coverage targets**.

Ask:

> "What testing framework does your project already use, or should we pick one? What coverage target feels right -- 70%? 80%? Should test files live next to source files or in a separate directory?"

**Wait for the user's input.**

---

### 10. Internationalization (i18n)

Ask whether multi-language support is needed now or in the foreseeable future.

If yes: recommend a library appropriate to their framework (e.g. react-i18next, vue-i18n, svelte-i18n), define key naming conventions, translation file structure, and fallback language strategy.

If no: note that strings should still avoid hardcoding where feasible so i18n can be added later without a rewrite.

> "Does this app need multi-language support now or in the near future? If so, which languages, and should we set up i18n infrastructure now?"

**Wait for the user's input.**

---

### 11. Analytics and tracking

Ask whether analytics are needed.

If yes: define event naming conventions (e.g. `snake_case`, `page_view`, `button_click`), provider (Google Analytics, Mixpanel, PostHog, Plausible, etc.), privacy considerations (cookie consent, GDPR), and where tracking calls live in the code (dedicated analytics service, not scattered in components).

> "Do you need analytics or user tracking? If so, which provider, and are there privacy/consent requirements we should encode in the rules?"

**Wait for the user's input.**

---

### 12. Feature flags

Ask whether feature flags are needed (for gradual rollouts, A/B testing, or hiding unfinished work).

If yes: define provider (LaunchDarkly, Flagsmith, PostHog, Unleash, or a simple local config), flag naming conventions, and how flags are consumed in components.

> "Do you want feature flag support for gradual rollouts or hiding unfinished features? If so, which provider or approach?"

**Wait for the user's input.**

---

### 13. Accessibility standards

Present the baseline requirement: target **WCAG 2.1 AA** compliance (or the user's chosen level). Define rules for semantic HTML, keyboard navigation, focus management, ARIA attributes, color contrast, and automated a11y testing (axe-core, eslint-plugin-jsx-a11y, or equivalent).

> "I'd target WCAG 2.1 AA as the baseline. Should we go stricter (AAA) or is AA sufficient? Any specific accessibility requirements (screen reader support, reduced motion, high contrast)?"

**Wait for the user's input.**

---

### 14. CI/CD integration

Define what must pass before code can be merged: **lint** (ESLint, Biome, or equivalent), **type-check** (if using TypeScript), **tests** (unit + component), **build** (must succeed without warnings). Optionally: bundle size checks, a11y audits, visual regression tests.

> "What CI/CD system do you use (GitHub Actions, GitLab CI, etc.)? Should we define the pipeline checks now, or just the rules for what must pass?"

**Wait for the user's input.**

---

### 15. Generate the rules document

Draft a **single project-specific** frontend rules document that incorporates all agreed decisions from steps 1-14 (structure, components, state, API, styling, mocks, performance, states, testing, i18n, analytics, feature flags, accessibility, CI/CD).

> "I've drafted `docs/07-frontend-coding-rules.md` content below. Read it and tell me if anything should change before I finalize."

**Wait for the user's input.**

---

### 16. Save and optional Cursor rules

**Save** the finalized document as:

`docs/07-frontend-coding-rules.md`

If the user wants their AI tool to follow these rules automatically, **optionally** add or update the tool's rules config to mirror the most important constraints (keep them short and actionable). Use whatever location fits the user's tool — `.cursor/rules/*.mdc` for Cursor, `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex/others.

> "Should I also add a short rules file for your AI tool (e.g. `.cursor/rules/` for Cursor, `CLAUDE.md` for Claude) that points at these conventions?"

**Wait for the user's input.**

---

### 17. Hand off

Tell the user:

> "Frontend rules are saved. Next, create issues before building -- follow **`.workflow/shared/06-issues.md`**."

---

### Update workflow state

If `.workflow-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `.workflow/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> "Before we move on, I can capture what we did in this phase as a journal entry -- decisions, trade-offs, and lessons learned. Want me to draft one?"

**Wait for the user's input.** If yes, draft using the phase summary template from .workflow/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
