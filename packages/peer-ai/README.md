# peer-ai

**Keeps AI coding tools to a senior team's standard: planning, testing, security and compliance, with proof of every check.**

This package is Peer AI's command-line tool and its MCP server, the connection AI tools use to follow Peer AI's way of working. It works with Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI and any tool that reads `AGENTS.md`. To learn what Peer AI does for a project, read the [project's README](https://github.com/AbuMahir980/peer-ai#readme).

> **Pre-release.** Needs Node.js 24 or newer, on macOS, Linux or Windows.

## Start

In your project's folder:

```bash
npx peer-ai init
npx peer-ai assess
npx peer-ai render
```

Then open the project in your AI tool and ask for work in plain words. In a Node project, you can pin the version instead, and your AI tools then start that copy:

```bash
npm install --save-dev peer-ai
```

## Commands

| Command | What it does |
|---------|--------------|
| [`peer-ai init`](#peer-ai-init) | Sets up Peer AI in a repository: one config file, from what it detects |
| [`peer-ai assess`](#peer-ai-assess) | Maps what the project has and what its stage still needs |
| [`peer-ai render`](#peer-ai-render) | Connects each AI tool: instructions, the MCP server and the skills |
| [`peer-ai doctor`](#peer-ai-doctor) | Checks the setup and says how to fix what isn't right |
| [`peer-ai check`](#peer-ai-check) | The CI gate: fails when work claims more than its record shows |
| [`peer-ai check-report`](#peer-ai-check-report) | Checks a review's report, as the `record_review` tool does |
| [`peer-ai check-document`](#peer-ai-check-document) | Checks a document against its skill's template |
| [`peer-ai feedback`](#peer-ai-feedback) | Lists, sends or drops the feedback drafts your AI tool wrote about Peer AI |
| [`peer-ai mcp`](#peer-ai-mcp) | Starts the MCP server that AI tools connect to |

## `peer-ai init`

Sets up Peer AI in a repository by writing `peer-ai.config.json`.

```bash
npx peer-ai init
```

It reads the repository first and works out what it can:

| It finds | From |
|----------|------|
| The project's name and description | The project's own file, such as `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `composer.json`, `pubspec.yaml` or `settings.gradle`, else the folder name |
| Whether the project is new or existing | Code and project files at the root |
| Each part and its stack | The repository root and every folder under `apps/`, `packages/`, `services/` and `libs/`. It recognises JavaScript and TypeScript frameworks (including Express, NestJS and Fastify backends), Python, Flutter, Android, the JVM, .NET, Swift, Go, Rust, Ruby, PHP and Elixir, and names the backend framework where there is one. |
| Infrastructure as code | Its files, wherever they are: Terraform or OpenTofu, Pulumi, AWS CDK, Helm, Kustomize, Serverless, AWS SAM, CloudFormation, Bicep and Ansible. Folders such as `infra/`, `deploy/`, `k8s/` and `helm/` are searched up to five levels deep, and there Docker and Kubernetes files count too. A `docker-compose.yml` at the root is local development, not infrastructure. |
| Where each part deploys | A platform's config file in that part's folder: Vercel, Netlify, Fly, Render, Railway, Cloudflare Workers, Firebase, AWS Amplify, Expo EAS, Serverless, Heroku, Google App Engine, fastlane, or a Dockerfile for a container |
| Existing CI | GitHub Actions, GitLab CI, Jenkins, Bitbucket Pipelines, Azure Pipelines, CircleCI, Buildkite, Drone, Travis, Cloud Build, Codemagic and Bitrise. Peer AI then extends that pipeline and never adds a second one. |
| The AI tools already set up | `CLAUDE.md`, `.cursor/`, `.codex/`, `.github/copilot-instructions.md`, `GEMINI.md` |
| The git host | The `origin` remote |

Then it asks four things: what you're building, whether the parts it found are right (or what kind of thing it is, if it found none), whether it's just you or a team, and what stage the project is at. It asks which AI tools you use only if it found none.

It never overwrites an existing `peer-ai.config.json`, and it never assumes anything it didn't find. A project with nothing to detect gets a part of kind `other` until you decide. A project with no infrastructure or CI yet simply has none in its config; `peer-ai assess` records those as gaps to fill when the project's stage calls for them.

### Options

| Option | What it does |
|--------|--------------|
| `-y`, `--yes` | Accept what it detects instead of asking. Needed when there is no terminal, for example when an AI agent runs it. |
| `--dry-run` | Print the config instead of writing it |
| `--name <name>` | The project's name |
| `--stage <stage>` | `prototype`, `mvp` or `production` |
| `--team <team>` | `solo` or `team` |
| `--tool <tool>` | An AI tool you use; repeat it for several |

### Exit codes

`0` success, `1` refused (a config already exists) or cancelled, `2` a usage error.

## `peer-ai assess`

Maps what a project already has, and what its stage still needs. Run it on any project, at any point: a brief with no code, a prototype, or a product in production with no documents at all.

```bash
npx peer-ai assess
```

For each item on the project map it records one of four statuses, with the files that prove it:

| Status | Meaning |
|--------|---------|
| ✓ present | Found, with the evidence listed |
| ◐ partial | Some of it is there, for example tests in two of three parts, or linting with no written standard |
| ✗ missing | Not found |
| – not applicable | This project can't have it, for example a design for a project with no user interface |

The items are the requirements, architecture, threat model, specs, API contract, data model, data inventory, DPIA, design, standards, CI, environments, tests, load testing, infrastructure, observability, SLOs, runbooks and docs.

Documents are a by-product, never an entry fee. When there is no architecture document, `assess` works the architecture out from the code and marks it **inferred**, for you to confirm. The same goes for anything it judged not applicable.

Then it ranks the gaps by the project's stage (the `stage` in `peer-ai.config.json`, or `mvp` when there is no config):

- **prototype**: nothing is required.
- **mvp**: requirements, API contract, CI, tests, threat model, data inventory and docs.
- **production**: all of those, plus the architecture, specs, data model, DPIA, design, standards, environments, infrastructure, observability, SLOs, runbooks and load testing.

It also reports what the next stage will need, so nothing arrives as a surprise.

### Compliance signals

`assess` reads the schema and migrations for personal data (emails, phone numbers, dates of birth, addresses, national ID numbers and more) and card-related names, and the dependency manifests for payment providers. It reports them as things to check, not as findings, and suggests the rule packs to consider, such as PCI DSS or the data protection law where you operate.

### Traits to consider

A trait says what the product is or does, and switches on the rules for it (see `peer-ai-standards`). `assess` suggests the traits the code points to, each with what it found, and leaves out any the config already declares. A person decides: add the ones that fit to `project.traits`.

| Trait | Suggested by |
|-------|--------------|
| `money` | A payment provider, or card-related names in the schema |
| `safety-critical` | Names such as `allergens`, `medication` or `dosage` in the schema |
| `several-audiences` | Two or more apps sharing a backend, or names such as `tenant_id` or `organizationId` in the schema |
| `offline` | A service worker, or an offline or on-device database library such as Workbox, Dexie, WatermelonDB or sqflite |
| `real-time` | A live-connection library such as Socket.IO, a WebSocket library, Pusher, Ably or SignalR |
| `uploads` | An upload library such as Multer, `python-multipart`, Uppy or an image picker |
| `ai-features` | An AI model SDK such as OpenAI's, Anthropic's, the Vercel AI SDK, LangChain or Gemini's |

### Stack profiles to consider

A stack profile says how to follow the core rules in one stack, and which tool enforces each automatic rule (RFC 0006). `assess` suggests the most specific profile for each part's stack, such as `react-native` for a part tagged `expo`, which brings React and TypeScript with it. It leaves out profiles the config already lists. Add the ones that fit to `standards.profiles`.

A listed profile applies to every part that names no stack, so `assess` also suggests a `stack` for each track that has none, from what it detects.

### What it reads

The files git tracks, plus new files git doesn't ignore, so `.gitignore` is respected. Outside a git repository it walks the folder and skips dependency and build folders such as `node_modules/`, `.venv/` and `dist/`. A copy of the v0 playbook in `peer-ai/` is left out, and the report says so.

It writes the result to `.peer-ai/map.json`, which agents read to know where the project stands. Commit it.

### Options

| Option | What it does |
|--------|--------------|
| `--target <stage>` | Assess against a stage other than the project's own, for example `--target production` to see what launch needs |
| `--json` | Print the project map as JSON instead of the report |
| `--dry-run` | Print the report without writing `.peer-ai/map.json` |

### Exit codes

`0` success, `2` a usage error or an invalid `peer-ai.config.json`. Gaps are not errors: `assess` maps, and `peer-ai check` is the command that fails a build.

## `peer-ai render`

Sets up each AI tool listed in `tools` in `peer-ai.config.json`, so every tool works the project the same way.

```bash
npx peer-ai render
```

| Tool | Instructions | MCP server registration |
|------|--------------|-------------------------|
| Claude Code | A block in `CLAUDE.md`, unless it imports `AGENTS.md` | `.mcp.json` |
| Codex | A block in `AGENTS.md` | Codex keeps servers in your own config, so render prints the `codex mcp add` command to run once. Codex asks before `run_verify` runs the project's verify command; render prints the setting that allows it without asking, if you choose to. |
| Cursor | `.cursor/rules/peer-ai.mdc`, a rule that always applies | `.cursor/mcp.json` |
| GitHub Copilot | A block in `.github/copilot-instructions.md` | `.vscode/mcp.json` |
| Gemini CLI | A block in `GEMINI.md`, unless it imports `AGENTS.md` | `.gemini/settings.json` |

`AGENTS.md` gets the block whenever a tool other than Claude Code is listed, when it already exists, or when `CLAUDE.md` imports it.

The instructions are short: how to work through the MCP server, the project's parts, its commands, its compliance packs and its own rules, and the project's settings for models, skills and activities when it has any: the models to use, the add-ons, checklists and notes for each skill, and the files to read and notes for each activity. The server serves the detail when it's needed, rather than every rule on every turn.

### Skills

Render writes Peer AI's skills where the listed tools read them, each named `peer-ai-<skill>`, such as `peer-ai-security-review`. The prefix means a Peer AI skill never replaces one of a tool's own, such as Claude Code's `/code-review`.

| Folder | Read by | Written when the config lists |
|--------|---------|-------------------------------|
| `.claude/skills/` | Claude Code, Cursor, GitHub Copilot | Claude Code |
| `.agents/skills/` | Codex, Cursor, GitHub Copilot, Gemini CLI | Codex, Gemini CLI or another tool; or Cursor or Copilot without Claude Code |

- **They stay out of git.** They're rebuilt from the installed version, so a version bump stays a one-line change. Render adds them to `.gitignore` in a marked block.
- **After cloning,** run `peer-ai render` to write them. In a Node project, a `prepare` script can do it on install. `peer-ai doctor` warns when they're missing or out of date.
- **Only its own skills.** Render replaces and removes only folders named `peer-ai-…`. A skill of your own sits beside them untouched.
- **Cloud agents** start from a fresh clone, so render gives each one a setup step that writes the skills before it starts: `peer-ai render --skills --quiet`, which touches nothing committed.

| Tool | The setup step |
|------|----------------|
| Claude Code | A `SessionStart` hook in `.claude/settings.json`. It runs in cloud sessions and routines too, and keeps skills fresh on your machine after an upgrade. |
| Cursor | Added to the `start` command in `.cursor/environment.json` |
| GitHub Copilot | A step in `.github/workflows/copilot-setup-steps.yml`. An existing workflow is left to you, with the step to add. |
| Codex | Codex cloud keeps its setup script in its own settings, so render prints the line to add there |

Each edit keeps everything else in the file, and updates only Peer AI's own command.

- **Committing them instead.** Set `"skills": { "commit": true }` for a tool that can't run a setup step. Render then commits the skills, marks them as generated in `.gitattributes` so pull requests fold them away, and `render --check` checks them too.

What render changes, and what it leaves alone:

- **A block, not the file.** It writes between `<!-- peer-ai:start -->` and `<!-- peer-ai:end -->`, and never touches anything outside them. A file without the block gets it at the end.
- **One server entry, not the config.** It adds or updates the `peer-ai` entry and keeps every other server and setting. It refuses a file it can't read as plain JSON, such as one with comments, and prints the entry to add by hand.
- **The pinned version.** When `package.json` has `peer-ai` in its dependencies, tools start that copy; otherwise they start this exact version with `npx`.
- **Nothing twice.** A second run changes nothing. `peer-ai doctor` warns when these files or the skills no longer match the config.

### Settings for the tools that enforce the stack profiles

- **ESLint** reads Peer AI's settings from the `peer-ai-eslint-config` package, which your `eslint.config.js` spreads in. Render writes nothing for it.
- **Ruff** reads settings from a file, so render writes `.peer-ai/enforce/ruff.toml`, with every Ruff rule of the project's profiles and its values. Your own Ruff settings extend it, such as `extend = ".peer-ai/enforce/ruff.toml"` under `[tool.ruff]` in `pyproject.toml`, directly or through a shared file that extends it. Add rules of your own with `extend-select`: a `select` replaces Peer AI's rules instead of adding to them, and doctor fails it, as it does an `ignore` that drops one of Peer AI's codes. Commit the file, so CI's Ruff uses it; `render --check` fails when it falls behind the config.
- **The TypeScript compiler** reads each part's own `tsconfig.json`, which render never edits.
- **The pipeline's checks,** for a project listing the `github-actions` profile, run from `.github/workflows/peer-ai-security.yml`, which render writes. Each tool is a release checked against its checksum, or an image pinned to its digest:
  - `peer-ai / secrets`: Gitleaks, on a pull request's commits and on the whole history every day. A secret found in old history that's already been replaced goes in `.gitleaksignore`, with why.
  - `peer-ai / dependencies`: OSV-Scanner, on every lockfile and manifest it can read, on every change and every day. It warns when it finds none.
  - `peer-ai / workflows`: zizmor, on the workflows and any actions in the repository.
  - `peer-ai / code`: Semgrep, with its security rules for the common languages pinned to a commit of `semgrep/semgrep-rules`. Those rules are under the Semgrep Rules License, not an open-source licence.
  - `peer-ai / tls`: SSLyze, against Mozilla's intermediate profile, every day, for each environment with a `url`.
  - `peer-ai / running-app`: OWASP ZAP's baseline scan, every day, only in environments marked `"production": false`; one not marked might be production, so it's never scanned. Accept a finding in `.github/zap-rules.tsv`, with the reason. The reports are kept with each run.

  Make the jobs required checks in your branch protection: their names never change. The file's header records a hash of what render wrote: while it matches, render keeps the file up to date; once someone changes it by hand, render leaves it alone, and doctor checks it still has every job.

### Options

| Option | What it does |
|--------|--------------|
| `--check` | Change nothing, and fail when a committed file is out of date. For CI. It leaves the skills out, since CI never has them, unless the project commits them. |
| `--skills` | Write only the skills, touching nothing committed. It's what each tool's setup step runs. |
| `--quiet` | Print nothing unless something fails |

### Exit codes

`0` done or up to date, `1` a file was refused, or is out of date with `--check`, `2` a usage error or no valid `peer-ai.config.json`.

## `peer-ai doctor`

Checks that Peer AI is set up correctly in a repository, and says how to fix what isn't. It only reads; it never changes a file.

You rarely need to run it yourself (RFC 0007): `peer-ai check` fails in CI on anything doctor fails on, and your AI tool hears about every problem it finds through `next_work` at the start of each session.

```bash
npx peer-ai doctor
```

| It checks | A problem looks like |
|-----------|----------------------|
| Node.js | A version older than the one Peer AI needs |
| `peer-ai.config.json` | Missing, or not valid, with each error |
| Tracks | A track whose folder has moved or gone, or a part of the repository no track covers. A track with no `path` is the repository root, so a monorepo needs a track for each part, or one whose folder holds several. A dormant track may not have a folder yet. |
| Files the config names | A contract, design, standards document, data inventory, checklist or input that doesn't exist. URLs, glob patterns and places still to be made, such as `docs.dir`, are left alone. |
| AI tools | A tool set up in the repository, such as a `CLAUDE.md` or `.cursor/`, that the config doesn't list |
| What render writes | Instructions or MCP registrations that no longer match the config, or skills that are missing or out of date |
| CI | A config that says there is no CI when the repository has a pipeline, which would lead Peer AI to add a second one |
| The project map | Missing, not valid, or out of date. It runs a fresh assessment and lists every item whose status has changed since `.peer-ai/map.json` was written. |
| Work items | A file in `.peer-ai/work/` that isn't valid, isn't named after its id, or names a track the config doesn't have |
| Git | A folder that isn't a git repository, or a `.gitignore` that hides Peer AI's files from the team and CI |
| Rules set aside or changed | Every entry in `standards.exceptions` and `standards.overrides` is listed, so nothing is switched off silently. It warns about an exception whose `until` date has passed, a rule id that isn't one of Peer AI's rules, a rule set aside twice, and an override for a rule with no value to change, or of the wrong type. |
| Stack profiles | A listed profile Peer AI has no rules for yet |
| The tools that enforce them | For each part, that the ESLint config nearest it spreads in `peer-ai-eslint-config`, that the Ruff settings nearest it extend `.peer-ai/enforce/ruff.toml`, and that its tsconfig files, including those a solution tsconfig references, set what the compiler rules need; and that the pipeline's workflow is there, as render wrote it, and up to date. A warning, and a failure at production. |
| The v0 playbook | A copy left in `peer-ai/`, with how to remove it |

Every check reports, including the ones it had to skip (for example, the tracks can't be checked without a valid config), so a clean report means everything was looked at.

A failure (✗) means Peer AI can't work as intended until it's fixed. A warning (!) is something to tidy up.

### Options

| Option | What it does |
|--------|--------------|
| `--json` | Print the checks as JSON |

### Exit codes

`0` nothing failed (warnings are allowed), `1` at least one check failed, `2` a usage error.

## `peer-ai check`

The gate CI runs. It fails when the setup is broken, or when a work item claims more than its record shows.

```bash
npx peer-ai check
```

| It fails when | Why |
|---------------|-----|
| The config is missing or not valid | Nothing else can be checked (exit code `2`) |
| A track's folder doesn't exist | The config no longer describes the repository |
| `.peer-ai/map.json` or a work item isn't valid, or a work item names a track the config doesn't have | State that agents read has to be trustworthy |
| A work item at `ship` or `done` has no recorded verify, or its last verify failed | `commands.verify` runs before any work is called done. Without a verify command, only a recorded failure counts. |
| A work item at `ship` or `done` has a review whose latest result failed, or is incomplete | A review that didn't check every rule hasn't passed. A later passing review from the same skill replaces an earlier failure. At the `prototype` stage, an incomplete review is allowed; a failed one never is. |
| A production project's work item at `ship` or `done` has a review with no report | Without a report, the result is only the agent's word. For an MVP this is a warning; for a prototype it's allowed. |
| A work item at `ship` or `done` is missing a review it needs | When an item reaches verify, Peer AI works out the reviews it needs from the files it touched, such as a security review for code at MVP or production. Missing one is a warning for an MVP and a failure in production. `activities.verify.reviews` in the config can require more, or skip one with a reason. |
| A gap work item is at `done`, but a fresh assessment still finds the gap | The work didn't fill it |
| A work item at `ship` or `done` depends on an item that hasn't shipped | Changes land in the order they depend on (RFC 0005). Building before a dependency ships is fine. |
| A work item depends on an item that doesn't exist, or items depend on each other in a loop | The plan can't be followed |

It also fails on anything [`peer-ai doctor`](#peer-ai-doctor) fails on (RFC 0007), listed under their own heading, so a setup that stopped working never passes CI unnoticed: for example, a production project whose linter no longer enforces its stack profile. Doctor's warnings don't fail the build; `check` counts them in one line. The skills are left out, since CI never has them.

It warns, and still passes, when:

- the project map is out of date, so it should be assessed again and committed
- the stage needs something that is missing and no open gap work item covers it
- an MVP or production project has no verify command

Gaps are never failures. They become work items, so a project can adopt Peer AI at any point without its build going red.

A review's result is worked out from its report when it is recorded, so an open problem at or above the project's blocking level (`gates.blockOn`) makes the review fail, and the work item can't ship until the problem is fixed or a person accepts the risk.

### In CI

Run it after the project's own checks:

```yaml
- run: npx peer-ai check
```

### Options

| Option | What it does |
|--------|--------------|
| `--json` | Print the checks as JSON |

### Exit codes

`0` passed (warnings are allowed), `1` failed, `2` a usage error or no valid `peer-ai.config.json`.

## `peer-ai check-report`

Checks a review's report the way the `record_review` tool does: that it's valid, gives every rule its skill answers for a line, and claims the result its findings and coverage support. It records nothing. It's there for AI tools that work in a shell rather than through the MCP server, and for a person checking a report by hand.

```bash
npx peer-ai check-report .peer-ai/reports/project/security-review-20261001T0900Z.json
```

| Option | What it does |
|--------|--------------|
| `--skill <skill>` | The skill the report is for. By default, the one the report names. |
| `--work-item <id>` | The work item it's for, when there is one |
| `--json` | Print the result as JSON |

Exit codes: `0` when the report passes, `1` when it doesn't, and `2` without a valid config or a report path.

## `peer-ai check-document`

Checks a document a Peer AI skill wrote, such as the requirements, the way the `check_document` tool does: every required part of the skill's template is there and filled in, no template text is left in, and every rule id it cites exists. It changes nothing. It's there for AI tools that work in a shell, and for CI.

```bash
npx peer-ai check-document docs/requirements.md --skill requirements-analysis
```

| Option | What it does |
|--------|--------------|
| `--skill <skill>` | The document skill that wrote it. Required. |
| `--template <name>` | Which of the skill's templates it follows, when it has several. By default, the main one. |
| `--json` | Print the result as JSON |

Exit codes: `0` when the document is ready, `1` when it isn't or can't be checked, and `2` without a path or a skill.

## `peer-ai feedback`

When Peer AI gets something wrong in your project, such as a review that misses a problem or a check that blocks work by mistake, your AI tool drafts a report with the `draft_feedback` tool and keeps it in `.peer-ai/feedback/`, out of git. You decide what happens to each one (RFC 0007).

```bash
npx peer-ai feedback
npx peer-ai feedback send 2026-10-02-check-blocked-a-merge.md
npx peer-ai feedback drop 2026-10-02-check-blocked-a-merge.md
```

| Command | What it does |
|---------|--------------|
| `peer-ai feedback` | Lists the drafts waiting, with each title |
| `peer-ai feedback send <draft>` | Opens the draft as an issue on Peer AI's repository, labelled `feedback`, under your own GitHub account through the GitHub CLI, `gh`. The draft moves to `.peer-ai/feedback/sent/` with the issue's link. Without a signed-in `gh`, it prints a link to a new issue with the report filled in, for you to submit. |
| `peer-ai feedback drop <draft>` | Deletes the draft |

Your AI tool asks you about each draft at a natural stopping point, and runs `send` or `drop` only after you answer. Nothing is ever sent without a person's yes, and a report never holds your code: Peer AI refuses a draft with a block of code, anything that looks like a key or a token, or an email address.

Exit codes: `0` done, `1` a draft that doesn't exist, `2` a usage error.

## `peer-ai mcp`

Starts the Peer AI MCP server over stdio. Any AI tool that supports MCP servers reaches the same project map, work items and gates through it, so a project behaves the same whichever tool a person uses.

The AI tool starts it, from the project's folder or one inside it. For example, in a project's `.mcp.json` for Claude Code:

```json
{
  "mcpServers": {
    "peer-ai": { "command": "npx", "args": ["peer-ai", "mcp"] }
  }
}
```

`peer-ai render` writes this registration for each tool in the config.

| Tool | What it does |
|------|--------------|
| `project_map` | Each item on the project map with its evidence, what the stage still needs, compliance signals and traits to consider. It assesses afresh on every call, and says whether the committed map has fallen behind. |
| `next_work` | Any setup problem `peer-ai doctor` finds (`setup`), each with its fix, for the AI tool to fix or tell the person about before other work. Then the open work item for the current git branch, with where it stopped, its next action and the reviews it needs, and every other open item, with the items each is waiting for before it can ship (`waiting`). When nothing is open, the gaps the stage needs, with the Peer AI skill to use for each (`useSkill`). |
| `standards_for_file` | The track a file belongs to, the stack profiles, and the project's own standards documents and rules for that track |
| `create_work_item` | Starts a feature, bug, refactor, migration, discovery, chore or gap at `prepare`. Its id comes from `tracker.ticketPrefix` (or `ITEM`) unless a tracker key is given, and its branch from `repo.branchNaming`. It can carry its plan (RFC 0005): a goal, acceptance criteria, the sources it implements, and the items it depends on. |
| `update_work_item` | Records the next action and the activity and step where work stopped, so the next session resumes there. It also sets the item's goal, acceptance criteria, sources and dependencies. |
| `run_verify` | Runs `commands.verify` and records the result with the end of its output. Only this tool records a verify, so a pass is proven rather than claimed. |
| `record_review` | Records a review from its report: Peer AI checks the report and works out pass, fail or incomplete from it, and refuses a result the report doesn't support, or a report that leaves out any of the skill's rules. A review recorded without a report is marked unproven. For a review of the whole project, leave out the work item: Peer AI checks the report the same way and gives its result, without recording it. |
| `check_document` | Checks a document a Peer AI skill wrote against the skill's template, and lists what to change: missing or empty parts, template text left in, and rule ids that don't exist. The skill fixes them and checks again, until the document is ready. |
| `advance_work_item` | Moves a work item to its next stage, back to an earlier one, or to cancelled. A move to `ship` or `done` passes the same gates as `peer-ai check`, and a refusal lists what to fix. Moving to verify works out the reviews the change needs from the files it touched, and keeps them on the item. |
| `draft_feedback` | Drafts a report for Peer AI's maintainers when Peer AI itself gets something wrong, with Peer AI's version, the AI tool, the stage and the stack profiles added. It writes the draft to `.peer-ai/feedback/` and refuses one holding code, a key or token, or an email address. The person decides whether it's sent: see [`peer-ai feedback`](#peer-ai-feedback). |

Every change to a work item is validated against its schema before it is written. `run_verify` runs the project's own command through the shell, exactly as a person would type it.

