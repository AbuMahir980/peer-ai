# RFC 0004: How a skill is written

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Proposal issue | #28 |

## Summary

Every one of Peer AI's 29 skills is written in the [Agent Skills](https://agentskills.io/specification) open standard: a folder holding a short `SKILL.md`, plus references and templates that load only when the work needs them. Skills follow [Anthropic's authoring guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

A skill does the work rather than describing it. It builds an inventory of what's under review and checks each rule against each item. Deterministic steps are handed to Peer AI's own tested tools. The output is something Peer AI can check: a review report, a document with required parts, or a change to a work item. If the check fails, the skill fixes what it names and tries again. No skill ships until it passes at least three evals.

## Motivation

v0 had four "skills", and all four were checklist prompts. The security audit, for example, opens with "You are a security engineer" and continues as a list of topics to look at. Run on real projects, the prompts showed five problems:

- **They proved nothing.** There was no inventory of what was reviewed, so a route nobody looked at was indistinguishable from a route that passed.
- **They couldn't be tested.** There was no fixed output to score, so nobody could say whether a change to a prompt made it better or worse.
- **They loaded everything at once.** A security audit carried every topic into context, whether the change touched sign-in or a CSS file.
- **They drifted.** Rules were copied into prose and went out of date as the standards changed.
- **They got in the way.** They asked people to switch models partway through, and restated what any capable model already knows.

Since then, two things have changed:

- The Agent Skills format, developed by Anthropic and released as an open standard, is now read by all five tools Peer AI sets up: Claude Code, Codex, Cursor, GitHub Copilot and Gemini CLI.
- Anthropic's authoring guidance sets a clear bar:
  - assume the model is capable, and add only what it doesn't know;
  - keep `SKILL.md` under 500 lines, with detail in files one link away;
  - use scripts for deterministic work;
  - build in a validate → fix → repeat loop;
  - write evals before the instructions.

RFC 0002 gave reviews a report format and evals, and RFC 0003 gave the rules. This RFC joins them up: it says how a skill uses both.

## Design

### 1. The format

Each skill is a folder named after its id from RFC 0001's vocabulary, such as `security-review/`. The ids stay as they are: config already uses them. Anthropic suggests verb forms such as `reviewing-security`, but noun phrases are also acceptable under the guidance.

```
security-review/
├── SKILL.md           # when to use, the workflow, the output
├── references/        # read only when a step needs it
│   ├── access-control.md
│   ├── input-and-output.md
│   ├── rules.md       # generated from @peer-ai/standards
│   ├── severity.md    # generated from the shared rubric
│   └── report.md      # generated from the report schema, with an example
└── assets/            # templates the skill fills in
```

The frontmatter follows the standard:

| Field | Value |
|-------|-------|
| `name` | The skill id. It matches the folder name. |
| `description` | Up to 1,024 characters, written in the third person. It says what the skill does and when to use it, including the words people actually say, such as "security review" or "audit". This is all a tool reads before choosing a skill, so it is written and tested with care. |
| `license` | `MIT` |
| `compatibility` | "Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later." |
| `metadata` | `peer-ai-kind` (review, document or work) and `peer-ai-version` |

The body stays under 500 lines and aims for about 200. Reference files link directly from `SKILL.md`, never from each other. Any reference longer than 100 lines opens with a table of contents.

### 2. What goes where

| What | Where | When the model reads it |
|------|-------|-------------------------|
| What the skill does and when to use it | `description` | Always (about 100 tokens) |
| The workflow as a checklist, decision points and the output | `SKILL.md` | When the skill starts |
| How to check each group of rules, with examples of pass and fail evidence | `references/` | When that step needs it |
| The rules | `references/rules.md`, generated; the set that applies to a file comes from `standards_for_file` | On demand |
| Severity rubric and output format | `references/`, generated from one shared source | On demand |
| Templates | `assets/` | When writing |
| Deterministic work | Peer AI's MCP tools and CLI | Never read: run |

Rules are never copied into a skill by hand. A skill cites rule ids, and a test fails if it cites one that doesn't exist.

### 3. Three kinds of skill, each with an output Peer AI checks

| Kind | Skills | Output | How it's checked |
|------|--------|--------|------------------|
| **Review** (15) | code-review, security-review, contract-check, accessibility-review, design-review, performance-review, reliability-review, data-migration-review, dependency-review, compliance-review, qa-acceptance, ai-feature-review, release-readiness, infrastructure-review, observability-review | A review report (RFC 0002): inventory, a coverage row for every rule, findings with evidence | `record_review` rejects a report that leaves a rule out, or claims a result its findings don't support |
| **Document** (10) | requirements-analysis, product-spec, architecture, system-design, api-design, data-modelling, threat-model, design-system, test-strategy, documentation | A document built from a template in `assets/`, saved where the project map expects it. test-strategy also writes the tests it plans, abuse tests included. | A new `check_document` tool reports missing required parts and unknown rule ids |
| **Work** (4) | issue-planning, implement-ticket, incident-response, tech-debt-triage | Work items created and moved through the MCP tools | The work item's own gates (`peer-ai check`) |

