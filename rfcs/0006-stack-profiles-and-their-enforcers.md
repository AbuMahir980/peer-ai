# RFC 0006: Stack profiles and the tools that enforce them

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #74 |

## Summary

A stack profile becomes data in `@peer-ai/standards`, like the core: each of its rules names the core rule it carries out, the stacks and architectures it applies to, any number a project may change, and, for an automatic check, the tool setting that enforces it. Peer AI ships the settings for those tools: a shared ESLint configuration to extend, and files `peer-ai render` writes for tools that can't extend a package. Every automatic rule comes with an example that must fail and one that must pass, and the tests run the real tool on both. The first profiles are TypeScript, Node, React, React Native, Next.js, Express, NestJS, Fastify, Python, FastAPI, and a pipeline profile for GitHub Actions.

## Motivation

RFC 0003 split the standards into core, stack profiles and project add-ons, and wrote the core: 195 rules. It left the profiles, and three things they need were never decided.

- **Where a number goes.** The core says a component that grows large is doing two things; "150 lines" belongs to a profile, which a project can change in `standards.overrides`. Nothing holds that default today, so an override has nothing to change.
- **What enforces an automatic rule.** Of the 195 core rules, 46 are checked automatically: "a tool fails the build". The core can't name that tool, since it's the same in any language. Without profiles, those rules are written as automatic and checked by nobody.
- **The shape a project chose.** Issue #2, from the v0 playbook: its review expected route, controller, service and model on every backend, and one folder layout on every frontend. A modular monolith and a feature-first frontend had to break the rules to follow their own design. RFC 0003 moved those habits out of the core; they need somewhere to go that a project can pick up or leave, by its declared architecture.

The evals show the cost of the gap. security-review reported missing automatic checks on the practice projects, such as secret scanning (SEC-27), and could only report them: Peer AI had nothing to offer to fix them.

## Design

### 1. A profile is data

A profile lives in `packages/standards/src/profiles/<id>.ts`, checked against a schema when the package loads, like the core:

```ts
{
  id: "react",
  name: "React",
  prefix: "REACT",
  stacks: ["react"],             // detected stack tags it applies to
  extends: ["typescript"],       // profiles it builds on
  rules: ProfileRule[],
}
```

A profile rule has every part a core rule has (RFC 0003, section 3), and four more:

| Part | What it says |
|------|--------------|
| **Carries** | The core rule it carries out, such as `ARC-04`. Required: every stack rule traces back to a principle. |
| **Architectures** | Optional. The architecture labels it applies to, such as `layered`. A rule with none applies to every architecture. |
| **Default** | Optional. A number or a choice the project may change, with its unit, such as 150 lines. |
| **Enforcer** | For an automatic rule: the tool and the setting that checks it, such as ESLint's `max-lines`. |

A profile rule's id uses its prefix, such as `REACT-03`, and is never reused, like a core rule's.

### 2. Which profiles apply

- **The project lists them** in `standards.profiles`, which exists today. `peer-ai assess` suggests profiles from the stack it detects in each part, with the evidence, as it suggests traits, and never writes them into the config itself.
- **Per part.** A profile applies to a part whose stack includes one of its `stacks`, or when a profile that extends it applies: detection tags a part by its framework, so an Expo app is tagged `expo`, and gets the React and TypeScript profiles through `react-native`. A part that names no stack gets every listed profile. A rule with `architectures` applies only to parts whose `architecture` label is one of them. This is issue #2's fix: a layered backend gets the layering rules, and a modular monolith doesn't.
- **`standards_for_file`** returns the profile rules for the file's part, after the core rules, with the project's overrides applied.
- **An id with no profile yet,** such as `vue` today, is a warning from `peer-ai doctor`, not an error. The config keeps it, and the rules arrive when the profile does.

### 3. Tool settings, shipped and proven

**Shared configurations, where a tool can extend one.** A new package, `@peer-ai/eslint-config`, exports a function that reads `peer-ai.config.json` and returns the ESLint settings for the project's profiles, with its overrides applied:

```js
// eslint.config.js
import peerAi from "@peer-ai/eslint-config";
export default [...peerAi(), /* the project's own settings */];
```

