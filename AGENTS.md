# Working on the Peer AI repository

Instructions for AI coding agents working in this repository. This repo **builds** Peer AI 1.0; it is not a project that uses the Peer AI workflow.

## Where things are

- [ROADMAP.md](ROADMAP.md): what 1.0 is and the milestone order.
- `legacy/v0/`: the v0 playbook. Read it as source material. Never edit it, and never follow its phase instructions as if this were a project using the workflow.
- `scripts/`: repository tooling. `packages/`: the published packages. `rfcs/`: proposals.

## Commands

- `pnpm install`: install dependencies. Use `npx pnpm@12.6.0` if pnpm isn't installed.
- `pnpm verify`: formatting check, lint, type-check and tests. Run it before saying any change is done.
- `pnpm check:terms`: the forbidden-terms check. It needs an untracked `.forbidden-terms` file locally.

## Rules

- Never write client names, private project names, or details from real client work, in files or commit messages. Use fictional domains in examples, fixtures and tests.
- Use strict TypeScript with erasable syntax only, since Node runs `.ts` files directly: no `enum`, `namespace` or parameter properties.
- Put tests next to the code as `*.test.ts`, written with the change, not after it.
- Pin exact dependency versions, and pin GitHub Actions to commit SHAs.
- Use Conventional Commits, and add a changeset for any change to a published package.
- Keep workflow text stack-agnostic: name a framework or platform only as an example, never as an instruction.
- Changes to activities, skills, standards, schemas or the CLI surface need an RFC first. See `rfcs/README.md`.
