# 09 — PR Automation & GitHub Actions

> **You are an AI assistant.** When a user tells you to follow this file, execute the process below. Do NOT dump all sections at once. Work through each step conversationally — ask the user questions, wait for their answers, then move to the next step.

> **Model: Sonnet 4.6** — CI/CD configuration is structured work with clear patterns. Before starting, tell the user: "Before we begin, switch to **Sonnet 4.6** in the model picker (bottom-left of the chat panel). CI setup is structured work — Sonnet handles it efficiently. Let me know when you've switched and I'll start." **Wait for the user to confirm before proceeding.**

Context: your project needs automated checks on pull requests and optionally automated review comments. This workflow sets up GitHub Actions and configures PR automation.

---

## Process

### 1. Assess current CI state

Read the project's `.github/workflows/` directory (if it exists) and `package.json` scripts.

**Produce:** Summary of what CI already exists (if anything) and what's missing.

**Ask:**

> "Here's what I found for CI/CD. Do you already have GitHub Actions set up, or are we starting from scratch?"

**Wait for the user's input.**

---

### 2. Set up basic PR checks

**Produce:** A GitHub Actions workflow file (`.github/workflows/pr-checks.yml`) that runs on every pull request:

```yaml
name: PR Checks
on:
  pull_request:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
```

Adapt based on:
- The project's package manager (npm, pnpm, yarn)
- The project's scripts in `package.json`
- Monorepo structure (if using workspaces, run checks per workspace or use Turborepo)

**Ask:**

> "Here's the basic PR checks workflow. Should I adjust anything — different Node version, additional steps (e.g. tests), or monorepo-specific configuration?"

**Wait for the user's input.**

---

### 3. Branch protection rules

**Produce:** Instructions for setting up branch protection on `main`:

1. Go to repository Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - Require a pull request before merging
   - Require at least 1 approval
   - Require status checks to pass (select the PR Checks workflow)
   - Require branches to be up to date before merging
4. Merge strategy: squash and merge preferred

**Ask:**

> "Do you have admin access to set up branch protection, or should I note this as a task for someone with admin access (e.g. a repo admin)?"

**Wait for the user's input.**

---

### 4. Automated PR review comments (optional)

**Produce:** Explain the concept: when a PR is opened, a GitHub Action runs the code review agent prompt against the PR diff and posts findings as a review comment. The comment appears under the maintainer's name (whoever owns the GitHub token).

Two approaches:

**A. AI API approach (recommended for teams with API access):**
- GitHub Action triggers on `pull_request` event
- Reads the PR diff via GitHub API
- Sends diff + review prompt to an AI API (Claude, GPT, etc.)
- Posts the response as a PR review comment via GitHub API
- Requires: AI API key stored as a GitHub Actions secret

**B. Cursor Automations approach (if using Cursor Enterprise):**
- Cursor Automations runs security and code review agents on every PR
- No custom GitHub Action needed — Cursor handles it
- Findings posted as PR comments automatically

**Ask:**

> "Do you want automated PR review comments? If yes, which approach:
> A. Custom GitHub Action calling an AI API (you'll need an API key)
> B. Cursor Automations (requires Cursor Enterprise)
> C. Skip for now — manual reviews only"

**Wait for the user's input.**

If A: Generate a `.github/workflows/ai-review.yml` workflow that:
1. Triggers on `pull_request` (opened, synchronize)
2. Fetches the PR diff
3. Reads `.workflow/agents/review-prompt.md` for the review checklist
4. Calls the AI API with the diff + prompt
5. Posts findings as a PR review comment
6. Uses repository secrets for the API key

If B: Provide setup instructions for Cursor Automations.
If C: Move to next step.

---

### 5. Commit message validation (optional)

**Produce:** A simple check that commit messages reference a Linear ticket ID.

Option A: GitHub Action that checks PR title matches `[PROJ-XX]` format.
Option B: A commit-msg git hook (using Husky) that validates `PROJ-XX:` prefix locally.

**Ask:**

> "Do you want automated commit message validation? Options:
> A. GitHub Action checks PR title format
> B. Local git hook (Husky) validates commit messages
> C. Both
> D. Skip — rely on team discipline"

**Wait for the user's input.**

**Produce:** Generate the chosen configuration.

---

### 6. Save and confirm

**Produce:** Summary of all files created/modified:
- `.github/workflows/pr-checks.yml` — basic CI
- `.github/workflows/ai-review.yml` — automated review (if chosen)
- Any Husky/hook configuration (if chosen)

**Ask:**

> "Here's everything we set up. Review the workflow files — anything to adjust before we commit?"

**Wait for the user's input.**

---

### 7. Next steps

Tell the user:

> "PR automation is configured. Your CI will now:
> - [List what was set up]
>
> If you haven't set up your dev journal yet, follow **`.workflow/shared/08-dev-journal.md`** to configure it (Notion, local markdown, or skip). If it's already set up, you can run a retrospective from that same file at the end of a cycle.
>
> To start building (or continue building), follow **`.workflow/frontend/03-build.md`** (frontend) or **`.workflow/backend/03-build.md`** (backend)."

---

### Journal entry

If journaling is active (check docs/journal-config.json), offer a phase summary entry before handing off:

> "Before we move on, I can capture what we did in this phase as a journal entry — decisions, trade-offs, and lessons learned. Want me to draft one?"

**Wait for the user's input.** If yes, draft using the phase summary template from .workflow/shared/08-dev-journal.md (Part B) and write to the configured tool. If no, proceed to the next step.

## Tone

Be collaborative, not robotic. You're a senior colleague.
