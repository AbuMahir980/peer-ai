# RFC 0001: Configuration instead of patching

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Implemented in | #1, #3 |

> This RFC is a record of decisions already made. The design was built and tested before the RFC process opened to contributors, and is written up here so that the reasoning behind `peer-ai.config.json` is public.

## Summary

Projects customise Peer AI through one validated file, `peer-ai.config.json`, and never edit or patch Peer AI's own files. The file can describe any architecture (a monolith, microservices, separate repositories, several mobile apps), any way of working (from a formal build to a solo prototype with no documents), and the rulebooks a regulated product must follow. Project state moves out of a single file into a `.peer-ai/` folder: a project map, plus one file per work item.

## Motivation

In v0, Peer AI was copied into each project. Every project that used it for real work had to change it.

- **How projects customised v0.** One project edited 33 of the playbook's 48 files. Others wrote scripts that re-applied their changes by pattern-matching the playbook's text after every upstream update. The scripts forked into three versions and failed silently twice. Once, a script patched a different folder from the one it shipped in. The other time, it matched nothing and still reported success.
- **What that cost.**
  - Every upstream update became a manual three-way merge; one touched 30 conflicting files.
  - One copy fell three months behind without anyone noticing.
  - Inside one project, a patched instruction and a hand-edited phase file ended up contradicting each other.
- **What the customisations had in common.** Every project made the same kinds of change, by hand:
  - which model to use in each phase
  - extra skills to use in each phase
  - where the project's own standards live, and that they win
  - which parts of the system are dormant
  - which files to read first
  - instructions only that project needed

A React Native rebuild of an existing production system found eight defects that were never sent upstream. This design answers seven of them:

| Defect found in use | Answered by |
|---------------------|-------------|
| Setup would overwrite a hand-written `CLAUDE.md` in an existing project | `project.origin: existing`. Setup adds a marked block and never overwrites a project's own text. |
| A phase named a plugin skill that was not installed, and nothing said so | `capabilities.<skill>.also`. A missing add-on is reported, never silently skipped. |
| The review and security agents defaulted to the fastest, cheapest model | `models`. A quality gate never runs on a weaker model than the build. |
| The security audit had no place for a domain checklist, such as payments or data-protection law | `capabilities.security-review.checklists`, and rule packs (below) |
| Frontend and backend sessions ran in parallel and conflicted on one state file | `.peer-ai/work/<id>.json`: one file per work item |
| The rules phase wrote a new standard when the project already had one | `standards.documents`, and `standards.onExisting` set to `map` or `revise` |
| There was no contract document to check against, because a generated OpenAPI file was the contract | An API whose `contract.source` is `openapi`, with `checkDrift` |
| The review phase assumed a route, controller, service and model layering, which is wrong for a modular monolith | Not answered here. Tracked in #2 for the standards work in Milestone 3. |

## Design

The full reference is in [`packages/workflow/README.md`](../packages/workflow/README.md). The principles:

1. **One file, validated.** Every object in the schema is strict, so a misspelt key, activity or skill is an error, never a setting that silently does nothing. References between parts are checked too.
2. **Peer AI's files are never edited.** Anything a project needs to change is a config key. The package can then be updated like any dependency.
3. **A fixed vocabulary.** Config is checked against Peer AI's 14 activities and 29 skills, so a name can't drift the way v0's phase names did.
4. **Each project fact lives in one place.** A backend marked dormant is marked once, in `tracks`, so two files can't disagree about it.
5. **Model names only in project config.** Peer AI ships model tiers or no guidance at all. Named models go out of date, and a project pins the ones it uses.
6. **Notes are the escape hatch.** Instructions only one project needs are free text, attached to the activity or skill they belong to.
7. **State is split into files.** `.peer-ai/map.json` records what the project has and what is missing, with evidence. Each work item has its own file. A session finds its work item from the git branch it is on, and the one-line `next` is capped at 200 characters.

### Any architecture

v0 assumed one repository holding a web frontend and one backend. The config instead describes a project as **tracks** connected by **APIs**, which fits every shape seen so far:

