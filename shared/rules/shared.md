---
description: Shared coding standards applied to all projects
globs: **/*
alwaysApply: true
---

# Shared Standards

You are working on this project. Follow these standards in every interaction.

## Session context (CONTEXT.md + state file)

If `.peer-ai-state.json` and `CONTEXT.md` exist at the app root, the workflow driver is active. At session start, read **both** files before doing anything else. Narrative context (decisions, emails, daily log) belongs in `CONTEXT.md`; the `notes` field in `.peer-ai-state.json` is a one-liner pointer only — see `peer-ai/shared/workflow-state.md`.

When design mockups and API contracts disagree, follow `peer-ai/shared/design-data-contract.md`: contract wins on data shape and field names; design wins on layout and visual hierarchy.

## Git and PR conventions
- Branch names: `feature/<ticket-id>-<short-description>` (e.g., `feature/PROJ-12-auth-login-screen`)
- Commit messages: `PROJ-XX: <short description>` — reference the ticket ID in every commit
- PR title: `[PROJ-XX] Short description of what this does`
- PR checks before review: lint, type check, build must all pass
- One peer review required before merge; squash and merge preferred
- Delete feature branches after merging
- **How a branch reaches the milestone branch is the `Merge policy` setting** in the workflow driver's
  §0 Project settings — `PR only` (the default) or `local merge`. The peer review above happens **on the
  pull request**, so under `local merge` it has nowhere to happen; choose that only for a solo project
  with no protection. Once `09-pr-automation.md` turns branch protection on, `PR only` is the only
  workable value, and a local merge is refused rather than reviewed
- Issue tracker auto-sync (if integrated with GitHub): branch creation → ticket In Progress; PR merged → ticket Done

## Type safety
- Use the project's type system strictly (TypeScript `strict: true`, Python type hints, Go's static types, etc.)
- No untyped escape hatches (e.g. `any` in TypeScript, `# type: ignore` in Python) without explicit justification
- Explicit types for function signatures and API responses
- Use type inference for obvious cases

## Naming
- Components: PascalCase files (`CustomerList.tsx`, `CustomerList.vue`)
- Utilities: camelCase files (`formatDate.ts`) or snake_case for Python/Go projects
- Variables: camelCase (JS/TS), snake_case (Python/Go/Ruby)
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase
- API endpoints: kebab-case (`/task-comments`)
- Database tables: snake_case (`task_comments`)

## Security
- Never hardcode secrets, API keys, or credentials
- Always use environment variables for configuration
- Never commit `.env` files
- Maintain `.env.example` with all required variables (values blanked)
- Disable source maps in production builds

## Code comments
- Never comment what the code does -- the code shows that
- Comment WHY when the reason isn't obvious
- Comment trade-offs and constraints

## Dependencies
- Pin exact versions where the ecosystem supports it (no ^ or ~ in Node; pinned in requirements.txt, go.mod, Cargo.toml, etc.)
- Run dependency audits regularly and resolve critical/high vulnerabilities

## Error handling
- All async operations must handle errors
- User-facing errors must be safe (no stack traces, no internal details)
- Log full errors server-side for debugging

## Model recommendations

When starting a workflow phase, remind the user which model to select in their AI tool's model selector for cost efficiency:

| Phase | Recommended model | Why |
|-------|------------------|-----|
| Understand, Architect, System Spec, API Contract | **Most capable** (e.g. Opus, o3, Claude) | Deep reasoning, architecture, cross-cutting decisions |
| Shared Rules, Page Specs, Endpoint Specs, Track Rules | **Most capable** (e.g. Opus, o3, Claude) | Needs full system context and precise reasoning |
| Issues (06) | **Mid-tier** (e.g. Sonnet, GPT-4o) | Structured extraction from existing specs |
| Build (frontend/backend 03) | **Fast coding model** (e.g. Composer, Codex, GPT-4o) | Best coding benchmark scores, significantly cheaper than most-capable models |
| Review (frontend/backend 04) | **Mid-tier** (e.g. Sonnet, GPT-4o) | Systematic checklist-driven review |
| Test (frontend/backend 05) | **Fast coding or mid-tier** | Test writing is well-scoped implementation work |
| Code Review agent | **Auto / fast** (e.g. Auto, Gemini Flash) | Structured findings report |
| Contract Check agent | **Auto / fast** (e.g. Auto, Gemini Flash) | Comparison table output |
| QA agent | **Auto / fast** (e.g. Auto, Gemini Flash) | Test matrix generation |
| Security Audit agent | **Mid-tier** (e.g. Sonnet, GPT-4o) | Needs deeper reasoning for security edge cases |
| Document (07) | **Auto / fast** (e.g. Auto, Gemini Flash) | Templated documentation updates |
| PDF-ready HTML export | **Auto / fast** | Pure templating — convert markdown to styled HTML |
| UI mockups, dashboard visuals | **Best multimodal** (e.g. Gemini Pro, GPT-4o) | Multimodal reasoning, best for visual/layout work |

How to apply this depends on the **Model selector** setting in the workflow driver's Project settings, asked once during setup. If the tool has a per-phase model selector, tell the user to switch before you begin and wait for confirmation: "Before we start, switch to **[model]** in your AI tool's model selector. [Brief reason]. Let me know when you've switched and I'll begin." Do NOT proceed until the user confirms. If the model is fixed for the session (Claude Code, Codex, most chat tools), state the recommended tier in one line and continue — never gate on a switch the user cannot make.

## Dev journal

If a `docs/journal-config.json` file exists in the project, journaling is active. Read that file to determine the tool ("notion", "local", "other", or "none").

During any workflow phase, **recognize key decision moments** and offer to journal them. Key moments include:
- Architecture or technology choices (e.g. "chose Fastify over Express")
- Trade-offs made (e.g. "sacrificed real-time for simpler polling")
- Problems resolved (e.g. "auth refresh was failing, fixed by...")
- Spec deviations (e.g. "deviated from spec because of backend constraint")
- Dependency choices (e.g. "chose Zustand over Redux")

When you recognize one, offer briefly:
> "That was a significant decision. Want me to add a journal entry capturing the reasoning?"

**Wait for the user's input.** If yes, draft the entry using the key moment template from `peer-ai/shared/08-dev-journal.md` (Part B) and write it to the configured tool. If no, continue without interruption.

Do NOT over-trigger. One or two mid-phase entries per workflow step is enough. Save the phase summary for the handoff nudge.

## Issue tracker completion

When the AI finishes implementing a ticket (page, endpoint group, feature, or any scoped issue), it must do all three of the following before moving on:

1. **Tick acceptance criteria** — if the ticket description has checkboxes (acceptance criteria), check off every item that was completed. Use your issue tracker's MCP if available; otherwise tell the user which items to tick manually.
2. **Add a completion comment** — post a comment on the issue summarizing what was done, any deviations from the spec, and any follow-up items. Keep it concise (3–5 bullet points). Example format:
   > Completed: [short summary]
   > - Built [component/endpoint] per spec
   > - Connected to [mock/real] data
   > - Responsive/tested on [contexts]
   > - Deviation: [if any, otherwise omit]
   > - Follow-up: [if any, otherwise omit]
3. **Add a project update** — post a project-level update to the issue tracker project noting the progress. One sentence is enough, e.g. "Status page complete — all KPIs, table, and drawer working against mock data."

If the issue tracker MCP is not connected, draft all three (checkbox list, comment, project update) as text and tell the user to paste them into their issue tracker manually.

## PDF-ready doc export

**Offer once per phase**, when that phase's documents are saved — not once per file, and not once per project. A phase produces one to three documents; make one offer covering them. `.peer-ai-state.json` carries `pdfExportOffered`: set it to the phase name when you make the offer, and do not offer again while it still names the current phase. Without that, "once" has no scope and no memory, and an agent either offers a dozen times across a run or drops it silently after the first.

The offer:

> "Want me to generate a PDF-ready HTML version in `docs-pdf/`? You can open it in a browser and print/save as PDF to share with stakeholders."

**Wait for the user's input.** If yes, generate `docs-pdf/<same-name>.html` following the styling rules in `peer-ai/shared/rules/docs-pdf-export.md` and make sure `docs-pdf/` is in `.gitignore` (generated artifacts, not source of truth). If the tool has a per-phase model selector (Project settings in the workflow driver), ask the user to switch to their fastest model (e.g. Auto, Gemini Flash) before generating and to switch back afterwards — HTML export is pure templating; if the model is fixed for the session, just generate. If no, move on.

This applies at every phase that produces a doc, not just the final documentation step. The phase files point here instead of repeating the offer.

## Framework defects (feedback that travels back)

Peer AI is **copied** into this project, not linked to. A fix made here reaches
nobody else; the next project starts from the public repo exactly as it is
today. So a defect noticed and quietly worked around is a defect every future
project inherits.

When the playbook itself is the problem — a step that cannot be followed, two
files that contradict each other, an instruction that assumes something this
project does not have — do three things, in order:

1. **Record it in `docs/peer-ai-feedback.md`** (created at setup from
   `peer-ai/templates/peer-ai-feedback.md`). Give **where**, **what happened**,
   **a suggested fix**, and a severity of **fix** or **polish**.
2. **Say so, out loud, in the session.** Do not silently route around a phase
   file. If you deviate from a step, name the step and say why.
3. **Send it back** — an issue on
   [github.com/AbuMahir980/peer-ai](https://github.com/AbuMahir980/peer-ai/issues/new?template=framework-defect.yml)
   for a single item, or a pull request against `docs/peer-ai-feedback.md` for
   a batch at the end of a phase. Move the item to "Sent upstream" with its
   link so the next session does not file it twice.

**The test for an entry:** *would this bite anyone who cloned Peer AI, on any
project?* If not, it is a note for this repo, not feedback. This project's own
customisations — models, skills, standards wiring — are never sent upstream.

> Most items found so far were invisible to the project that introduced them,
> and surfaced only when a project of a different shape ran the same file: a
> local-first app with no API, a project whose designs already existed, a
> non-web stack. Record the **project shape** with the item; it is usually the
> explanation.

## Workflow reference
This project includes the Peer AI Development Workflow in the `peer-ai/` folder. When asked about process, or when following a workflow step, read the relevant file directly:
- Requirements: `peer-ai/shared/01-understand.md`
- Architecture: `peer-ai/shared/02-architect.md`
- System spec: `peer-ai/shared/03-spec-system.md`
- API contract: `peer-ai/shared/04-spec-api-contract.md` (includes optional OpenAPI spec generation)
- Rules: `peer-ai/shared/05-rules-shared.md`
- Issues: `peer-ai/shared/06-issues.md`
- Documentation: `peer-ai/shared/07-document.md`
- PR automation: `peer-ai/shared/09-pr-automation.md` (GitHub Actions, branch protection, automated review comments)
- Dev journal: `peer-ai/shared/08-dev-journal.md`
- Frontend guides: `peer-ai/frontend/` (page specs with forms/validation, rules with testing/i18n/a11y/analytics/feature-flags/CI, build, review covering forms/i18n/analytics/flags, test covering forms/a11y/i18n)
- Backend guides: `peer-ai/backend/` (endpoint specs with jobs/cron/webhooks/files/email/caching/real-time, rules with jobs/caching/files/versioning/testing/deployment/observability, build, review covering all concerns, test covering all concerns)
- Agent prompts: `peer-ai/agents/`
- Templates: `peer-ai/shared/templates/`, `peer-ai/frontend/templates/`, `peer-ai/backend/templates/`
- Contributing guide: `peer-ai/CONTRIBUTING.md` (how to safely edit workflow files)
- Workflow state guide: `peer-ai/shared/workflow-state.md` (state file + `notes` field rules)
- Design vs contract: `peer-ai/shared/design-data-contract.md`
- Workflow driver: `peer-ai/shared/rules/workflow-driver.md` (ambient driver — copy to your tool's rules config during setup)

When a user says "follow peer-ai/...", READ that file and follow its instructions step by step.

## Monorepo structure (if applicable)
If the project uses a monorepo with `apps/` and `packages/`:
- Each app deploys independently
- npm workspaces at the root links apps together
- Shared code lives in `packages/` (shared types, UI components, config)
- All apps share the same rules config (`.cursor/rules/` for Cursor, `CLAUDE.md` for Claude Code, `AGENTS.md` for others) and `peer-ai/` at the root
- CI runs lint + type check + build on PRs via GitHub Actions
