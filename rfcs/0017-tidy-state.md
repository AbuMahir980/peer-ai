# RFC 0017: Tidy state

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #184 |

## Summary

Peer AI's own files only grow. Every work item keeps its file after it's done, every review leaves its report, and a part of the project that's retired can't be removed without breaking the items that named it. This RFC keeps only live state in the working tree, and lets git be the archive:

- When a work item is done or cancelled, its file and its reports leave the tree in that same change. It becomes one line in a monthly history file, which merges cleanly when several branches close items at once.
- A closed item's full record and reports are read back from git when someone asks.
- Recording a review again removes the report it replaces.
- A part of the project can be `retired`: it needs no folder, its items stay readable, and the instructions say it's retired.
- A work item's part can be changed, and cancelling an item never fails because of its part.

## Motivation

From the first project to use 1.0 every day:

- **Files pile up** (#119). After one day of normal use, Peer AI had added 24 work-item files, 18 review reports totalling 1.2 MB (the largest 552 KB), and 31 files committed to the default branch. Closed items and their reports sit next to open ones, so the person running the project assumed finished work was lingering. At this rate, a few months means thousands of files. The verdict: a tool that promises to reduce clutter becomes a source of it. An archive folder alone wouldn't help, since it grows without limit and holds what git already has.
- **A retired part breaks its items** (#108). A project retired one of its apps and removed its track from the config. Its work item became invalid: the gate failed, and every tool call on it failed with "there is no track", including cancelling it. `update_work_item` can't change an item's track, though the gate's message said to. The workaround was to keep the track as `external` with a repository name, which misdescribes the project to every future reader of the instructions. A `retiring` track failed too, because its folder no longer exists.

## Design

### 1. Closed work leaves the tree

When a work item moves to `done` or `cancelled`, with `advance_work_item` or `peer-ai close-merged`:

- **Its file is removed** from `.peer-ai/work/`.
- **Its reports folder is removed** from `.peer-ai/reports/<id>/`.
- **It becomes one line** in `.peer-ai/history/<year>-<month>.jsonl`, for the month it closed. The line holds:
  - its id, title, kind and part;
  - its final stage and when;
  - how it closed (shipped, merged, or cancelled with why);
  - the commit it was verified on and the result;
  - each review's result, open counts and report path;
  - the last commit that held its full file.

The removal and the line are in the same change, so the record is never half-moved.

`render` adds `.peer-ai/history/*.jsonl merge=union` to its block in `.gitattributes`. Lines appended on different branches then merge without conflict: each closed item is a line of its own, and order doesn't matter.

### 2. Git is the archive

- **`work_item` (RFC 0012) and `peer-ai work show <id>`** find a closed item in the history. With `full`, they read its last full file, and its reports, from the commit the line names.
- **Dependencies resolve closed items from the history,** so an item depending on a shipped one never sees "isn't a work item".
- **`next_work`'s open list,** the gate and the map read only live files, so they stay small however long the project runs.

### 3. A review's report is replaced, not kept beside

Recording a review for a skill that already has one replaces the item's entry, as today, and now also removes the replaced report's file when it's in the item's reports folder. A failed review fixed and re-reviewed leaves one report, not two. Git keeps the old one.

### 4. Tidying a project that already has closed files

`peer-ai doctor` warns when `.peer-ai/work/` holds done or cancelled items, or `.peer-ai/reports/` holds folders of items that are gone: "24 closed work items still have files. Tidy them with npx peer-ai tidy." `peer-ai tidy` moves each into the history as above, after listing them. Commit the change on a branch.

### 5. Retired parts, and moving an item between parts

- **A track can be `retired`.** It needs no folder, `doctor` doesn't look for one, and the instructions list it as retired: "web (retired): no longer part of the product". Its items stay valid and readable. New items can't be created on it.
- **`update_work_item` can change an item's `track`** to any track that isn't retired or external, and `peer-ai work move <id> <track>` does the same from a terminal.
- **An item's track is checked when it's set,** at creation or by a move, not on every save. Cancelling, advancing or updating an item whose track was removed or retired never fails because of it. `peer-ai check` and `doctor` warn about an open item whose track is gone, saying to move or cancel it.

## Compatibility

Minor:

- The state gains `.peer-ai/history/`. A track's status gains `retired`, and `update_work_item` gains `track`.
- Two commands arrive: `tidy`, and `work` with `show` and `move`.
- `render` adds a line to its `.gitattributes` block.

A project's existing closed items stay where they are until it runs `peer-ai tidy`, and everything reads them as before. After that, closing an item removes its files as part of the move.

## Drawbacks

- **A closed item's details move out of sight.** They're one command away, and the history line keeps what most questions need.
- **The union merge** keeps every line from both sides. Two branches closing the same item would leave two lines. The history is read newest first by id, so the later line wins.
- **Reading old reports needs git history,** so a shallow clone can't. The history line still has the results.

## Alternatives

- **An archive folder.** It moves the clutter and grows without limit, holding what git already has.
- **One history file for all time.** It grows without limit too. Monthly files stay small, and old months are rarely read.
- **Deleting closed items outright.** Dependencies and audits need to know what shipped. A line keeps that for a fraction of the size.

## Open questions

- **Should the monthly files be compacted further after a release,** for example into one file per release? Proposed: not until a project's history is large enough to matter.
