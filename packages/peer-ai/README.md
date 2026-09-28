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
| Infrastructure as code | Its files, wherever they are: Terraform or OpenTofu, Pulumi, AWS CDK, Helm, Kustomize, Serverless, AWS SAM, CloudFormation, Bicep and Ansible. Folders such as `infra/`, `deploy/`, `k8s/` and `helm/` are searched a level deeper, and there Docker and Kubernetes files count too. A `docker-compose.yml` at the root is local development, not infrastructure. |
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
