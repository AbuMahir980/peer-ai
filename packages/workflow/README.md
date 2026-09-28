# @peer-ai/workflow

The vocabulary Peer AI is built on, and the schemas for the files a project keeps: `peer-ai.config.json` for its settings and customisations, and `.peer-ai/` for its state.

> Private for now. It is published once the CLI adds a build step in Milestone 2.

## What's here

| Path | Holds |
|------|-------|
| `src/ids.ts` | The fixed lists: 14 activities, 28 skills, supported tools, and the items on the project map |
| `src/config.ts` | The schema for `peer-ai.config.json` |
| `src/state.ts` | The schemas for `.peer-ai/map.json` and `.peer-ai/work/<id>.json` |
| `src/index.ts` | `validateConfig`, `validateMap` and `validateWorkItem`, which return every problem with its location |
| `schemas/` | The same schemas as JSON Schema, generated, for editors and non-TypeScript tools |
| `examples/` | Three fictional projects, one per shape: a web app with an API, an existing mobile app on a frozen backend, and a local-first app |

## `peer-ai.config.json`

One file replaces everything a project used to get by editing or patching the playbook's own files. Point `$schema` at `schemas/config.schema.json` and an editor will autocomplete every key and flag mistakes as you type.

| Key | What it sets |
|-----|--------------|
| `project` | Name, stage (`prototype`, `mvp`, `production`) and origin (`new` or `existing`). The stage sets how strict the gates are; `existing` means Peer AI reads what is there first and never overwrites it. |
| `tools` | Which AI tools to render instructions for |
| `shape.api` | `none`, `in-process`, `http`, `graphql` or `rpc`, and where the contract comes from: hand-written, OpenAPI, or types in the code |
| `shape.design` | Whether designs exist, are still to be produced, or there are none; where they live; whether they are authoritative |
| `tracks` | Each part of the system: its kind, path and stack, and whether it is `active`, `dormant` (not started) or `frozen` (exists, documented, not redesigned) |
| `repo`, `tracker`, `commands` | Remote, branch naming, commit style, merge policy; the issue tracker; the verify command |
| `delivery` | Whether CI already exists. If it does, Peer AI extends it and never adds a second pipeline. |
| `standards` | Core principles on or off, stack profiles, the project's own standards documents, and which side wins a conflict |
| `rules` | Project rules every activity respects, wherever they are written |
| `models` | `none`, `tiers`, or `pinned` with the project's own model names. Model names live only here, never in Peer AI itself. |
| `gates` | The finding severity that blocks a merge |
| `capabilities` | Per skill: add-ons from other tools to run alongside it (`plugin:skill` or `/command`), extra checklists, notes |
| `activities` | Per activity: files to read first, and project-specific instructions |
| `docs` | Where docs live, whether to keep their structure, and where out-of-scope ideas go |

Every object is strict. A misspelt key, activity or skill is an error, never a setting that silently does nothing.

## Project state

State is split across files so that parallel sessions never edit the same one:

- **`.peer-ai/map.json`** records what `peer-ai assess` found: each item on the map as present, partial, missing or not applicable, with the evidence behind it.
- **`.peer-ai/work/<id>.json`** holds one file per work item: its kind, stage, the activities it has called, where work stopped, its last verify and reviews, and a one-line `next`.

A session finds its work item from the git branch it is on, so there is no shared "current phase" for two sessions to fight over. `next` is capped at 200 characters: the story belongs in `CONTEXT.md`.

## Changing the schemas

The Zod definitions in `src/` are the source. After changing one, regenerate the JSON Schema files:

```bash
pnpm --filter @peer-ai/workflow generate
```

A test fails if the committed files fall behind. Changing either schema needs an RFC; see [rfcs/README.md](../../rfcs/README.md).