**Files render writes, where a tool can't.** Tools such as Ruff and mypy read settings from a file, not a package. `peer-ai render` writes Peer AI's settings to `.peer-ai/enforce/`, such as `.peer-ai/enforce/ruff.toml`, and the project's own settings point to it, such as `extend = ".peer-ai/enforce/ruff.toml"`. Render never edits a project's own settings.

**Doctor checks the link.** `peer-ai doctor` checks that each automatic rule's tool is set up and uses Peer AI's settings, and prints the one line to add when it doesn't. An automatic rule nothing enforces is a warning at MVP and a failure at production, the same grading as a missing review (RFC 0004).

**Every automatic rule is seen to fail.** Each has two small examples, one that must fail and one that must pass, and the package's tests run the real tool on both. A setting that can't fail can't ship. This is RFC 0003's "see a check fail before trusting it", made a test.

### 4. The pipeline profile

The checks that run in CI are a profile of their own, per CI platform, starting with `github-actions`. Its rules carry the core rules a pipeline enforces:

| Carries | What the pipeline does |
|---------|------------------------|
| SEC-27 | Scans every change for secrets |
| DEL-03 | Checks dependencies against published vulnerabilities, on every change and daily |
| DEL-04 | Runs code scanning as a required check |
| DEL-01 | Pins each action to a commit |
| SEC-23 | Checks the TLS setup of each environment with a `url` |
| DEL-08 | Scans the running app in staging, never in production |

`peer-ai render` writes `.github/workflows/peer-ai-security.yml` when it's missing, with each action pinned to a commit. It refuses to overwrite a file someone changed, and says what to add instead, as it does for Copilot's setup steps today. The tools are chosen by three tests: open source, free for private repositories, and able to run without an account. Each choice is recorded in the profile with its version, and checked again for each release.

### 5. The first profiles

| Profile | Stacks | Extends |
|---------|--------|---------|
| `typescript` | typescript | |
| `node` | node, and through the profiles that extend it | typescript |
| `react` | react | typescript |
| `react-native` | react-native, expo | react |
| `next` | next | react, node |
| `express`, `nestjs`, `fastify` | express, nest, fastify | node |
| `python` | python | |
| `python-fastapi` | fastapi | python |
| `github-actions` | the repository's CI | |

Node's backend profiles are written as fully as FastAPI's. Other stacks follow the same pattern, and a new profile doesn't need an RFC (see `rfcs/README.md`).

## Compatibility

Minor, while Peer AI is `0.x`. The config gains nothing: `standards.profiles` and `standards.overrides` exist. New: the profile data and its generated pages, the `@peer-ai/eslint-config` package, the files render writes under `.peer-ai/enforce/` and the pipeline workflow, doctor's new checks, and profile rules in what `standards_for_file` returns. A project using Peer AI today gets suggestions and warnings, never a changed file of its own.

## Drawbacks

- **Tools change.** Setting names and versions move with each tool's releases. The failing and passing examples catch a setting that stops working, but someone must update it.
- **More to maintain.** Eleven profiles, each with examples, is real work, and a stack with no profile gets only the core.
- **A second place for settings.** A project with its own ESLint or Ruff settings now combines them with Peer AI's. Doctor says how, but a conflict between the two is the project's to settle.

## Alternatives

- **Profiles as prose, as in v0.** Rejected for the reason RFC 0003 gives: tools can't cite, filter or check prose.
- **Render writes the whole tool configuration.** Simpler to start, but it overwrites what a project already has, and a project would soon stop running render.
- **Point at existing shared configurations only,** such as a well-known ESLint preset. Useful as a base inside ours, but they don't trace back to Peer AI's rules, their numbers can't be changed through `standards.overrides`, and they cover one tool each.

## Open questions

- **Which tools for the pipeline profile.** Candidates are OSV-Scanner for dependencies, Gitleaks for secrets and Semgrep for code scanning. Each is checked against section 4's three tests before it's chosen.
- **Other CI platforms.** GitLab's pipeline profile is the next one, when a project on it needs it.
