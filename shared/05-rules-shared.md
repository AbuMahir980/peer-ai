# 05 — Shared Rules & Standards

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Opus 4.6** — project-wide coding standards require careful trade-off reasoning. Before starting, tell the user: "Before we begin, switch to **Opus 4.6** in your AI tool's model selector. Standards need precise reasoning. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

Cross-cutting coding standards and conventions for the project. This workflow is **not** a brainstorming session: you are helping the user lock in defaults or customize them, then producing a single project-specific standards document.

---

## Process

### 1. Open the session

Explain briefly that you will walk through shared coding standards — Git, env files, TypeScript, naming, quality tooling, documentation, security, and dependencies — and that at the end you will generate `docs/05-coding-standards.md` tailored to their choices.

> Example: "I'll go category by category: I'll show our default for each area, you tell me if you want to keep it or change it. When we're done, I'll write everything into `docs/05-coding-standards.md`."

**Wait for the user's input** (e.g. acknowledgment to begin).

---

### 2. Git conventions

**Produce:** Present these defaults clearly (branch naming, commits, PR expectations).

**Default — branch naming:**

```
feature/PROJ-12-customer-search
fix/PROJ-34-login-redirect
chore/PROJ-56-update-dependencies
```

Format: `<type>/<linear-ticket-id>-<short-description>` — the Linear ticket ID at the start creates an automatic link between code and task.

**Default — commit messages:**

```
PROJ-12: add customer search by name and phone

Implements the customer search bar with debounced input.
Search works across name, email, and phone fields.
```

Format: `PROJ-XX: <short description>`. Reference the Linear ticket ID in every commit. This enables automatic GitHub-Linear status updates.

**Default — pull requests:**

| Rule | Detail |
|------|--------|
| Title format | `[PROJ-XX] Short description of what this does` |
| Description | Brief explanation of what changed and why |
| Checks before review | Lint, type check, build must all pass |
| Review requirement | One peer review required before merge |
| Merge strategy | Squash and merge preferred |
| After merge | Delete the feature branch |

**Ask:**

> "Do you want to keep this Git setup (branches, commits, PRs) as-is, or change anything — for example issue ID prefix, branch types, or commit format?"

**Wait for the user's input.**

---

### 3. Environment management

**Produce:** Summarize the approach: never commit `.env`; maintain `.env.example` with required keys and blank values; prefix client-exposed vars (`VITE_`, `NEXT_PUBLIC_`, etc.); document every variable in the README; secrets only via env/secret stores, not code; rotate if leaked.

**Ask:**

> "Does this match how you want to handle env files and secrets, or should we adjust (e.g. different client prefix, extra tooling like Doppler/Vault)?"

**Wait for the user's input.**

---

### 4. TypeScript strictness

**Produce:** Defaults: `strict: true`; avoid `any` unless narrowly justified with an eslint disable and comment; infer where obvious; explicit types for public APIs and external data; shared types for API contracts where applicable.

**Ask:**

> "Keep these TypeScript rules, or tighten/relax anything (e.g. `noUncheckedIndexedAccess`, stricter eslint rules)?"

**Wait for the user's input.**

---

### 5. Naming conventions

**Produce:** Present this table as the default.

| Item | Convention | Example |
|------|------------|---------|
| Files (components) | PascalCase | `CustomerList.tsx` |
| Files (utilities) | camelCase | `formatDate.ts` |
| Files (constants) | camelCase | `apiEndpoints.ts` |
| Variables | camelCase | `customerName` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase | `Customer`, `ApiResponse` |
| Enums | PascalCase members | `UserRole.Admin` |
| CSS classes | kebab-case or BEM | `customer-card`, `customer-card__header` |
| API endpoints | kebab-case | `/api/v1/customer-units` |
| Database tables | snake_case | `customer_units` |

**Ask:**

> "Any rows you want to change for this repo (framework-specific file naming, API style, DB naming)?"

**Wait for the user's input.**

---

### 6. Code quality (linting and formatting)

