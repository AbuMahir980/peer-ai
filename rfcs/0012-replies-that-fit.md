# RFC 0012: Replies that fit

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Proposal issue | #159 |

## Summary

Two of the MCP server's tools return far more than an AI tool can use. `next_work` returns every open work item in full, and goes over the MCP output limit once a project has a few dozen items. `standards_for_file` returns about 110 rules for a file outside every part, most of which can't apply to it. This RFC keeps each reply to what the AI tool needs now, with the rest one call away:

- `next_work` returns the current branch's item in full and every other open item as one line. A new read-only tool, `work_item`, returns any item in full.
- `standards_for_file` chooses rules by what the file is and the language it's in, as well as by the part it belongs to, and returns each rule's id, title and severity. The full text of any rule is one call away.

## Motivation

Both are from the first project to use 1.0 every day: a Python API, React Native apps and Terraform, with several agents working in parallel.

- **`next_work` goes over the MCP output limit** (#152). With 36 open items, it returned 113,490 characters. Of those, 98,600 were the open items, each in full (acceptance criteria, sources, position, reviews), and one item alone was 13,700. The AI tool got an error instead of a reply and parsed a saved copy with a script. The instructions `render` writes tell every agent to start each session with `next_work`, so every session hits it. Yet what an agent most needs is small: the item for its branch, and where it stopped.
- **`standards_for_file` returns rules that can't apply** (#113). A file outside every part gets every domain, so a CI workflow, a root build file, a secret scanner's settings and a Markdown register each got about 110 rules: roughly 57 KB per call, with requirements, design-system, mobile and screen rules among them. Across nine calls in one session, a small fraction of what came back could apply. The AI tool calls it before every edit, so the cost repeats all day.
- **Rules for another language** (#113, later on the same project). One TypeScript file in the React Native part got about 87,000 characters, over the MCP output limit, including the Python and FastAPI profiles' rules. A part that names no stack gets every profile the project lists, whatever the file's language.

Measured on next.7, with a project listing the `python-fastapi`, `react-native`, `typescript` and `github-actions` profiles:

| File | Rules | Characters |
|------|-------|------------|
| A screen, `apps/mobile/src/screens/Trip.tsx`, in a mobile part with no stack | 142, including 13 Python and 5 FastAPI rules | 49,108 |
| The same screen, with the part's stack set | 124 | 43,398 |
| `.github/workflows/ci.yml`, `Makefile` or `docs/register.md`, outside every part | 189 | about 65,400 |

Both grow with the project: more work items, more profiles and more traits mean longer replies, and the replies are read on every turn.

## Design

### 1. `next_work`: the current item in full, the rest in one line each

`next_work` keeps its shape, except for `open`:

- **`current`** stays the open item for the branch, in full.
- **`open`** lists every open item as a summary, most recently updated first:

  ```json
  { "id": "SHOP-41", "title": "Refunds for cancelled orders", "stage": "build", "branch": "feature/SHOP-41-refunds", "track": "api", "next": "Write the refund webhook test", "waitingFor": ["SHOP-38"] }
  ```

  `next` is the item's next action. `waitingFor` lists only the items it depends on that haven't shipped, and replaces the separate `waiting` map. A field with no value is left out.
- **At most 50 items are listed.** Beyond that, `more` gives how many weren't, and `work_item` reaches any of them by its id.

The reply then stays the same size, about 250 characters an item, whatever an item holds.

**A new tool, `work_item`,** read-only, returns one item in full by its id. It finds the item on its own branch, wherever that's checked out, as the other work-item tools do since RFC 0010. Its description tells the AI tool when to use it: "Before working on an item that isn't the current branch's, or to read another item's acceptance criteria."

### 2. `standards_for_file`: rules for what the file is, in brief

**What the file is.** `standards_for_file` first works out the file's kind from its path, then takes the domains for that kind:

| Kind | Recognised by | Domains |
|------|---------------|---------|
| CI pipeline | `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`, `.buildkite/` | delivery, security |
| Container or build file | `Dockerfile`, `*.dockerfile`, `docker-compose*.yml`, `compose*.yml`, `Makefile`, `justfile` | delivery, security, reliability |
| Infrastructure as code | `*.tf`, `*.tfvars`, Helm charts, Kubernetes manifests, Pulumi and CDK stacks, as `init` finds them | delivery, operations, reliability, security |
| Dependency manifest or lockfile | `package.json`, lockfiles, `requirements*.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, `pubspec.yaml`, Gradle and Maven files | security, code-quality |
| Database migration or schema | The files `assess` reads for the data model: migrations, Alembic, Prisma, Drizzle, models | data, security, privacy-compliance |
| Test | The files `assess` counts as tests | testing, code-quality |
| Document | `*.md`, `*.mdx`, `*.rst`, `*.adoc`, and anything under the config's `docs.dir` | none: a document follows its skill's template, which `check_document` checks |
| Tool settings | Settings files for linters, formatters and scanners, such as `.gitleaks.toml`, `.semgrepignore`, `ruff.toml`, `.eslintrc*` and `.editorconfig` | security, code-quality |
| Source code | Anything else | The part's domains, as today |

- **A file of a recognised kind gets its kind's domains,** wherever it is, so a migration in an API gets data, security and privacy rules, not every server rule, and a Dockerfile in a part still gets the delivery rules. A migration also gets the money and safety-critical domains, whose rules apply only with their traits.
- **Source code keeps its part's domains.** Outside every part, it gets the domains every file has (code quality, architecture, security, privacy, testing, and the trait domains, as today), not every domain.
- **The project's own documents** for the part are listed as today, whatever the kind.

**The language it's in.** A stack profile's rules apply only to files in its language, worked out from the profile its family starts from:

| Profiles | Apply to |
|----------|----------|
| `typescript`, and every profile built on it: `node`, `react`, `react-native`, `next`, `express`, `nestjs`, `fastify` | JavaScript and TypeScript files: `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs` |
| `python`, and every profile built on it: `python-fastapi` | Python files: `.py`, `.pyi` |
| `github-actions` | The CI pipeline's files |

A profile added later says which family it belongs to the same way, through the profile it builds on. Within its language, a profile's rules still follow the file's domains.

**A part that names no stack** gets every listed profile of the file's language, as today. `doctor` now warns about such a part when the project lists profiles, with the stack detection finds for it: "mobile names no stack, so every profile listed applies to its files. Set its stack, such as react-native, typescript, as detected." `next_work` passes the warning on, so the AI tool can fix the config.

The reply says which kind it found, so a surprising result can be explained: `"kind": "ci-pipeline"`.

**In brief.** Each rule in `peerAiRules` carries its id, title and severity:

```json
{ "id": "SEC-12", "title": "Secrets come from the environment, never from code", "severity": "critical" }
```

A new input, `ruleIds`, returns those rules in full: the rule, why it matters, the question to ask of a change, and how it's checked. It's for the rules the change actually touches. The tool's description says so: "Follow every rule listed. For the full text of the rules this change touches, call again with their ids in ruleIds."

### Sizes

With 36 open items, `next_work` would list them in about 9,000 characters, plus the current item in full, instead of 113,490 characters. For a CI workflow outside every part, `standards_for_file` would return 38 rules in about 3,400 characters instead of 189 rules in 65,400. For the screen in the mobile part with no stack, it would return 124 rules, none of them Python's, in about 10,900 characters instead of 142 rules in 49,100.

## Compatibility

Minor, but the replies of two MCP tools change shape:

- `next_work`'s `open` holds summaries instead of whole items, and its `waiting` map moves into each summary as `waitingFor`.
- `standards_for_file` returns fewer rules for most files: those outside a part, those of a recognised kind, and those in a language a listed profile isn't for. Each comes without its full text unless asked for.
- `doctor` warns about a part that names no stack while the project lists profiles.

The AI tool reads both through their descriptions on every connection, so nothing in a project needs changing. The skills and the instructions `render` writes are updated in the same release. A project picks the change up when it updates and reconnects its AI tools.

## Drawbacks

- **One more call** when an agent works on an item that isn't its branch's, or needs a rule's full text. Both are cheap, and rarer than the calls this saves.
- **Path-based kinds can misjudge a file,** such as a Python script in `migrations/` that isn't a migration. The reply names the kind it found, and the part's own documents still apply.
- **A rule's title is a summary.** An agent that follows titles without reading the full text of the rules its change touches could follow one too loosely. The tool's description and the skills tell it when to ask for the full text, and the reviews still check every rule against its full text.

## Alternatives

- **Truncating the replies at the limit.** It hides whatever falls past the cut, without saying what.
- **Paging.** Still costs a reply per page, and an agent rarely needs the second page of `next_work`.
- **Tagging each rule with the file kinds it applies to.** More precise than domains, but it changes how every one of the 197 rules is written (RFC 0003). Domains by kind get most of the gain now, and per-rule tags can follow where a domain is still too broad.
- **Leaving the full text in and filtering only by kind.** Most files would still get thousands of characters per call, before every edit.

## Open questions

- **Is 50 the right number of items to list?** Proposed: yes, with `more` saying how many weren't.
- **Should a person get the same list on the command line?** Proposed: later, in its own change; the AI tool is what hits the limit.