The new document check has two surfaces:

- **MCP tool:** `check_document({ skill, path })` returns each missing part and each rule id that doesn't exist, so the skill can fix them and check again.
- **CLI:** `peer-ai check-document <path> --skill <id>` does the same check for CI and for tools that aren't connected.

### 4. A skill does the work

Every skill is built from the same moves. These are the anatomy from the ROADMAP, put into practice:

1. **Scope.** The work item's change, or the whole project.
2. **Inventory.** Everything in scope, taken from the code: every route, screen, job, webhook, migration or dependency. A review covers every rule against every item, so silence is never an answer.
3. **Rules.** `standards_for_file` returns the rules that apply to each file, given the project's stage, traits, profiles and exceptions.
4. **Check.** The skill gives the model the least freedom where mistakes are costly and the most where judgement is the point:
   - **Exact steps** for fragile work, such as running the project's checks with `run_verify` or recording the result.
   - **Clear criteria and examples** for judgement, such as whether a query is safe or a permission check is on the right record.
5. **Validate, fix and repeat.** The skill writes its report or document and hands it to `record_review` or `check_document`. It fixes whatever comes back and repeats until the output passes. This is Anthropic's feedback loop, and it is why a Peer AI review can't quietly skip a rule.
6. **Record.** The result lands on the work item, where the stage gates from RFC 0002 read it.

What a skill leaves out matters just as much:

- no role-play;
- no requests to switch models;
- no explanations of things a capable model knows.

It holds only what the model can't know: Peer AI's rules, the evidence bar, the output format, and lessons from real projects.

Frameworks appear only as examples. How to check a rule in a particular framework comes from its stack profile, through `standards_for_file`. Tools are named with their server, as in "the peer-ai `record_review` tool", so they resolve even when several MCP servers are connected.

Anthropic's own skills bundle scripts, usually in Python. Peer AI's deterministic helpers live in its CLI and MCP server instead. They are written once in tested TypeScript and pinned to the project's version, and they are the same for all 29 skills. A skill folder carries a script only when no shared tool fits.

### 5. Where skills live, and how tools get them

- **Source:** a new package, `@peer-ai/skills`. The build validates each skill (section 6) and writes the generated references.
- **Delivery:** `peer-ai render` writes the skills for each tool in the config, in the folder that tool reads skills from, such as `.claude/skills/` for Claude Code. Each tool's folder is confirmed against its documentation and covered by a test.
- **Not committed:** render adds the skills to `.gitignore`. A version bump must stay a one-line change (Gate D), and 29 skill folders would change with every release. A fresh clone gets them with `peer-ai render`; a Node project can run that from its `prepare` script. `peer-ai doctor` reports skills that are missing or out of date.

### 6. The quality bar, checked in CI

A test fails the build if any skill breaks these rules. They come from the specification and Anthropic's checklist:

- The frontmatter is valid: `name` equals the folder name and the skill id, `description` is at most 1,024 characters, is in the third person and says when to use the skill, and nothing contains XML tags.
- `SKILL.md` is under 500 lines.
- Every linked file exists and is one level deep, and every reference longer than 100 lines has a table of contents.
- Every rule id exists in `@peer-ai/standards`, and every tool and command named exists in Peer AI.
- Paths use forward slashes.

**Evals come first.** Each skill has at least three eval scenarios before its instructions are written:

- **Review skills** use fixture projects with planted defects (RFC 0002). They must find every planted Critical and High problem and invent nothing: that is Gate C.
- **Document and work skills** use a scenario with a list of must-have points. A grader model scores the output, and a person spot-checks the grading.
- **Every skill** must beat a run of the same scenario without the skill. It is run on Claude Code and on Codex, with a fast model and a strong one.

### 7. What v0 contributes

v0's checklists, and the defects found on real projects (logged in `legacy/v0/docs/peer-ai-feedback.md`), become two things: the "how to check" references, and the planted defects in the evals. Nothing else carries over: not its wording, its role-play, its model switching or its phase instructions.

### 8. The right skill runs without anyone naming it

Nobody should need to remember 29 skill names. There are four ways a skill starts, and the first two mean a person never has to name one.

**1. Peer AI says which skill comes next.** Every tool is told to start each session with `next_work`. Two cases:

- **The project has a gap and no open work.** `next_work` lists each gap together with the skill that fills it. For example, a new MVP with no architecture document gets "architecture: missing, use the architecture skill".
- **A work item is open.** `next_work` returns its step and the skills that step needs.

The map items and their skills:

