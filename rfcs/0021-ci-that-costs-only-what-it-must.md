# RFC 0021: CI that costs only what it must

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #249 |

## Summary

Peer AI's records are commits, and each push re-ran a project's whole CI, while its gate failed every pull request whose work wasn't finished. This RFC has the gate skip draft pull requests, has an item's records go up in one push after CI has run on the code, and has the workflows render writes skip pushes that change only Peer AI's records.

## Motivation

From a project that uses 1.0 every day, measured over one week, with a second project showing the same (#247):

- **Records re-ran CI on unchanged code.** The project's CI takes about 26 runner-minutes a push; Peer AI's gate takes about 12 seconds. A normal item pushed three times: the code, which needs CI; the review records, so that `run_verify` from CI had a result on the latest commit; then the verify record. The last two re-ran the full CI on identical code. On a private repository, that's GitHub Actions minutes for nothing.
- **"Done" had a pull request of its own.** Eleven pull requests that only recorded "done" were merged, each running the full CI twice: once on the pull request, and once on the default branch after the merge.
- **A red cross on unfinished work.** Of the last 200 workflow runs, 33 failed, and 29 of those were Peer AI's gate on pull requests whose item wasn't at ship yet, against 4 real failures. To the owner, the client and anyone looking at the repository, it reads as constantly broken pull requests.

Two parts are already settled: a verify carries across commits that change only `.peer-ai/` (#248), and RFC 0020 closes a merged item into the next pull request instead of one of its own.

## Design

### 1. The gate skips draft pull requests

The gate's workflow, which render writes, runs on a pull request when it's opened, updated, reopened, or marked ready for review, and its job runs only when the pull request isn't a draft:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
jobs:
  peer-ai-check:
    if: github.event.pull_request.draft == false
```

A draft can't be merged, so skipping it lets nothing through; the gate runs in full the moment it's marked ready. GitHub shows a skipped job as skipped, not failed. The instructions render writes say to open a pull request as a draft while its item is short of ship, and to mark it ready when the item reaches ship.

A project that wants the gate on drafts too sets `gates.drafts` to `check`. The default is `skip`.

### 2. Records go up once

With a verify carrying across records-only commits, the reviews and the verify for a change can go up together:

1. Commit and push the change. CI runs on it.
2. Run the reviews, and record each with `record_review`.
3. Take the verify from CI with `run_verify` and `from: "ci"`, once CI has finished on the change.
4. Commit the records together, and push once.

The instructions render writes, and `implement-ticket`, follow this order. A project without `verifyCheck` verifies here, as now, and commits its records with the change.

### 3. The workflows render writes skip records-only pushes

The security pipeline render writes (RFC 0006) skips its scans when a push changed nothing outside `.peer-ai/`, the way the README shows a project's own CI can: the job still runs and reports, so a required check never waits, and its steps are skipped. The gate's own workflow keeps running on every push, since the records are what it checks.

## Compatibility

Minor:

- `render` writes the gate's workflow with the new triggers and the draft condition, and the security pipeline with the records-only skip. A workflow someone changed by hand is left alone, as now.
- The config gains `gates.drafts`, `skip` or `check`. Without it, drafts are skipped.
- A project whose pull requests are never drafts sees no change, except fewer failures if it starts using them.

## Drawbacks

- **A draft has no gate result** until it's marked ready. That's the point, but a team that reads the gate on drafts as a to-do list loses it there; `next_work` still lists what each item is waiting for, and `gates.drafts: check` keeps the old behaviour.
- **Skipping on records-only pushes needs history.** The pipeline's checkout fetches enough to compare with the previous push.

## Alternatives

- **A neutral or pending gate instead of skipping.** A job can only pass or fail. Reporting a commit status as pending would need write access to statuses, and would make the required check whatever Peer AI posts, not the job's result.
- **`paths-ignore` for records-only pushes.** GitHub leaves a required check that `paths-ignore` skipped waiting, which blocks the merge.
- **Treat an item at ship whose pull request merged as done, in the gate.** RFC 0020 already lands the record in the next pull request, without a pull request of its own.