**Produce:** Defaults: ESLint + Prettier; run via pre-commit (e.g. Husky + lint-staged); CI fails on lint errors.

**Ask:**

> "Do you already have ESLint/Prettier configs we should reference, or should we adopt these defaults and list the exact config files to add in the standards doc?"

**Wait for the user's input.**

---

### 7. Documentation requirements

**Produce:** List what every repo should maintain:

- `README.md` — setup, architecture overview, scripts
- `.env.example` — all variables with descriptions
- `DECISIONS.md` or `docs/adr/` — decision log
- `CHANGELOG.md` — release history (Keep a Changelog style when documenting releases)

**Also note:** comment **why** / trade-offs / constraints, not what the code obviously does.

**Ask:**

> "Any additions or removals — e.g. CONTRIBUTING.md, SECURITY.md, or a different ADR location?"

**Wait for the user's input.**

---

### 8. Security baseline

**Produce:** Present this table.

| Concern | Frontend | Backend |
|---------|----------|---------|
| Auth tokens | Store in memory, not localStorage | Validate on every request |
| Input validation | Sanitize before display | Validate before processing |
| HTTPS | Enforce via CSP headers | Enforce via redirect |
| CORS | N/A | Whitelist specific origins |
| Rate limiting | N/A | Apply to public endpoints |
| Error exposure | No stack traces to users | Log full errors; safe client messages |
| Source maps | Disable in production | N/A |
| Dependencies | `npm audit` clean | `npm audit` clean |

**Ask:**

> "Any security rules you want to override or extend for this stack (e.g. cookie-based auth, different token storage)?"

**Wait for the user's input.**

---

### 9. Dependency management

**Produce:** Defaults: pin exact versions in `package.json` (no `^` / `~`) unless user chose otherwise; run `npm audit` regularly; planned update cadence; document unusual or critical deps in README.

**Ask:**

> "Keep pinned versions and this cadence, or prefer semver ranges / a different tool (pnpm, Renovate)?"

**Wait for the user's input.**

---

### 10. Cursor / AI rules (optional)

**Produce:** The workflow ships shared rules in `.workflow/shared/rules/`. Mention that the project can load them into whatever rules config its AI tool uses so assistants follow the same standards — `.cursor/rules/*.mdc` for Cursor, `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex/others. (The source files are plain `.md` in `shared/rules/` — no tool-specific extension.)

**Ask:**

> "Should `docs/05-coding-standards.md` include a short section on syncing your AI tool's rules (e.g. `.cursor/rules/`, `CLAUDE.md`, or `AGENTS.md`) from the workflow template, or skip that for this project?"

**Wait for the user's input.**

---

### 11. Generate and save the standards document

**Produce:** A single markdown file that:

- Reflects every choice the user confirmed or changed
- Is structured for day-to-day reference (clear headings, tables intact)
- Does not contradict earlier steps

**Save:** Write the file to **`docs/05-coding-standards.md`** in the user's project (create `docs/` if needed).

**Ask:** Nothing further unless the user wants edits.

---

### 12. Point to the next workflow

Tell the user:

> "Shared standards are captured in `docs/05-coding-standards.md`. Next, split by track: follow **`.workflow/frontend/01-spec-pages.md`** (frontend) or **`.workflow/backend/01-spec-endpoints.md`** (backend)."

---

### Update workflow state

If `.workflow-state.json` exists at the app root, update it before handing off: set `currentPhase`/`currentStep` (or advance to the next phase), stamp `lastUpdated`, and write a one-line `notes` pointer. If `CONTEXT.md` exists, add what changed this phase under "What Was Done — By Day" and refresh "What's Next" and "Open Questions". Keep narrative in `CONTEXT.md`; keep `notes` a one-liner. See `.workflow/shared/workflow-state.md`.

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> “Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?”

**Wait for the user’s input.** If yes, draft using the phase summary template from .workflow/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the handoff below.

## Tone

Be collaborative, not robotic. You're a senior colleague.
