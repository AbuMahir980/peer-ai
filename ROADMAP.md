# Roadmap to Peer AI 1.0

Peer AI 1.0 turns the v0 playbook into an open-source npm package that works with any AI coding tool. A project keeps one config file and no copied `peer-ai/` folder, every skill proves what it checked, and the standards cover a full-stack product from the user interface to the infrastructure.

It comes from running v0 end to end on real projects of different shapes: a local-first web app, a phone app rebuilt from an existing production system, and a static marketing site. The problems those runs found are logged in the [v0 feedback log](https://github.com/AbuMahir980/peer-ai/blob/v0.1.0/docs/peer-ai-feedback.md).

**Where it stands:** the engine, the 29 skills and the 197 rules are built and tested. A pre-release is next, and 1.0 ships once Peer AI has been proven on real projects. See [Milestones](#milestones).

---

## What changes

| Area | v0 | 1.0 |
|------|----|-----|
| Install | Clone into `peer-ai/`, then delete its `.git` | `npx peer-ai init`, or the version pinned in `devDependencies` |
| Workflow shape | One fixed line of twelve phases; an existing project has to fake a position on it | `peer-ai assess` builds a project map, and each piece of work calls only the steps it needs |
| What sits in a project | About 48 playbook files, which projects end up editing | One config file, a marked block in each AI tool's instructions, an MCP registration, and a `.peer-ai/` folder for the map, work items and reports |
| Customising | Editing phase files, or patching them with scripts after every pull | Config keys; a rule can be set aside, with a reason and the name of who decided, or changed; package files are never edited |
| Updates | A manual three-way merge; a copy can fall months behind without anyone noticing | A version-bump pull request, and `peer-ai doctor` warns when the setup falls behind |
| How the agent gets it | Several thousand tokens of rules on every turn | An MCP server hands over the next step and only the rules for the file in hand |
| Skills | Four checklist prompts | 29 skills, each with a procedure, rule ids, evidence and a coverage report |
| Standards | Prose rules with web-first defaults | 197 rules, stack profiles enforced by real tools, and a project's own rules |
| Scope | Frontend and backend | 18 domains, from requirements to operations and AI features, plus rules for products that handle money or safety-critical data |
| Enforcement | Written rules | JSON schemas, recorded proof, and `peer-ai check` in CI |
| Testing Peer AI itself | Defects surface when a new project hits them | Every skill tested on practice projects with planted problems, with the results published |

---

## How 1.0 works

**One package, one server, any tool.** The workflow lives in `node_modules`. Claude Code, Codex, Cursor, GitHub Copilot and Gemini CLI all reach it through the same MCP server, which serves the project map, the next piece of work, the rules for the file in hand, and the checks on reviews and documents. Tools that read Agent Skills (`SKILL.md`) also get the skills as files. Projects outside the Node ecosystem run `npx peer-ai`.

**Adaptive, not waterfall.** `peer-ai assess` reads the repository and records each thing the workflow cares about (requirements, architecture, API contract, standards, CI, tests, infrastructure, observability and more) as present, partial or missing, with the files that prove it. Work then moves in items: a feature, a bug, a refactor or a migration. Each item pulls in only the spec, contract or decision it needs, then goes through build, verify and ship. Gaps on the map become work items, never blockers. How strict the gates are depends on the project's stage: prototype, MVP or production.

**Skills that prove what they checked.** Every skill follows the same anatomy:

1. **Inputs.** What it reads first.
2. **Inventory.** The whole surface under review: every route, screen, migration or service.
3. **Procedure.** Numbered steps, each saying exactly how to check.
4. **Rules.** Each check carries a rule id from the standards.
5. **Evidence.** File and line for every finding, and what was checked for every pass.
6. **Coverage report.** Pass, fail, not applicable or not checked, for every rule against every item. Silence is never an answer.
7. **Severity rubric.** Defined levels, not judgement calls.
8. **Output.** JSON that Peer AI checks, plus a short summary for people.
9. **Eval.** A practice project with planted problems that the skill must find.

The 29 skills:

| Stage | Skills |
|-------|--------|
| Plan | requirements-analysis, product-spec, architecture, system-design, api-design, data-modelling, threat-model, design-system, test-strategy, issue-planning |
| Build | implement-ticket |
| Verify | code-review, security-review, contract-check, accessibility-review, design-review, performance-review, reliability-review, data-migration-review, dependency-review, compliance-review, qa-acceptance, ai-feature-review |
| Ship | release-readiness, infrastructure-review |
| Operate | observability-review, incident-response |
| Maintain | documentation, tech-debt-triage |

Skills from other tools can run alongside as add-ons, but the workflow never depends on them.

**Standards in three layers.**

| Layer | Holds |
|-------|-------|
| Core rules | 197 language-agnostic rules, each with an id, a reason, the stage it applies from, how it's checked and how serious a break is |
| Stack profiles | The rules in one stack's idioms, each automatic rule with the tool that enforces it |
| The project's own rules | What only one project needs, and any rule it set aside or changed, with a reason |

The 18 domains are requirements, architecture, system design and scalability, API design, frontend, mobile, design and accessibility, backend, data, performance and caching, reliability, security, privacy and compliance, testing, delivery, infrastructure and operations, AI features, and code quality. Two more sets switch on for products that need them: money, and safety-critical data.

The stack profiles so far are TypeScript, Node, React, React Native, Next.js, Express, NestJS, Fastify, Python, FastAPI and GitHub Actions, enforced by ESLint, the TypeScript compiler, Ruff and a security pipeline. Other stacks follow the same pattern: see [Contributing](CONTRIBUTING.md).

**Rule packs for regulated products** are planned. A rule pack is an outside rulebook a product must follow: a data protection law such as the GDPR or Nigeria's NDPA, an industry standard such as PCI DSS, or a platform policy such as the App Store's. Today, `peer-ai assess` already reports the signals in the code, such as personal data in the schema or a payment provider, and suggests the packs to consider. The packs themselves, each rule citing its source and anything only a lawyer can settle flagged for one, come after 1.0.

---

## Milestones

| # | Milestone | Closed when | Status |
|---|-----------|-------------|--------|
| 1 | **Foundations**: monorepo, CI, config and state schemas, RFC process | Every real customisation seen so far can be written as config, with nothing lost | Done |
| 2 | **Engine**: the CLI (`init`, `assess`, `render`, `doctor`, `check`) and the MCP server | A practice project takes a work item end to end on two different AI tools with one config | Done |
| 3 | **Skills and standards**: 29 skills, 197 rules, 11 stack profiles, evals on practice projects | Every skill finds every planted critical and high problem in its eval, with no invented findings | Done, with one known limit: `code-review` on a whole project misses a few different problems each run ([evals](evals/README.md)). Reviews in small passes, planned by importance, are next. |
| 4 | **Real projects**: a pre-release on npm, `peer-ai migrate` for projects running v0 | Each project runs on the package with no `peer-ai/` folder, and a version bump lands as a one-line pull request | In progress |
| 5 | **Public 1.0**: docs, quickstart, examples, a demo, the npm release | Peer AI is proven on real projects, and every problem they report is fixed or planned | Next |

**Coming next:** a pre-release on npm; reviews that work in small passes, most important rules first; a feedback route, where an AI tool drafts a report of anything Peer AI got wrong and a person approves sending it; and `peer-ai migrate`.

---

## Taking part

Contributions are open now. Read [CONTRIBUTING.md](CONTRIBUTING.md) for good first contributions: a stack profile, a rule with its eval, a practice project, another AI tool, or a report of where Peer AI got something wrong.
