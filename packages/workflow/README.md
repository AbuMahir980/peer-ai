# peer-ai-workflow

The vocabulary Peer AI is built on, and the schemas for the files a project keeps: `peer-ai.config.json` for its settings and customisations, and `.peer-ai/` for its state.

> Private for now. It is published with Peer AI's first release.

## What's here

| Path | Holds |
|------|-------|
| `src/ids.ts` | The fixed lists: 14 activities, 29 skills, supported tools, and the items on the project map |
| `src/config.ts` | The schema for `peer-ai.config.json` and for shared base configs, plus `mergeConfigs` and `resolveConfig` |
| `src/state.ts` | The schemas for `.peer-ai/map.json` and `.peer-ai/work/<id>.json` |
| `src/adoption.ts` | `adoptionOf`, which works out from the config which rules only report today (RFC 0011) |
| `src/report.ts` | The schema for review reports, the four severity levels, and `deriveResult`, which works out a review's result from its report |
| `src/index.ts` | `validateConfig`, `validateConfigLayer`, `validateMap`, `validateWorkItem` and `validateReport`, which return every problem with its location |
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
| `project.traits` | What the product is or does that switches on extra rules: `money`, `safety-critical`, `several-audiences`, `offline`, `real-time`, `uploads`, `ai-features`. `peer-ai assess` suggests the ones it finds evidence for. |
| `tools` | Which AI tools to render instructions for |
| `skills` | `commit`: whether to commit the skills `peer-ai render` writes, for AI tools that can't run a setup step first. By default they're left out of git, and each tool's setup step writes them. |
| `design` | Whether designs exist, are still to be produced, or there are none; where they live; whether they are authoritative |
| `tracks` | Each part of the system. See below. |
| `apis` | Each interface between parts, or to a third-party service: its kind, which track provides it, and where its contract comes from |
| `environments` | Such as staging and production |
| `repo`, `tracker`, `commands` | Git host, remote, branch naming, commit style, merge policy; the issue tracker; the verify command, and `verifyCheck`, the CI check that runs it, whose result counts as the verify (RFC 0013) |
| `delivery` | Whether CI already exists. If it does, Peer AI extends it and never adds a second pipeline. `gate`, true unless set to false, has `render` set up `peer-ai check` in CI (RFC 0009). |
| `standards` | Core principles on or off, stack profiles, the project's own standards documents, and which side wins a conflict |
| `standards.overrides` | A stack profile rule's default changed for this project, such as a larger size limit, with the reason |
| `standards.exceptions` | Rules the project sets aside, each with a reason, who decided, and an optional end date. `peer-ai doctor` lists them all, and warns when one has ended. |
| `standards.enforcement` | `report` or `enforce`: whether the tools that enforce the stack profiles fail a build, or only report while an existing codebase catches up. Without it, they enforce (RFC 0011). |
| `standards.deferred` | Rules whose enforcement only reports until a date (`until`) or until a work item is done (`untilItem`), each with a reason and who decided. Reviews still apply them. |
| `standards.coveredBy` | Rules the project's own CI already checks with a different tool, each with the file that does it and why, so Peer AI adds no second check |
| `compliance` | Where the product operates, its industries, and the rule packs that apply |
| `rules` | Project rules every activity respects, wherever they are written |
| `models` | `none`, `tiers`, or `pinned` with the project's own model names. Model names live only here, never in Peer AI itself. |
| `gates` | The finding severity that blocks a merge |
| `capabilities` | Per skill: add-ons from other tools that feed it (`plugin:skill` or `/command`), extra checklists, notes |
| `activities` | Per activity: files to read first, and project-specific instructions |
| `docs` | Where docs live, whether to keep their structure, and where out-of-scope ideas go |
| `updates` | How the project hears about new Peer AI releases: `notify`, true unless set to false, has `doctor` and `next_work` say when a newer one is out; `pullRequest`, false unless set, has `render` write a daily workflow that opens a pull request to update (RFC 0014) |
| `declined` | Stack profiles and traits `peer-ai assess` suggests that the project decided not to take up, each with why, so they aren't suggested again (RFC 0011) |

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

`compliance` says where the product operates (`jurisdictions`: ISO 3166 codes such as `NG` or `US-CA`, or zone ids such as `eu` or `difc`), what it does (`industries`), and which rule packs apply (`packs`). A rule pack is any outside rulebook the software must follow: a law such as the NDPA, an industry standard such as PCI DSS, a religious or cultural standard such as halal, labelling rules such as allergens, or a platform policy such as the App Store's. The packs themselves aren't built yet.

## Project state

State is split across files so that parallel sessions never edit the same one:

- **`.peer-ai/map.json`** records what `peer-ai assess` found: each item on the map as present, partial, missing or not applicable, with the evidence behind it. An item found by reading the code rather than a document is marked `inferred` until someone confirms it.
- **`.peer-ai/work/<id>.json`** holds one file per work item: its kind, stage, the activities it has called, where work stopped, its last verify and reviews, and a one-line `next`. It can also carry its plan (RFC 0005): a `goal`, `acceptance` criteria, the `sources` it implements, and the items it `dependsOn`, which must ship before it can.

- **`.peer-ai/reports/<work item>/<skill>-<time>.json`** holds a review's report: what it looked at, what it read first, every rule it checked and how each went, and every problem it found, with file, line and evidence. See [RFC 0002](https://github.com/AbuMahir980/peer-ai/blob/main/rfcs/0002-review-reports-and-evals.md).

A session finds its work item from the git branch it is on, so there is no shared "current phase" for two sessions to fight over. `next` is capped at 200 characters: the fuller story lives in the item's goal, acceptance criteria and sources, and in its review reports.

## Changing the schemas

The Zod definitions in `src/` are the source. After changing one, regenerate the JSON Schema files:

```bash
pnpm --filter peer-ai-workflow generate
```

A test fails if the committed files fall behind. Changing either schema needs an RFC; see [rfcs/README.md](https://github.com/AbuMahir980/peer-ai/blob/main/rfcs/README.md).

## Review reports

A review's result is worked out from its report, not taken on the agent's word. `deriveResult` decides it:

1. **fail** when an open problem is at or above the project's blocking level, `gates.blockOn` (critical unless the project sets it lower)
2. **incomplete** when a rule wasn't checked
3. **pass** otherwise

Fixed problems, and risks a person has accepted with a reason, never block.

A report can't stay silent about a rule: a pass must say what was checked, a fail must name the problem it found, and "doesn't apply" or "not checked" must give a reason. Every problem must belong to a failed check on the same rule.

| Level | Means |
|-------|-------|
| critical | It causes harm now: a security hole, data lost or exposed, a law broken, or the service going down |
| high | It is likely to hurt users or the business soon |
| medium | A real problem with limited reach |
| low | It makes the code harder to change safely |

