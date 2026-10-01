# RFC 0008: Moving a v0 project onto 1.0

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Proposal issue | #98 |

## Summary

A new command, `peer-ai migrate`, moves a project from v0's copied `peer-ai/` folder onto the package, as one change a person reviews before it merges. It converts what it can read with certainty: v0's project settings, a project's `phase-config.json`, the project's own standards documents and the state file. Whatever needs judgement, such as the project's edits to playbook files or text in `CLAUDE.md` that came from v0, it copies word for word into a migration notes file and a work item, so the AI tool works through each decision with the person and nothing is dropped silently. Second, the config settings v0's customisations map onto start reaching the AI tool: `render` writes models, add-ons, checklists, notes and inputs into the instructions. Today the config accepts these settings, but nothing reads them.

## Motivation

**Three real copies, three shapes.** v0 was installed by copying the playbook into a project, and every project then changed its copy in its own way:

- **A copy taken in June.** It is byte-identical to v0 at the time, with no record of which version it came from. Its `CLAUDE.md` was written by v0's setup, apart from a few filled-in lines. Its state file was saved by PowerShell with a byte-order mark, and its current phase, `phase2-planned`, is not a phase v0 has.
- **A copy of the last v0 version, pinned in `.upstream`.**
  - It has 33 of its 59 playbook files edited and 5 added. A `phase-config.json` and two PowerShell scripts stamp a model and a block of instructions into 24 phase files. Project rules were written into three rules files, and a box of project facts sits at the top of `AGENTS.md`.
  - Its `CLAUDE.md` mixes 181 lines of the project's own text, two sections copied from v0's `AGENTS.md`, and a heavily edited copy of v0's workflow driver.
  - Ten Claude plugin skills are named in the phase blocks.
  - One block already contradicts the file it was stamped into: the block says the backend is dormant, and the file now says it's live.
- **A third copy that tracks two parts of the system** in a state file v0 has no schema for, using phase names outside v0's list.

**v0 has no way out.** `peer-ai doctor` warns when a `peer-ai/` folder is left behind, and its fix is to move the project's changes into the config by hand, then delete the folder. That is the same manual work that made v0 costly to keep up to date. Done by hand, it is easy to lose a project rule buried in a phase file, or a setting only the pasted-in driver held.

**The settings have nowhere to land.** RFC 0001 maps every kind of v0 customisation to a config key: `models` for the model per phase, `capabilities.<skill>.also` for extra skills, `capabilities.<skill>.checklists`, and `activities.<activity>.inputs` and `notes`. The schema accepts all of them, but nothing passes them to the AI tool. `doctor` only checks that checklist and input files exist, and nothing reads models, add-ons or notes. A migration that moved the pinned copy's model choices and ten plugin skills into the config would make them disappear in practice. RFC 0001 promised that "a missing add-on is reported, never silently skipped", and today it is skipped without a word.

## Design

### 1. The command

```
peer-ai migrate [--dry-run] [--yes] [--name <name>] [--stage <stage>] [--team <team>]
```

| Situation | What `migrate` does |
|-----------|---------------------|
| No v0 copy found | Exits 1: nothing to migrate |
| `peer-ai.config.json` already exists | Exits 1: the project is already on 1.0, or half-migrated |
| Uncommitted changes in git | Exits 1, so the migration is one change of its own, and `git restore` undoes it whole |
| `--dry-run` | Prints what it would convert, write, move and delete, and the decisions it would leave, without changing anything |
| Otherwise | Asks `init`'s questions, filled in from what it found (`--yes` takes those answers), then migrates |

A v0 copy is a `peer-ai/` folder holding one of the files `assess` already recognises (`shared/00-setup.md` or `phase-config.json`), or a `.peer-ai-state.json` at the root.

`migrate` never commits, pushes or creates a branch. It ends by saying what it changed and what is left to decide, and asks the person, or the AI tool on their behalf, to commit the change on a branch and open a pull request. Exit codes follow the other commands: 0 done, 1 refused, 2 a usage error.

### 2. Which files the project changed

The package ships a fingerprint list: for every file in every v0 version, its path and a hash of its content, with line endings normalised so a Windows checkout matches. It holds hashes only, no text, and v0 will not change again, so the list is written once. A script builds it from v0's history.

Each file in `peer-ai/` is then one of three things:

- **v0's own, unchanged.** Its hash matches a v0 version of that path. It is deleted, since there is nothing in it to keep.
- **A file `migrate` understands:** `phase-config.json`, `.upstream`, and the scripts v0 projects added (`apply-phase-config.ps1`, `strip-model-switching.ps1`, `check-upstream.mjs`). These are converted as described below, then deleted.
- **The project's own work.** It is an edited v0 file, or a file v0 never had. It is listed in the notes with the command that shows the project's own history of it, `git log -p -- peer-ai/<path>`, so the person and the AI tool can find what the project changed and decide where it belongs. Its text stays in git history after the folder is deleted.

The `.upstream` pin, when there is one, names the v0 version the copy came from, and the notes say so. Its `repo` field names the repository v0 lived in at the time, which now belongs to 1.0, so `migrate` reads the pin but never fetches from it.

