# RFC 0020: Records where the work is

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #243 |

## Summary

Peer AI keeps each work item on its branch, in whichever working copy has that branch checked out (RFC 0010). Four reports show where that stops matching how people work: a failing CI check that nothing reports, a record of done that never reaches the default branch, a file judged by the wrong working copy, and merged items that can only be closed all at once. This RFC shows each open item's CI in `next_work`, closes merged items where the record will reach the default branch, lets `standards_for_file` take a branch, and lets a person keep a merged item open.

## Motivation

From the projects that use 1.0 every day:

- **CI failed, and the person saw it first** (#226). An open item's pull request failed its integration tests, and another failed its secret scan. The ship gate did hold both back, since their verify couldn't pass. But nothing in `next_work`, `work_item` or the item said CI was failing, which job, or on which commit. A session only found out when it next ran `run_verify` or `advance_work_item`. And while a pull request is open, Peer AI's own gate check is red until the reviews are recorded, so a red gate on a draft is normal and says nothing.
- **Done never reached the default branch** (#233, #230). After a pull request merged, moving its item to done removed the item's file and reports and added its history line, but in the working copy where the merged branch was checked out. The branch had merged and been deleted, so the record never reached the default branch, where the item stayed at ship. The person had to carry the same changes onto another branch's pull request. Worse, the extra commit made the branch look unmerged to `close-merged`, which RFC 0013 added for exactly this. (That part is fixed in #242.)
- **The wrong working copy's config** (#236). An item's branch was checked out in its own worktree, whose config enforced what the main checkout's only reported. `standards_for_file`, served by the MCP server in the main checkout, judged files by the main checkout's config and lint settings, and said rules weren't enforced that were. `record_review` now uses the branch's working copy (#241); `standards_for_file` has no way to know which branch is meant.
- **All or nothing** (#230). `close-merged` listed 23 items as merged. Several had been left open on purpose, merged before ship at the owner's request with device checks still owed. With `--yes` it would have closed them all, and without it the only choice was all or none.

## Design

### 1. CI in view

`next_work` reads the open pull requests once per call, through gh, with `gh pr list --state open --json number,url,headRefName,headRefOid,statusCheckRollup`, and matches each open item to the pull request for its branch.

- **Each item with a pull request gets `pullRequest`:** its number and link, the commit CI ran on, and `checks`: `passing`, `pending`, or `failing` with each failing check's name and link. The current item has it in full. The one-line summaries have `ci: "failing: integration-tests"` or `ci: "pending"`.
- **A failing check is the next thing to do.** For an item whose pull request has a failing check, other than Peer AI's own gate, `next_work` gives the next action as "Fix CI: integration-tests, on 4f2a9c1". The MCP instructions ask the agent to tell the person.
- **Peer AI's gate says which red it is.** On a pull request, when the only problem is that the item hasn't reached ship, `peer-ai check` ends with what it's waiting for: "Waiting for: verify, code-review, qa-acceptance". `next_work` shows a failing gate as `waiting` while the item is short of ship, and as `failing` once it's at ship.
- **Offline, nothing changes.** Without gh, without a GitHub remote, or when gh can't be asked, `next_work` leaves `pullRequest` out and says nothing. The answer is cached on the machine for two minutes, so a session that calls `next_work` often doesn't call GitHub each time.

### 2. Closing a merged item where the record will land

An item whose branch has merged is closed in a working copy that isn't on that branch, so the record goes into the next pull request instead of a branch that's gone:

- **`advance_work_item` to done, and `close-merged`,** write the record (the history line, and the removal of the item and its reports) in the main checkout when the item's branch has merged and the main checkout isn't on it. If every working copy is on merged branches, they refuse, saying to check out another branch first.
- **The reply says where it went, and what to do with it:** "Recorded SHOP-12 as done in the main checkout. Commit it with your next pull request." On a project whose default branch takes changes only through pull requests, that's the next branch made from it, which carries the uncommitted record.
- **`next_work` lists records waiting to land** as `unlanded`: items closed in this working copy whose history lines aren't committed yet, so none is forgotten.

### 3. `standards_for_file` takes a branch

`standards_for_file` gains an optional `branch`, as `next_work` has. With it, the file is judged in the working copy where that branch is checked out: its config, its parts, its lint settings and their enforcement. Without it, it's the working copy the server runs in, as now. The skills that call it for a work item pass the item's branch.

`create_work_item` already writes into the working copy where its branch is checked out, and says where (`writtenTo`, #241). Its description says so.

### 4. Keeping a merged item open, and choosing what to close

- **An item can stay open after its merge, with why.** `update_work_item` takes `keepOpen: { reason, by }`, recorded on the item as `openAfterMerge`. `close-merged` and doctor's "looks merged" check leave such an item out, and list it as kept open, with the reason and who decided. Moving the item on removes it.
- **`close-merged` asks about each item.** Without `--yes`, it lists the merged items and asks whether to close all, choose one by one, or none. With `--yes`, it closes all except those named with `--skip <id>`, which can be given more than once.

## Compatibility

Minor:

- `next_work` gains `pullRequest` on the current item, `ci` in summaries, and `unlanded`. All are optional.
- `peer-ai check` adds a "Waiting for" line on a pull request.
- `standards_for_file` gains an optional `branch` input.
- The work item schema gains an optional `openAfterMerge`; `update_work_item` gains `keepOpen`.
- `close-merged` gains `--skip`, and asks about each item without `--yes`.
- A merged item's record is written in the main checkout instead of the merged branch's working copy. A project that relied on the old place wasn't getting the record onto its default branch anyway.

## Drawbacks

- **`next_work` calls GitHub.** It's one call, cached for two minutes, and nothing changes when it can't be made. But a session that was entirely offline-capable now reaches the network when it can.
- **An uncommitted record in the main checkout** can be forgotten, or carried into a pull request that's about something else. `unlanded` makes it visible, and a history line is a small, separate change in a diff.
- **`keepOpen` can be left on.** Moving the item on removes it, and doctor lists every item kept open, with who decided.

## Alternatives

- **Poll CI in the background.** A session can't be relied on to run anything between calls, and a watcher per item costs more than one call when it's needed.
- **Commit the record to the default branch directly.** Most projects take changes on their default branch only through pull requests, and a tool that pushes there would get round the very gate it adds.
- **A `close-merged` that never asks,** with only `--skip`. Listing and asking is how `close-merged` already works; choosing one by one is the smallest step from all-or-nothing.

## Open questions

- Whether only required checks should become the next action. gh's rollup doesn't say which checks a branch's rules require, so this RFC treats every failing check, other than Peer AI's own gate, as needing attention. Asking for the required ones would take a call per pull request.