| Map item | Skill |
|----------|-------|
| requirements | requirements-analysis |
| architecture | architecture |
| threat-model | threat-model |
| specs | product-spec, then system-design |
| api-contract | api-design |
| data-model | data-modelling |
| data-inventory, dpia | compliance-review |
| design | design-system |
| tests | test-strategy |
| load-testing | performance-review |
| infrastructure | infrastructure-review |
| observability, slos | observability-review |
| runbooks | incident-response |
| docs | documentation |

standards, ci and environments have no skill of their own. `next_work` says what to set up for them instead. The table lives in `@peer-ai/workflow` beside the map items, and a test makes sure every skill it names exists.

**2. Peer AI works out which reviews a change needs, and the gate holds it to them.** When a work item reaches verify, Peer AI reads what the change touched (its files against the base branch, and the parts they belong to) and lists the reviews it requires, each with its reason:

| Review | Required when the change... |
|--------|-----------------------------|
| code-review | changes any code |
| security-review | changes code, at MVP or production |
| accessibility-review | changes a screen in a web, mobile or desktop part |
| design-review | changes a screen, in a project with a design on its map |
| contract-check | changes the API contract, or a part that provides or uses an API |
| data-migration-review | adds or changes a migration |
| dependency-review | changes a dependency file or lockfile |
| compliance-review | changes where personal data is stored, sent or logged |
| ai-feature-review | changes code that calls an AI model, in a project with the ai-features trait |
| infrastructure-review | changes infrastructure as code or deployment config |
| release-readiness | is about to ship, at production |

The file patterns are the ones `assess` already uses for migrations, dependency files, schemas and infrastructure. What happens when a required review is missing depends on the stage, following the same grading RFC 0002 uses for unproven reviews:

| Stage | Missing required review |
|-------|-------------------------|
| Prototype | Listed as a suggestion |
| MVP | A warning |
| Production | `peer-ai check` refuses to ship the work item |

A project can require more reviews, or drop one with a written reason, in its config. The AI can always add a review it judges useful.

**3. The tool matches what a person says.** Every tool keeps each skill's description in view. When someone asks "is the login safe?", the tool picks security-review on its own.

**4. By name**, for anyone who wants a particular skill, such as `/security-review` in Claude Code.

The surface this adds:

- `next_work` returns a `skill` for each gap, and `reviews` (skill, required, reason) for a work item at verify.
- `peer-ai check` enforces required reviews by stage, as in the table above.
- The config gains a way to add or drop a required review, with a reason. Its exact key is settled in the first batch and follows RFC 0001's `activities` section.

### 9. Order of work

1. **The format, proven on three skills.** The `@peer-ai/skills` package, build and validation test, `check_document`, render support, and the skill routing in section 8, plus security-review, ai-feature-review and code-review. All three already have fixture projects, so the format is proven end to end before 26 more skills are written.
2. **Plan:** the nine plan skills.
3. **Build and verify:** implement-ticket and the remaining verify skills.
4. **Ship and operate.**
5. **Maintain.**

## Compatibility

This is a minor change. It adds:

- the new `@peer-ai/skills` package;
- the `check_document` MCP tool and `peer-ai check-document` command;
- skill folders written by `peer-ai render`;
- a skill for each gap, and the reviews a work item needs, in what `next_work` returns;
- a config entry to add or drop a required review.

One existing behaviour changes: `peer-ai check` starts enforcing required reviews, so at production a work item that could ship before may now be refused until its reviews are done. No project runs 1.0 yet, so nobody is affected. The skill ids don't change, and projects on v0 are unaffected until they migrate.

## Drawbacks

- **A fresh clone needs one command** (`peer-ai render`) before skills appear as files. The MCP server and the instructions block work without it.
- **Evals cost money.** A full pass of every skill, on two tools and two models, costs a few hundred dollars. Full runs happen per batch and before a release, not on every change.
- **Security review runs on every code change at MVP and production.** That costs time and tokens. The review's scope is the change, so a small change gets a small review, and a project can drop the requirement with a written reason.
- **A grader model can be wrong.** That is why a person spot-checks document and work evals.
- **Tools differ in the details.** Optional fields such as `allowed-tools` are experimental in the standard, so skills don't depend on them.

## Alternatives

- **Serve the prompts from the MCP server only, as v0 did in spirit.** Tools wouldn't pick a skill by its description, nothing could load step by step, and references couldn't be bundled.
- **One skill with 29 sections.** Its description couldn't say when to use each part, so tools would pick it for everything or nothing.
- **Bundled scripts in each skill, in the style of Anthropic's own.** The same logic would be copied into many skills and tested separately. Peer AI already ships a versioned, tested CLI, so the helpers belong there.
- **Commit the rendered skills.** A fresh clone would work with no command, but every version bump would touch 29 folders. See the open questions.

## Open questions

- Should a project be able to choose to commit its rendered skills, for teams who want them visible in review? Leaving them uncommitted is the default either way.
