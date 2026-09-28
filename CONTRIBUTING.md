# Contributing to Peer AI

Thanks for helping. Peer AI 1.0 is being built on the `next` branch; `main` holds the v0 playbook until 1.0 ships.

## Ways to help right now

- **Report where v0 failed on your project.** Use the *Workflow defect* issue form and describe the project's shape: its stack, whether it had an API, whether its design already existed, and whether it was new or existing. Most defects so far only showed up on a project of a different shape.
- **Discuss a proposal.** Significant changes go through an [RFC](rfcs/README.md).
- **Code contributions** open once the Foundations milestone in [ROADMAP.md](ROADMAP.md) lands. Until then the package layout is still moving.

## The one hard rule

Peer AI grew out of real client work, and none of that work may appear here. Never commit client names, private project names, or details from a real project, including in commit messages. Examples, fixtures and tests use fictional domains.

CI enforces this with a forbidden-terms check that reads a private list. If it flags your pull request, it tells you the file and position; replace what it found with a neutral or fictional name. Until 1.0 launches, the check can't run on pull requests from forks, because they don't receive the list; a maintainer runs it for you before merging.

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
- **Conventional Commits.** Use `feat:`, `fix:`, `docs:`, `chore:`, `refactor:` or `test:` with a short description.
- **LF line endings** everywhere. `.gitattributes` and `.editorconfig` handle this.
- **Stack-agnostic by default.** Workflow text never names a framework, bundler or platform as an instruction, only as an example. Every early defect in v0 was the playbook assuming a web stack.

## Versions

Every change to a published package comes with a changeset (`pnpm changeset`). Pick the level by what a user of Peer AI would notice:

| Level | For |
|-------|-----|
| Patch | Fixes that don't change what an activity, skill or rule asks for |
| Minor | New skills, profiles, rules or commands, and compatible changes to wording or behaviour |
| Major | Changes to the config or state schema, a skill's output format or rule IDs, or removed or renamed commands. A major version ships with a migration. |

Before 1.0, packages are versioned `0.x`, and breaking changes may land in a minor version.

## Code of conduct

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).