| Shape | How the config describes it |
|-------|-----------------------------|
| A monolith or modular monolith | One backend track providing one API, and the tracks that consume it |
| Microservices | A track per service, each providing its own APIs, plus `events` APIs between them |
| Frontend and backend in separate repositories | The backend is an `external` track naming its repository; the frontend consumes its API by URL |
| Several mobile apps, native or cross-platform | A mobile track per app, with `targets` such as `ios` and `android`, all consuming the same API |
| Shared code between apps | A `library` track, which the apps `use`; a change to it verifies both |
| A rewrite | The old part is `retiring`, with `replacedBy`; its behaviour is the reference until it is gone |
| Hosted and third-party services | An API with no `providedBy`, and its documentation as the contract |
| Libraries and command-line tools | APIs of kind `package` or `cli`: the public surface is the contract |

Each track can carry an `architecture` label, such as `layered`, `modular-monolith`, `microservice`, `feature-first` or `mvvm`. The project's own architecture decisions stay the source of truth; the label tells reviews and stack profiles what shape to expect, instead of Peer AI assuming one.

### Informal projects

Documents are a by-product, never an entry fee. Only `version`, `project.name` and `tracks` are required, so a solo prototype's config is a few lines. For an existing project with no documents, `peer-ai assess` reads the code and records what it finds, such as the architecture style, on the project map marked `inferred` until a person confirms it. The project's `stage` (`prototype`, `mvp` or `production`) sets how strict the gates are, and gaps become backlog items rather than blockers.

### Rule packs

`compliance` declares where a product operates (ISO 3166 codes such as `NG` or `US-CA`, or zones such as `eu` or `difc`), what it does (`industries`), and which **rule packs** apply. A rule pack is any outside rulebook the software must follow:

- a data protection law, such as the NDPA or the GDPR
- an industry standard, such as PCI DSS
- a religious or cultural standard, such as halal
- labelling rules, such as allergens
- a platform policy, such as the App Store's

Packs use the same rule format as the standards. Each rule cites the source it comes from, and each pack has a review date, so a pack that has not been reviewed for a year is flagged. Packs reviewed by someone qualified for that rulebook are marked *verified*; others are *community*. A new `compliance-review` skill checks the project's personal and sensitive data (recorded in a data inventory on the project map), its logs and its third-party calls against the packs that apply. Peer AI checks what the software does; it never certifies, and anything that needs a lawyer, certifier or scholar is flagged for one.

### How it was tested

The real customisation files of two projects were rewritten as config: 24 entries each, covering every phase and agent. Everything fitted. The test found one gap, a track's long-lived integration branch, which was added. Both configs were checked again against the final schema. Fictional examples cover every shape in the table above, and a test validates each one.

## Compatibility

New in 1.0. v0 projects move over with `peer-ai migrate` in Milestone 4, which converts both their customisations and their state. Any later change to either schema needs an RFC and is a major version, shipped with a migration.

## Drawbacks

- **Notes can still go stale.** They sit in one file next to the structured settings, so they are easier to review than scattered edits, but nothing checks them yet.
- **Strictness has a cost.** A schema change means projects update their config, which is why schema changes are major versions with migrations.
- **Split state means more files** in a project's repository.
- **Rule packs carry responsibility.** A wrong rule can mislead. Cited sources, review dates and verified status reduce that risk; they do not remove it.

## Alternatives

- **Keep copying the playbook, with a better patch script.** Rejected: projects would still edit Peer AI's files, and every update would still be a merge.
- **Overlay files that mirror the playbook's folder layout.** Rejected: every project would be tied to Peer AI's file structure, and renaming a file would break them.
- **One state file with a section per track.** Rejected: parallel sessions would still edit the same file.
- **A fixed list of supported architectures.** Rejected: there are too many styles, and a list would always be missing one. A label plus the project's own decisions scales.

## Follow-ups

For Milestone 3:

- **An add-on feeds Peer AI's own output.** A skill from another tool feeds the one document or report Peer AI's skill produces. It never writes a competing one: two architectures that disagree leave nobody sure which one is authoritative.
- **The Standards activity uses the design-system and accessibility skills.** Both projects did this in their rules phases.
- **The rule pack format and the first packs:** the NDPA, the GDPR, PCI DSS, and KYC and anti-money-laundering rules.
