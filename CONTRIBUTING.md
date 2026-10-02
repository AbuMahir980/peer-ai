# Contributing to Peer AI

Thanks for helping. Peer AI is built on `main`: open pull requests against it. The v0 playbook stays available at the tag `v0.1.0`.

## Ways to help

Contributions are open. Good first ones:

- **Add a stack profile.** Say how to follow the core rules in a stack Peer AI doesn't cover yet, and which tool enforces each automatic rule. See [adding a profile](packages/standards/README.md#adding-a-profile-or-a-profile-rule).
- **Add a rule, with its eval.** Write a rule a careful team follows that the standards miss, and plant a problem in a practice project that proves a review finds it. See [adding a rule](packages/standards/README.md#adding-or-changing-a-rule) and the [evals](evals/README.md).
- **Add a practice project.** Build a small, made-up project in [`fixtures/`](fixtures/README.md) of a shape the others don't cover, with problems planted for the evals.
- **Connect another AI tool.** `peer-ai render` sets up Claude Code, Codex, Cursor, GitHub Copilot and Gemini CLI: their instructions, Peer AI's skills, and its MCP server, the connection a tool uses to call Peer AI. Another tool means teaching `render` where that tool reads each one.
- **Report where Peer AI got something wrong.** Use the *Workflow defect* issue form and describe the project's shape: its stack, whether it had an API, whether its design already existed, and whether it was new or existing. Most defects so far only showed up on a project of a different shape.
- **Discuss a proposal.** Significant changes go through an [RFC](rfcs/README.md).

## The one hard rule

Peer AI grew out of real client work, and none of that work may appear here. Never commit client names, private project names, or details from a real project, including in commit messages. Examples, fixtures and tests use fictional domains.

CI enforces this with a forbidden-terms check that reads a private list. If it flags your pull request, it tells you the file and position; replace what it found with a neutral or fictional name. Until the first release, the check can't run on pull requests from forks, because they don't receive the list; a maintainer runs it for you before merging.

## Development setup

You need Node 24 (see `.nvmrc`) and pnpm 12. If pnpm isn't installed, `npx pnpm@12.6.0` works in its place.

```bash
pnpm install
pnpm verify
```

## Conventions

- **TypeScript, strictly.** Node runs `.ts` files directly, so use only syntax that can be stripped: no `enum`, `namespace` or parameter properties.
- **Tests sit next to the code** as `*.test.ts`, and every change comes with tests.
- **Exact versions.** Dependencies are pinned without `^` or `~`, and GitHub Actions are pinned to a commit.
- **Conventional Commits.** Use `feat:`, `fix:`, `docs:`, `build:`, `chore:`, `refactor:` or `test:` with a short description. Add a scope where it helps, such as `fix(skills):` or `feat(standards):`.
- **LF line endings** everywhere. `.gitattributes` and `.editorconfig` handle this.
- **Stack-agnostic by default.** Workflow text never names a framework, bundler or platform as an instruction, only as an example. Every early defect in v0 was the playbook assuming a web stack.

## Versions

Every change to a published package comes with a changeset (`pnpm changeset`). Write it for a person deciding whether to update: say what changes for a project that already uses Peer AI, such as a new file `render` writes, a rule that's new or different, or a skill that reviews differently. Pick the level by what a user of Peer AI would notice:

| Level | For |
|-------|-----|
| Patch | Fixes that don't change what an activity, skill or rule asks for |
| Minor | New skills, profiles, rules or commands, and compatible changes to wording or behaviour |
| Major | Changes to the config or state schema, a skill's output format or rule IDs, or removed or renamed commands. A major version ships with a migration. |

The five packages share one version number. Until 1.0.0, pre-releases are versioned `1.0.0-next.N` and may still change without notice.

## Releases

A maintainer versions the packages in an ordinary pull request: `pnpm version-packages` turns the waiting changesets into new versions and changelogs, and renders the practice projects again, since `render` writes the exact version into each AI tool's settings. Once it merges into `main`, the release workflow publishes every package whose version npm doesn't have yet, then writes the version's release notes on GitHub from the changelogs (`scripts/release-notes.ts`). The changelogs also ship in each package. npm trusts that workflow instead of a token, and records where each version was built, so nobody can publish Peer AI from their own machine.

`pnpm release --dry-run` shows what would be published, without publishing anything.

**A new package** needs its first version published by a maintainer, since npm can't create a package through trusted publishing: `npm login`, then `pnpm release` from `main`. Then point npm at the workflow, once per package: `npm trust github <package> --file release.yml --repository AbuMahir980/peer-ai --allow-publish`. Until then, the release workflow skips it with a warning.

## Code of conduct

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).
