# @peer-ai/workflow

The vocabulary Peer AI is built on, and the schemas for the files a project keeps: `peer-ai.config.json` for its settings and customisations, and `.peer-ai/` for its state.

> Private for now. It is published once the CLI adds a build step in Milestone 2.

## What's here

| Path | Holds |
|------|-------|
| `src/ids.ts` | The fixed lists: 14 activities, 29 skills, supported tools, and the items on the project map |
| `src/config.ts` | The schema for `peer-ai.config.json` and for shared base configs, plus `mergeConfigs` and `resolveConfig` |
| `src/state.ts` | The schemas for `.peer-ai/map.json` and `.peer-ai/work/<id>.json` |
| `src/index.ts` | `validateConfig`, `validateConfigLayer`, `validateMap` and `validateWorkItem`, which return every problem with its location |
| `schemas/` | The same schemas as JSON Schema, generated, for editors and non-TypeScript tools |
| `examples/` | Fictional projects, one per shape (see below) |

## `peer-ai.config.json`

One file replaces everything a project used to get by editing or patching the playbook's own files. Point `$schema` at `schemas/config.schema.json` and an editor will autocomplete every key and flag mistakes as you type.

Only `version`, `project.name` and `tracks` are required. This is a complete config:

```json
{
  "version": 1,
  "project": { "name": "Weekend Planner", "stage": "prototype" },
  "tracks": [{ "id": "app", "kind": "web", "status": "active" }]
}
```

| Key | What it sets |
|-----|--------------|
| `extends` | A shared base config to inherit, such as a studio's defaults. The project's values win; objects merge key by key and lists are replaced. |
| `project` | Name; stage (`prototype`, `mvp`, `production`), which sets how strict the gates are; origin (`new` or `existing`); team (`solo` or `team`) |
| `tools` | Which AI tools to render instructions for |
| `design` | Whether designs exist, are still to be produced, or there are none; where they live; whether they are authoritative |
| `tracks` | Each part of the system. See below. |
| `apis` | Each interface between parts, or to a third-party service: its kind, which track provides it, and where its contract comes from |
| `environments` | Such as staging and production |
| `repo`, `tracker`, `commands` | Git host, remote, branch naming, commit style, merge policy; the issue tracker; the verify command |
| `delivery` | Whether CI already exists. If it does, Peer AI extends it and never adds a second pipeline. |
| `standards` | Core principles on or off, stack profiles, the project's own standards documents, and which side wins a conflict |
| `compliance` | Where the product operates, its industries, and the rule packs that apply |
| `rules` | Project rules every activity respects, wherever they are written |
| `models` | `none`, `tiers`, or `pinned` with the project's own model names. Model names live only here, never in Peer AI itself. |
| `gates` | The finding severity that blocks a merge |
| `capabilities` | Per skill: add-ons from other tools that feed it (`plugin:skill` or `/command`), extra checklists, notes |
| `activities` | Per activity: files to read first, and project-specific instructions |
| `docs` | Where docs live, whether to keep their structure, and where out-of-scope ideas go |

Every object is strict. A misspelt key, activity or skill is an error, never a setting that silently does nothing. References are checked too: a track can only consume an API that exists, use a track that exists, and deploy to an environment that exists.

### Tracks and APIs: any architecture

A track is one part of the system: a web app, a mobile app, a service, a shared library, infrastructure. Each has a kind, a stack, an optional `architecture` label (such as `layered`, `modular-monolith`, `microservice`, `feature-first` or `mvvm`), the platforms it ships to (`targets`), where it deploys, and a status:

| Status | Meaning |
|--------|---------|
| `active` | Being built or changed |
| `dormant` | Not started; its activities do not run |
| `frozen` | Exists and is documented, not redesigned |
| `retiring` | Being replaced by the tracks in `replacedBy`; its behaviour is the reference until then |
| `external` | Lives in another repository (`repo`); read here, never changed |

APIs connect tracks. Each has a kind (`http`, `graphql`, `rpc`, `websocket`, `events`, `in-process`, `package`, `cli`), the track that provides it (omitted for a third-party service), and a contract source (`openapi`, `asyncapi`, `graphql-schema`, `protobuf`, `types`, `docs` or `handwritten`). Tracks list the APIs they `consume` and the tracks whose code they `use`.

The examples show one project per shape:

| Example | Shape |
|---------|-------|
| `informal-prototype` | A solo prototype: three lines of settings |
| `web-app-with-api` | A web app and its API in one repository |
| `local-first-app` | No server; the boundary is an in-process interface to a shared core library |
| `existing-mobile-app` | A mobile rebuild on a frozen backend, replacing a retiring app |
| `multi-app-mobile` | Two mobile apps on different stacks, sharing a library, on one backend, with halal and allergen rule packs |
| `frontend-only` | A web portal whose backend lives in another repository, plus a hosted sign-in service |
| `microservices` | Several services with their own APIs and events, replacing a monolith |
| `studio/` | A shared base config, and a project that inherits it |

### Compliance and rule packs

`compliance` says where the product operates (`jurisdictions`: ISO 3166 codes such as `NG` or `US-CA`, or zone ids such as `eu` or `difc`), what it does (`industries`), and which rule packs apply (`packs`). A rule pack is any outside rulebook the software must follow: a law such as the NDPA, an industry standard such as PCI DSS, a religious or cultural standard such as halal, labelling rules such as allergens, or a platform policy such as the App Store's. The packs themselves arrive in Milestone 3.

## Project state

State is split across files so that parallel sessions never edit the same one:

- **`.peer-ai/map.json`** records what `peer-ai assess` found: each item on the map as present, partial, missing or not applicable, with the evidence behind it. An item found by reading the code rather than a document is marked `inferred` until someone confirms it.
- **`.peer-ai/work/<id>.json`** holds one file per work item: its kind, stage, the activities it has called, where work stopped, its last verify and reviews, and a one-line `next`.

A session finds its work item from the git branch it is on, so there is no shared "current phase" for two sessions to fight over. `next` is capped at 200 characters: the story belongs in `CONTEXT.md`.

## Changing the schemas

The Zod definitions in `src/` are the source. After changing one, regenerate the JSON Schema files:

```bash
pnpm --filter @peer-ai/workflow generate
```

A test fails if the committed files fall behind. Changing either schema needs an RFC; see [rfcs/README.md](../../rfcs/README.md).
