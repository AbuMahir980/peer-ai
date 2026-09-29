# peer-ai

The Peer AI command-line tool.

> Not published yet. Inside this repository, run it with `pnpm peer-ai <command>`. It becomes `npx peer-ai` when the package is published.

## `peer-ai init`

Sets up Peer AI in a repository by writing `peer-ai.config.json`.

```bash
pnpm peer-ai init
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
pnpm peer-ai assess
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

A trait says what the product is or does, and switches on the rules for it (see `@peer-ai/standards`). `assess` suggests the traits the code points to, each with what it found, and leaves out any the config already declares. A person decides: add the ones that fit to `project.traits`.

| Trait | Suggested by |
|-------|--------------|
| `money` | A payment provider, or card-related names in the schema |
| `safety-critical` | Names such as `allergens`, `medication` or `dosage` in the schema |
| `several-audiences` | Two or more apps sharing a backend, or names such as `tenant_id` or `organizationId` in the schema |
| `offline` | A service worker, or an offline or on-device database library such as Workbox, Dexie, WatermelonDB or sqflite |
| `real-time` | A live-connection library such as Socket.IO, a WebSocket library, Pusher, Ably or SignalR |
| `uploads` | An upload library such as Multer, `python-multipart`, Uppy or an image picker |
| `ai-features` | An AI model SDK such as OpenAI's, Anthropic's, the Vercel AI SDK, LangChain or Gemini's |

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

`0` success, `2` a usage error or an invalid `peer-ai.config.json`. Gaps are not errors: `assess` maps, and `peer-ai check` will be the command that fails a build.

## `peer-ai render`

Sets up each AI tool listed in `tools` in `peer-ai.config.json`, so every tool works the project the same way.

```bash
pnpm peer-ai render
```

| Tool | Instructions | MCP server registration |
|------|--------------|-------------------------|
| Claude Code | A block in `CLAUDE.md`, unless it imports `AGENTS.md` | `.mcp.json` |
| Codex | A block in `AGENTS.md` | Codex keeps servers in your own config, so render prints the `codex mcp add` command to run once. Codex asks before `run_verify` runs the project's verify command; render prints the setting that allows it without asking, if you choose to. |
| Cursor | `.cursor/rules/peer-ai.mdc`, a rule that always applies | `.cursor/mcp.json` |
| GitHub Copilot | A block in `.github/copilot-instructions.md` | `.vscode/mcp.json` |
| Gemini CLI | A block in `GEMINI.md`, unless it imports `AGENTS.md` | `.gemini/settings.json` |

`AGENTS.md` gets the block whenever a tool other than Claude Code is listed, when it already exists, or when `CLAUDE.md` imports it.

The instructions are short: how to work through the MCP server, the project's parts, its commands, its compliance packs and its own rules. The server serves the detail when it's needed, rather than every rule on every turn.

### Skills

Render writes Peer AI's skills where the listed tools read them, each named `peer-ai-<skill>`, such as `peer-ai-security-review`. The prefix means a Peer AI skill never replaces one of a tool's own, such as Claude Code's `/code-review`.

| Folder | Read by | Written when the config lists |
|--------|---------|-------------------------------|
| `.claude/skills/` | Claude Code, Cursor, GitHub Copilot | Claude Code |
| `.agents/skills/` | Codex, Cursor, GitHub Copilot, Gemini CLI | Codex, Gemini CLI or another tool; or Cursor or Copilot without Claude Code |

- **They stay out of git.** They're rebuilt from the installed version, so a version bump stays a one-line change. Render adds them to `.gitignore` in a marked block.
- **After cloning,** run `peer-ai render` to write them. In a Node project, a `prepare` script can do it on install. `peer-ai doctor` warns when they're missing or out of date.
- **Only its own skills.** Render replaces and removes only folders named `peer-ai-…`. A skill of your own sits beside them untouched.
- **Cloud sessions.** Claude Code's cloud sessions load only the skills committed to the repository, so run `peer-ai render` in the environment's setup.

What render changes, and what it leaves alone:

- **A block, not the file.** It writes between `<!-- peer-ai:start -->` and `<!-- peer-ai:end -->`, and never touches anything outside them. A file without the block gets it at the end.
- **One server entry, not the config.** It adds or updates the `peer-ai` entry and keeps every other server and setting. It refuses a file it can't read as plain JSON, such as one with comments, and prints the entry to add by hand.
- **The pinned version.** When `package.json` has `peer-ai` in its dependencies, tools start that copy; otherwise they start this exact version with `npx`.
- **Nothing twice.** A second run changes nothing. `peer-ai doctor` warns when these files or the skills no longer match the config.

### Options

| Option | What it does |
|--------|--------------|
| `--check` | Change nothing, and fail when a committed file is out of date. For CI. It leaves the skills out, since CI never has them. |

### Exit codes

`0` done or up to date, `1` a file was refused, or is out of date with `--check`, `2` a usage error or no valid `peer-ai.config.json`.

## `peer-ai doctor`

Checks that Peer AI is set up correctly in a repository, and says how to fix what isn't. It only reads; it never changes a file.

```bash
pnpm peer-ai doctor
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
| Rules set aside or changed | Every entry in `standards.exceptions` and `standards.overrides` is listed, so nothing is switched off silently. It warns about an exception whose `until` date has passed, a rule id that isn't one of Peer AI's rules, and a rule set aside twice. |
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
pnpm peer-ai check
```

| It fails when | Why |
|---------------|-----|
| The config is missing or not valid | Nothing else can be checked (exit code `2`) |
| A track's folder doesn't exist | The config no longer describes the repository |
| `.peer-ai/map.json` or a work item isn't valid, or a work item names a track the config doesn't have | State that agents read has to be trustworthy |
| A work item at `ship` or `done` has no recorded verify, or its last verify failed | `commands.verify` runs before any work is called done. Without a verify command, only a recorded failure counts. |
| A work item at `ship` or `done` has a review whose latest result failed, or is incomplete | A review that didn't check every rule hasn't passed. A later passing review from the same skill replaces an earlier failure. At the `prototype` stage, an incomplete review is allowed; a failed one never is. |
| A production project's work item at `ship` or `done` has a review with no report | Without a report, the result is only the agent's word. For an MVP this is a warning; for a prototype it's allowed. |
| A gap work item is at `done`, but a fresh assessment still finds the gap | The work didn't fill it |

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
| `next_work` | The open work item for the current git branch, with where it stopped and its next action, and every other open item. When nothing is open, the gaps the stage needs. |
| `standards_for_file` | The track a file belongs to, the stack profiles, and the project's own standards documents and rules for that track |
| `create_work_item` | Starts a feature, bug, refactor, migration, discovery, chore or gap at `prepare`. Its id comes from `tracker.ticketPrefix` (or `ITEM`) unless a tracker key is given, and its branch from `repo.branchNaming`. |
| `update_work_item` | Records the next action and the activity and step where work stopped, so the next session resumes there |
| `run_verify` | Runs `commands.verify` and records the result with the end of its output. Only this tool records a verify, so a pass is proven rather than claimed. |
| `record_review` | Records a review from its report: Peer AI checks the report and works out pass, fail or incomplete from it, and refuses a result the report doesn't support. A review recorded without a report is marked unproven. A report that leaves out any of the skill's rules is refused: every rule gets a line, even one that doesn't apply. |
| `advance_work_item` | Moves a work item to its next stage, back to an earlier one, or to cancelled. A move to `ship` or `done` passes the same gates as `peer-ai check`, and a refusal lists what to fix. |

Every change to a work item is validated against its schema before it is written. `run_verify` runs the project's own command through the shell, exactly as a person would type it.