### 3. Settings it converts

**From the driver's Project settings table** (`## 0. Project settings`, in v0 from September 2026), wherever it was pasted:

| v0 row | 1.0 key |
|--------|---------|
| Verify command | `commands.verify` |
| Issue tracker | `tracker.kind`: GitHub, GitLab, Linear or Jira by name, otherwise `other` |
| Ticket prefix | `tracker.ticketPrefix` |
| Remote | `repo.remote` |
| Design reference | `design.reference`, when it names a path that exists |
| Branch naming | `repo.branchNaming` |
| Merge policy | `repo.mergePolicy`: `pull-request` or `local-merge` when the text says which |
| Model selector | Nothing: 1.0 has `models` instead |

A value still reading `[PLACEHOLDER: …]`, `none` or `none yet` is skipped. A value `migrate` can't map is listed in the notes, word for word.

**From `phase-config.json`.** Each key is a v0 phase file, and each phase file maps onto a 1.0 activity and, where there is one, the skill that does that work:

| v0 phase file | Activity | Skill |
|---------------|----------|-------|
| `shared/01-understand.md` | `understand` | `requirements-analysis` |
| `shared/02-architect.md` | `architect` | `architecture` |
| `shared/03-spec-system.md` | `specify` | `system-design` |
| `shared/04-spec-api-contract.md`, `backend/01-spec-endpoints.md` | `contract` | `api-design` |
| `frontend/01-spec-pages.md` | `specify` | `product-spec` |
| `shared/05-rules-shared.md`, `*/02-rules.md` | `standards` | none |
| `shared/06-issues.md` | `plan` | `issue-planning` |
| `*/03-build.md` | `build` | `implement-ticket` |
| `*/04-review.md`, `agents/review-prompt.md` | `verify` | `code-review` |
| `agents/security-audit-prompt.md` | `verify` | `security-review` |
| `agents/contract-check-prompt.md` | `verify` | `contract-check` |
| `*/05-test.md` | `test` | `test-strategy` |
| `agents/qa-prompt.md` | `test` | `qa-acceptance` |
| `shared/07-document.md` | `document` | `documentation` |
| `shared/09-pr-automation.md` | `delivery-setup` | none |
| `shared/00-setup.md`, `shared/08-dev-journal.md` | none: `init` and `migrate` do setup, and 1.0 has no journal | none |

- **Model lines** become `models` with the policy `pinned`. The model most phases name becomes `default`, and an activity whose phases name another model gets it in `byActivity`.
- **Block lines that name a plugin skill** (`` `plugin:skill` ``) or a slash command become add-ons: `capabilities.<skill>.also` for the phase's skill.
- **Every other block line** becomes a note: `capabilities.<skill>.notes` when the phase has a skill, `activities.<activity>.notes` when it doesn't. A line that says a part of the system is dormant marks that track `dormant` when `init` found it, and is listed in the notes when it didn't.
- **When a block's first line is no longer in its phase file,** the project has changed that file since the block was stamped in. The block isn't converted. Both texts go into the notes as a conflict for the person to settle.
- **When two phases map to one activity and disagree,** such as different models for the frontend and backend builds, the first is used and the difference is listed.

**The project's own standards.** Markdown files in a `standards` folder under `docs/`, and existing Markdown files the phase blocks name as standards or rules, become `standards.documents` entries:
- `role: addendum` when the file name says addendum, otherwise `standard`;
- `scope` set to a track when the name says frontend or backend and that track exists;
- with `standards.onExisting: "map"`.

The notes list each one for the person to confirm.

### 4. State

`.peer-ai-state.json` is read in any of v0's versions, with or without a byte-order mark:

| v0 field | What happens |
|----------|--------------|
| `ticketsInProgress`, `ticket` | Each becomes a work item. The id keeps a ticket key such as `PROJ-14`; an issue number such as `#12` becomes `<ticketPrefix or ITEM>-12`. The title comes from `ticketTitle`, the branch from `milestoneBranch`, and the stage from the phase: `prepare` before build, `build` during it, `verify` for review and test |
| `currentPhase`, `currentStep` | Become the in-progress work item's position. A phase v0 doesn't have, such as `phase2-planned`, is dropped, with a note quoting it |
| `ticketsRemaining` | Stay in the tracker, which already holds them. The notes list them |
| `ticketsCompleted`, `ticketsCancelled` | Nothing: the tracker and git history hold them |
| `lastVerifyResult` | Not carried over: 1.0 records only a verify it ran itself |
| `cycle`, `notes`, `pendingAgents` | Copied into the notes word for word |
| A non-standard `tracks` field | Each track's position becomes a work item on the matching 1.0 track when it names a ticket. Otherwise it is listed |

`migrate` then runs `assess` to write `.peer-ai/map.json`, and deletes the state file.

### 5. Instruction files

In `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` and `.github/copilot-instructions.md`:

