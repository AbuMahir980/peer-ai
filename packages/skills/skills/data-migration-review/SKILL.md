---
name: data-migration-review
description: Reviews changes to stored data (database migrations, and data kept on a device across app updates) for anything lost, broken or left behind, against Peer AI's rules, proving each was checked. Use when a change adds a migration or changes stored data.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-domains: data
  peer-ai-rules: API-06 SYS-05 REL-08 MOB-06
---

# Data migration review

Check every change to stored data in scope against every rule in [rules.md](references/rules.md), and record a report that proves what was checked. A lost row or a lost note can't be taken back, so this review reads every step between the data as it is and the data as it will be. The report is the output: don't fix anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the work item's data changes, or every migration and store
- [ ] 2. Inventory: every migration, store, version and reader of the data
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review every migration, schema, model and storage change its branch made (`git diff --name-only <base>...HEAD`), and all the code that still reads or writes the data it changes. If its reply has `migrationCollisions`, other open items' branches also add a migration in the same folder: say in the report's summary which, and that whichever merges second needs its migration re-parented, then reviewed again. When one is `certain`, merging both makes two heads, so make it a finding.
- **The whole project:** every migration from the first, and every store, on the map from the peer-ai MCP tool `project_map`. Its `data-model` item names them.

Read the data model document first where there is one, and list it in the report's `inputs`.

## 2. Inventory

List every change to stored data, and every reader, from the code, with an id, a kind and its file and line:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `migration` | `migration:0004_split_name` | Each database migration, in order |
| `device-version` | `device-version:bookings-db-v3` | Each version of data kept on a device, such as a browser database's version or a storage key's shape |
| `store` | `store:bookings` | Each table, collection, key or file store the changes touch |
| `reader` | `reader:GET /bookings` | Each piece of code that reads or writes a changed store, including older app versions still in use |
| `field` | `field:bookings.notes` | Each field added, removed, renamed or retyped |

For each change, write down the data before, the step, and the data after. A table, column or key that disappears must say where its data went.

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the files in scope. It returns the rules that apply at the project's stage.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here, such as REL-08 for data that also lives on a server. The line says why.

## 4. Check

[checking.md](references/checking.md) says how to check each rule, on a server and on a device, and the usual false alarms.

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the data is kept, such as "0005_copy_notes.sql copies notes into mechanic_notes before 0006 drops notes".
- **A failure is a finding:** what's lost or broken, for whom, the file and line, and a fix. Its severity is its rule's, from [severity.md](references/severity.md). Losing data people can't recreate is critical (DATA-03).
- **Every change, not a sample.** Each migration and each device version is checked.
- **Readers too.** After each change, check every reader still finds the data where it looks: a column the API still selects, a key the app still reads.
- **Only what the code shows.** When the proof lives where you can't see it, such as data already in production, the line is `not-checked` with that reason.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/data-migration-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `data-migration-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `data-migration-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: the result, each finding's severity and title, and what wasn't checked and why. Offer to turn the findings into work items.
