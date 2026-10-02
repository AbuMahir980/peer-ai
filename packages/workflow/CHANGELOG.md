# peer-ai-workflow

## 1.0.0-next.6

No changes in this release.

## 1.0.0-next.5

### Minor Changes

- e9ce810: `init` and `migrate` take up the stack profiles and traits `assess` suggests (RFC 0011). They show each one with why it was suggested, all ticked, and ask why about any you untick; `--yes` takes them all. A new top-level `declined` records a suggestion the project decided against, with why, so it isn't suggested again.
  
  `peer-ai doctor` now warns about a suggestion the config has neither taken up nor declined. On a project set up before this release, run `npx peer-ai doctor` after updating: for each one, add it to `standards.profiles` or `project.traits`, or list it in `declined` with the reason. If the project's enforcement isn't staged yet, set `standards.enforcement` to `report` first, so a new profile reports before it blocks.

## 1.0.0-next.4

### Minor Changes

- f04434c: An existing codebase can adopt Peer AI's enforcement in stages (RFC 0011):
  
  - **`standards.enforcement: "report"`** has the tools run and report without failing a build: the security workflow's jobs run with `continue-on-error`, ESLint runs Peer AI's rules as warnings, and Ruff's settings leave them out until they enforce. `init` and `migrate` write `report` for an existing codebase and `enforce` for a new one. A config without the setting keeps enforcing, so nothing changes until you choose; `doctor` suggests `report` to an existing codebase.
  - **`standards.deferred`** holds back one rule's enforcement until a date or a work item is done, with why and who decided. Reviews still apply it.
  - **A check your own workflows already run isn't added twice.** At your next `render`, a security job whose tool (gitleaks, osv-scanner, zizmor, Semgrep, SSLyze or ZAP) already runs in one of your workflows is left out, and `standards.coveredBy` does the same for a rule you cover with another tool.
  - **`render` says what it wrote:** each job of the security workflow, with its rules, which only report, and what's covered elsewhere. `.peer-ai/enforce/ruff.toml` explains itself in its header. `doctor` lists the stage, each deferral and each check covered elsewhere.

## 1.0.0-next.3

### Minor Changes

- 2462b24: A work item's record now names the commit each verify and review looked at, and moving to ship needs them on the branch's latest commit, or on one with no change since outside `.peer-ai/` (RFC 0010). At the MVP stage, a missing required review now fails for the item being worked on, where it only warned before; items finished before keep the old rule. `record_review` takes reports only from `.peer-ai/reports/`, and recording the same skill again replaces the earlier review instead of adding one. Records made before this change count until the item next moves to ship.

### Patch Changes

- 546ee9b: Each package now ships its changelog, and every release has notes on GitHub that gather what changed across all five packages, with how to update. When `render` moves a project to a new version, it says which version it moves from and links to what changed.

## 1.0.0-next.2

### Minor Changes

- f6f543e: `render` sets up the CI gate, `peer-ai check`, so no one has to remember to (RFC 0009). On GitHub Actions it writes `.github/workflows/peer-ai.yml`, which installs Node 24 and runs the exact version of Peer AI, so it works with or without a `package.json`; for any other CI it prints the step to add. `peer-ai doctor` warns when no CI runs the gate, and `migrate` notes that the check should be made required. `delivery.gate: false` turns it off.

## 1.0.0-next.1

### Minor Changes

- c8b7aa9: `peer-ai migrate` moves a project from its copy of v0 onto the package (RFC 0008). It converts v0's project settings, `phase-config.json`, the project's standards documents and the work in progress, takes v0's text out of the instruction files, and copies everything that needs a decision into `docs/peer-ai-migration.md`, with a work item that brings it up in the next session. It never commits. `peer-ai doctor` now suggests it for a leftover v0 folder.

## 1.0.0-next.0

### Major Changes

- a9510fd: The first release of Peer AI 1.0: one package that keeps AI coding tools to a senior team's standard, from the first brief to production.
  
  - **peer-ai:** the `peer-ai` command (`init`, `assess`, `render`, `doctor`, `check`, `check-report`, `check-document`) and the MCP server AI tools connect to (`mcp`), for Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI and any tool that reads `AGENTS.md`.
  - **peer-ai-skills:** 29 skills in the Agent Skills format: 15 reviews, 10 documents and 4 work skills, each proving what it checked.
  - **peer-ai-standards:** 197 rules in 18 domains, plus rules for products that handle money or safety-critical data, and 11 stack profiles with the tools that enforce them.
  - **peer-ai-workflow:** the config, project map, work item and review report formats, with their JSON schemas.
  - **peer-ai-eslint-config:** ESLint settings that enforce a project's stack profiles.

### Minor Changes

- 68ca210: Setup checks and feedback that run themselves (RFC 0007). `peer-ai check` fails on anything `peer-ai doctor` fails on, and `next_work` gives the AI tool every setup problem with its fix at the start of each session. When Peer AI gets something wrong, the AI tool drafts a report with the new `draft_feedback` tool, which refuses code, keys and email addresses; the new `peer-ai feedback` command lists, sends or drops the drafts, and sends one only after a person approves. `render` keeps `.peer-ai/feedback/` out of git.