- **The workflow driver** is moved into the notes word for word, once its settings table has been read. It runs from `# Workflow Driver` to its last line, recognised by its headings, since projects rewrap and annotate it.
- **Sections copied from v0's `AGENTS.md`,** recognised by their headings (such as `On every session start` and `The workflow`), are moved into the notes the same way.
- **Everything else is the project's own text,** and stays where it is.

v0's Cursor rules (`.cursor/rules/shared.mdc`, `workflow-driver.mdc`, `frontend.mdc`, `backend.mdc` and `docs-pdf-export.mdc`) are moved into the notes and deleted.

Moving rather than deleting means a section recognised by mistake costs nothing: it is in the notes, and the person puts it back. `render` then adds Peer AI's marked block, as in any project.

### 6. Everything else v0 left

- **Deleted:** the `peer-ai/` folder and the state file, once converted.
- **Removed:** `package.json` scripts that run a file inside `peer-ai/`.
- **Left alone and listed in the notes:**
  - `CONTEXT.md`, which is now the project's own document. v0's driver told the AI to read it at every session start, and 1.0 doesn't, so the notes ask whether to keep a line saying so in the project's own text.
  - `docs/peer-ai-feedback.md`, v0's local feedback log. The notes suggest sending each item still relevant through `draft_feedback` and `peer-ai feedback`.
  - v0's numbered documents in `docs/`, such as `docs/02-architecture.md`. `assess` maps them like any other document.
  - Lines in `.gitignore`, `.gitattributes` and linter settings that mention `peer-ai/` or `docs-pdf/`, and an `ai-review.yml` workflow from v0's PR automation.

### 7. The notes and the work item

`migrate` writes `docs/peer-ai-migration.md` with three parts:
- **What it converted:** each v0 setting and the key it became.
- **What it deleted.**
- **What needs a decision:** each item with its text quoted in full.

It also creates a work item:

```json
{
  "version": 1,
  "id": "migrate-v0",
  "title": "Finish the move from v0",
  "kind": "migration",
  "stage": "prepare",
  "next": "Go through docs/peer-ai-migration.md with the person, one decision at a time.",
  "acceptance": ["Each decision in docs/peer-ai-migration.md is made, and the file is deleted."],
  "sources": ["docs/peer-ai-migration.md"],
  "updatedAt": "2026-10-05T09:00:00+00:00"
}
```

`next_work` offers it at the start of the next session, so the AI tool picks it up without being asked. When every decision is made, the notes file is deleted and the item ships like any other.

### 8. The settings reach the AI tool

`render` adds to the instructions block, only for the keys a project sets. For example:

> Models: Fable by default; build: Opus. If a model isn't offered, use the most capable one available, and never a weaker model for a review.
>
> When you use `peer-ai-code-review`, also use `engineering:code-review` and `/code-review`. If one isn't available, tell the person; never skip it silently.
>
> `peer-ai-security-review` also checks against `docs/checklists/payments.md`.
>
> For `peer-ai-architecture`: Constraints already decided, do not reopen: …
>
> Before `specify`, read `docs/design/brief.md`.

With `models.policy` set to `tiers`, one line says that a review never runs on a weaker model than the build. With `ifUnavailable: ask`, the first line asks the person instead of choosing. `doctor`'s check that `render`'s output is current covers these lines too.

## Compatibility

Minor. `migrate` is a new command, and nothing changes for a project until someone runs it. `render`'s output gains lines only in a project that sets models, add-ons, checklists, notes or inputs; no practice project does, and a project that does gets what it asked for. `doctor`'s fix for a leftover v0 folder becomes "Run `npx peer-ai migrate`".

## Drawbacks

- **Prose is guessed at.** Phase blocks and instruction files are free text, so `migrate` can place a line in the wrong key or miss a copied section. Everything it moves is copied word for word into the notes, and the result is a pull request a person reviews.
- **The instructions grow.** A project with many notes pays for them in every session's context. That is the cost of the settings having an effect at all.
- **The migration ends with a work item, not a finished state.** The person still makes the decisions only they can make. The work item makes that step visible instead of leaving it to memory.

## Alternatives

- **A migration skill only, with the AI tool doing everything.** It needs less code, but no two runs would be the same, it couldn't be tested against real copies, and AI tools skim long files, which is how reviews miss things. Here the AI does only the judgement calls, with each one written down.
- **Diffing each edited file against v0's text.** That needs v0's full text in the package, or a download from a repository that is now private. The project's own git history already holds every change it made, and the notes point there.
- **Turning every remaining ticket into a work item.** The tracker already holds the backlog, and a work item carries the plan for work in progress. A dozen empty items would crowd `next_work`.
- **Putting every customisation into one addendum.** That is simpler, but it loses the structure. A model per activity and an add-on per skill are things Peer AI can check and report on, which free text isn't.

## Open questions

- **Should `migrate` create the branch and commit?** Proposed: no. It leaves an uncommitted change, as `render` does, and the person or the AI tool commits it.
- **Copies from before 15 June 2026,** when the folder was still called `.workflow/`. Proposed: not supported, since none are known to be in use.
- **Should `doctor` fail, not warn, on a leftover v0 folder once `migrate` exists?** Proposed: it stays a warning, since a project may keep the folder while it works through the notes.
