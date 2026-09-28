# Roadmap to Peer AI 1.0

Peer AI 1.0 turns this playbook into an open-source, agent-agnostic npm package. A project keeps one config file and no copied `peer-ai/` folder, every skill proves what it checked, and the standards cover a full-stack project from the UI to the infrastructure.

Everything here comes from running v0 end to end on real projects of different shapes: a local-first web app, a React Native rebuild of an existing production system, and a static marketing site. The defects those runs found are logged in [docs/peer-ai-feedback.md](docs/peer-ai-feedback.md).

---

## What changes

| Area | v0 (this branch) | 1.0 |
|------|------------------|-----|
| Install | Clone into `peer-ai/`, then delete its `.git` | `npx peer-ai init`, with the version pinned in `devDependencies` |
| Workflow shape | One fixed line of twelve phases; an existing project has to fake a position on it | `peer-ai assess` builds a project map, and work items call only the activities they need |
| What sits in a project | About 48 playbook files, which projects end up editing | One config file, a marked block in `AGENTS.md` or `CLAUDE.md`, an MCP registration, and a state file |
| Customising | Editing phase files, or patching them with scripts after every pull | Config keys and a project addendum; package files are never edited |
| Updates | A manual three-way merge; a copy can fall months behind without anyone noticing | Renovate or Dependabot opens a version-bump PR, and `peer-ai doctor` flags breaking changes |
| How the agent gets it | Several thousand tokens of rules on every turn, plus "Follow peer-ai/…" | An MCP server hands over the next step and only the rules for the file being edited |
| Skills | Four checklist prompts | 29 skills, each with a procedure, rule IDs, evidence and a coverage report |
| Standards | Prose rules with web-first defaults | Core principles, stack profiles with real linter and CI configs, and a project addendum |
| Scope | Frontend and backend | 17 domains, from requirements to operations and AI features |
| Enforcement | Written rules | JSON schemas, and `peer-ai check` runs in CI |
| Testing Peer AI itself | Defects surface when a new project hits them | Automated evals on three fixture projects before every release |

---

## How 1.0 works

**One package, one server, any tool.** The playbook lives in `node_modules`. Claude Code, Codex, Cursor, Copilot and Gemini CLI all reach it through the same MCP server, which serves the project map, the next work item, the standards for the file in hand, and reviews. Tools that read Agent Skills (`SKILL.md`) also get the skills as files. Repos outside the Node ecosystem run `npx peer-ai@<version>`.

**Adaptive, not waterfall.** `peer-ai assess` reads the repo and records each thing the workflow cares about (requirements, architecture, API contract, standards, CI, tests, infrastructure, observability) as present, partial or missing, with the file that proves it. Work then moves in items: a feature, a bug, a refactor or a migration. Each item pulls in only the spec, contract or decision it needs, then goes through build, verify and ship. Gaps on the map become backlog items rather than blockers. How strict the gates are depends on the project's stage: prototype, MVP or production.

**Skills that prove what they checked.** Every skill follows the same anatomy:

1. **Inputs.** What it reads first.
2. **Inventory.** The whole surface under review: every route, screen, migration or service.
3. **Procedure.** Numbered steps per rule, each saying exactly how to check.
4. **Rules.** Each check carries a rule ID from the standards.
5. **Evidence.** File and line for every finding, and what was checked for every pass.
6. **Coverage report.** Pass, fail, not applicable or not checked, for every rule against every item. Silence is never an answer.
7. **Severity rubric.** Defined levels, not judgement calls.
8. **Output.** JSON for CI, plus a short summary for people.
9. **Eval.** A fixture project with seeded defects that the skill must find before it ships.

The 29 skills:

| Stage | Skills |
|-------|--------|
| Plan | requirements-analysis, product-spec, architecture, system-design, api-design, data-modelling, threat-model, design-system, issue-planning |
| Build | implement-ticket |
| Verify | code-review, security-review, contract-check, accessibility-review, design-review, performance-review, reliability-review, data-migration-review, dependency-review, compliance-review, test-strategy, qa-acceptance, ai-feature-review |
| Ship | release-readiness, infrastructure-review |
| Operate | observability-review, incident-response |
| Maintain | documentation, tech-debt-triage |

Skills from other tools can run alongside as add-ons, but the workflow never depends on them.

**Standards in three layers.**

| Layer | Holds |
|-------|-------|
| Core principles | Language-agnostic rules, each with an ID, a reason and a review question |
| Stack profiles | Each principle in one stack's idioms, plus a real enforcer config |
| Project addendum | Domain rules that only one project needs |

The 17 domains are:

- requirements
- architecture
- system design and scalability
- API design
- frontend
- mobile
- design and accessibility
- backend
- data
- performance and caching
- reliability
- security
- privacy and compliance
- testing
- delivery
- infrastructure and operations
- AI features

The first stack profiles are TypeScript, React, React Native with Expo, Node, Python with FastAPI, PostgreSQL, Redis, Docker, Terraform and GitHub Actions.

**Rule packs for regulated products.** A rule pack is any outside rulebook a product must follow: a data protection law such as Nigeria's NDPA or the GDPR, an industry standard such as PCI DSS, a religious or cultural standard such as halal, labelling rules such as allergens, or a platform policy such as the App Store's. A project declares where it operates and what it does, and `compliance-review` checks every personal field, log line and third-party call against the packs that apply, with evidence a payment provider or regulator can read. Each rule cites its source. Packs reviewed by a qualified expert are marked verified, and anything only a lawyer or certifier can settle is flagged for them. The first packs are the NDPA, the GDPR, PCI DSS, and KYC and anti-money-laundering rules.

---

## Milestones

| # | Milestone | Closed when |
|---|-----------|-------------|
| 1 | **Foundations**: monorepo, CI, config and state schemas, RFC process | Every real customisation seen so far can be written as config, with nothing lost |
| 2 | **Engine**: CLI (`init`, `assess`, `render`, `doctor`, `check`) and the MCP server | A fixture project takes a work item end to end on two different AI tools with one config |
| 3 | **Skills and standards**: 29 skills, 17 domains, the first stack profiles and rule packs, evals | Every skill finds every seeded Critical and High defect in its eval, with no invented findings |
| 4 | **Migrations**: `peer-ai migrate` moves the projects that run v0 today onto the package | Each ends with no `peer-ai/` folder, and a version bump lands as a one-line PR |
| 5 | **Public 1.0**: docs site, quickstart, examples, npm release | A developer outside the team completes the quickstart unaided |

---

## Taking part

1.0 is being built on the `next` branch. Until the Foundations milestone lands, the most useful contribution is an issue describing where v0 failed on your project, including the project's shape: its stack, whether it had an API, and whether its design already existed.
