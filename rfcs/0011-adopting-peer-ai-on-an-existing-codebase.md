# RFC 0011: Adopting Peer AI on an existing codebase

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #140 |

## Summary

On an existing codebase, Peer AI's enforcement arrives all at once and turns CI red, so people delete what `render` writes, and Peer AI's view of the project and the truth drift apart. This RFC lets a project adopt enforcement in stages:

- an existing codebase starts with enforcement that reports without blocking;
- any rule can be deferred until a date or a work item;
- `render` skips a check the project already runs, and says what it wrote and why.

`init` also adopts the profiles and traits `assess` suggests, now that doing so can't break a build. And Peer AI says when the versions in use have drifted apart during an update.

## Motivation

All from the first project to use 1.0 every day, an existing codebase with a Python API, mobile apps and Terraform:

- **Enforcement broke CI, so it was deleted** (#124). Once its stack profiles were switched on, every `render` wrote a security workflow and linter settings that failed at once: pinned-action and dependency checks, and about a dozen lint rules with many existing violations. Committing them would have turned every pull request red. The only way through was to delete the files after each `render`, after which `render --check` and `doctor` reported the project out of date forever.
- **A second secret scan, added without asking** (#129). The project already ran gitleaks in its own workflow, carefully tuned: the right permissions, the full history, and an allowlist for known test fixtures. `render` added another gitleaks job without looking, and its summary didn't mention the new workflow or the `.peer-ai/enforce/` folder. The new file's header asked for each job to be made a required check. The project's build agent asked for four things (recorded on #124): check before creating; say what `render` wrote; defer a rule rather than only turn it off; and explain `.peer-ai/enforce/`.
- **Suggested profiles were never adopted** (#114). `assess` suggested the backend and mobile profiles and the money, uploads and several-audiences traits, but setup wrote none into the config. For the first half of the work, no stack or money rules applied, and nothing said so. Six whole-project reviews ran without them.
- **Versions drifted during an update** (#125). After `render` moved the project to a new version, CI ran the new one while the MCP server and four running agents kept the old one, and nothing noticed. The update had to be sequenced by hand.

Each one is reasonable on a new project and wrong on an existing one, which is where most teams start.

## Design

### 1. Enforcement in stages

A new setting, `standards.enforcement`, says whether Peer AI's enforcement blocks:

| Stage | What the tools that enforce the profiles do |
|-------|---------------------------------------------|
| `report` | They run and report, but never fail a build. Each job in the security workflow runs with `continue-on-error`. ESLint runs Peer AI's rules as warnings. Ruff leaves Peer AI's rules out, since it has no warnings, and `doctor` lists them. `doctor` reports enforcement gaps as warnings, at any stage. |
| `enforce` | As today: they fail the build, and at the production stage `doctor` fails an automatic rule nothing enforces. |

`init` and `migrate` write `report` for an existing codebase and `enforce` for a new one. A config without the setting keeps today's behaviour, `enforce`, so nothing changes under anyone's feet. `doctor` suggests `report` to an existing codebase that has no setting yet. A project moves to `enforce` when its codebase passes; no deadline moves it.

### 2. Deferring a rule

`standards.deferred` defers one rule's enforcement until a date or a work item:

```json
"deferred": [
  { "rule": "GHA-03", "until": "2026-11-02", "reason": "Workflow checks after the launch.", "decidedBy": "Ada Obi" },
  { "rule": "GHA-02", "untilItem": "SHOP-41", "reason": "Fix the known advisories first.", "decidedBy": "Ada Obi" }
]
```

- **A deferred rule still applies everywhere but CI.** Reviews and `standards_for_file` still apply it, so new code follows it. Only its enforcement reports instead of blocking, as in section 1.
- **A job enforcing several rules reports only** while any of them is deferred, since one run of the tool checks them all.
- **`doctor` lists every deferral** with its reason and when it ends. It warns a week before the date, and again once the date has passed or the item is done. Enforcement then returns at the next `render`.

This is different from an exception (`standards.exceptions`), which sets a rule aside entirely, reviews included.

### 3. Checks the project already runs

Before writing a job into the security workflow, `render` looks for the job's tool in the project's own workflows: gitleaks, osv-scanner, zizmor, Semgrep, SSLyze or ZAP. When it finds one, it leaves the job out, and `doctor` says so:

> GHA-01 is covered by .github/workflows/ci.yml, which runs gitleaks.

When the project covers a rule with a different tool, such as Trivy for dependencies, it says so in `standards.coveredBy`, and the job is left out the same way:

```json
"coveredBy": [{ "rule": "GHA-02", "by": ".github/workflows/ci.yml", "reason": "Trivy scans the dependencies and fails on critical findings." }]
```

`doctor` checks that the file named exists.

### 4. render says what it wrote

Every enforcement file `render` creates or changes is listed with what it enforces, in which stage, and what's covered elsewhere:

> .github/workflows/peer-ai-security.yml created: workflows (GHA-03, GHA-04) and code (GHA-05), reporting only. Secrets (GHA-01) is covered by .github/workflows/ci.yml.

The security workflow's header says when its jobs only report, and asks for a job to be made required only once it enforces. `.peer-ai/enforce/ruff.toml` gains a header that explains it: Ruff reads it only when the project's own Ruff settings `extend` it, and it adds rules, never replacing the project's.

### 5. Suggested profiles and traits are adopted

`init` and `migrate` add the profiles and traits `assess` suggests to the config. When asking questions, they show each one, with why it was suggested, and add it unless the person says no. `--yes` takes them all. Because an existing codebase starts in `report`, adopting a profile never turns its CI red.

`doctor` warns about a suggestion the config hasn't taken up:

> assess suggests the python-fastapi profile (api uses FastAPI) and the money trait (stripe in apps/api/requirements.txt). Add them to standards.profiles and project.traits, or list them in declined, with why.

A new top-level `declined` records a decision not to take one up, so the warning stops: `[{ "profile": "python" | "trait": "money", "reason": "…" }]`.

### 6. Versions that drift

- **`next_work`** compares the version of the MCP server running with the version the project pins. When they differ, it reports a setup problem: "The Peer AI server running is 1.0.0-next.3, and the project now uses 1.0.0-next.4: reconnect your AI tool to Peer AI, so its tools and CI agree."
- **`doctor`** reports the same when the command run is a different version from the one the project pins.
- **The README gains "Updating while agents work":** let agents finish or pause, update and merge, reconnect each AI tool, then resume. `next_work` tells any agent still on the old version.

## Compatibility

Minor. The config gains four optional settings: `standards.enforcement`, `standards.deferred`, `standards.coveredBy` and a top-level `declined`. A config without `enforcement` keeps today's behaviour. A project whose own workflows already run one of the security tools stops getting the duplicate job at its next `render`. `init` and `migrate` write more into a new config than before: the stage, and the suggested profiles and traits.

## Drawbacks

- **Report-only can last forever.** Nothing forces a project to `enforce`; `doctor` keeps saying it's reporting only, so the choice stays visible.
- **Finding a tool by name can be fooled,** for example by a commented-out job. `doctor` names the file it relies on, so a person can see it.
- **Existing violations still have to be fixed** before a rule can enforce. A baseline that fails only on new violations is left for later (see Open questions).

## Alternatives

- **An exception with an end date.** It exists, but it sets the rule aside in reviews too, so new code would ignore it until the date.
- **Dropping the profile.** It loses the profile's guidance for files as well as its enforcement, as the project's build agent pointed out.
- **Starting every project in `report`.** A new project has no violations to grow out of, and enforcing from the first commit is cheaper than adopting later.

## Open questions

- **Baselines of existing violations.** ESLint's bulk suppressions, gitleaks' baseline and Semgrep's baseline commit would let a rule fail only on new violations. Proposed: a later change, tool by tool, once projects have used the stages.
- **Should `doctor` suggest moving to `enforce`** once nothing reported fails? Proposed: yes, when CI's last run of every job passed. That needs the job results, so it comes later.
