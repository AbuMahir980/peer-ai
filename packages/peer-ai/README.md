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
| The project's name and description | `package.json` or `pyproject.toml`, else the folder name |
| Whether the project is new or existing | Code and project files at the root |
| Each part and its stack | The repository root and every folder under `apps/`, `packages/`, `services/` and `libs/`. It recognises JavaScript and TypeScript frameworks, Python, Flutter, Android, JVM, Go, Rust, Ruby and PHP. |
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
| The project map | Missing, not valid, or out of date. It runs a fresh assessment and lists every item whose status has changed since `.peer-ai/map.json` was written. |
| Work items | A file in `.peer-ai/work/` that isn't valid, isn't named after its id, or names a track the config doesn't have |
| Git | A folder that isn't a git repository, or a `.gitignore` that hides Peer AI's files from the team and CI |
| The v0 playbook | A copy left in `peer-ai/`, with how to remove it |

Every check reports, including the ones it had to skip (for example, the tracks can't be checked without a valid config), so a clean report means everything was looked at.

A failure (✗) means Peer AI can't work as intended until it's fixed. A warning (!) is something to tidy up.

### Options

| Option | What it does |
|--------|--------------|
| `--json` | Print the checks as JSON |

### Exit codes

`0` nothing failed (warnings are allowed), `1` at least one check failed, `2` a usage error.
