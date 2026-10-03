# RFC 0018: Seeing across the project

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Proposal issue | #186 |

## Summary

Peer AI judges most things one file or one branch at a time. Two problems on a real project needed it to look across the whole project:

- the map counted documents as present because they existed, though they were stale, duplicated or about parts long gone;
- several branches each added a database migration on the same parent, and nothing noticed until they were merged together.

This RFC has the map judge a document's evidence, not just its existence, and has Peer AI notice when open work items will collide on migrations.

## Motivation

From the first project to use 1.0 every day:

- **A green map gave false comfort** (#115). The map marked architecture, requirements, specs, design and runbooks as present:
  - an architecture document three months old, still describing a mobile framework the project had dropped;
  - requirements evidence that included a byte-for-byte duplicate of another file;
  - design evidence that pointed at three superseded design folders.

  Because they showed as present, `next_work` never suggested refreshing them, and the document skills were never offered. An audit later found about 170 documents, roughly half stale or superseded.
- **Migrations collided at merge** (#149). Four work items, built in parallel on separate branches, each added an Alembic migration with the same parent revision. Each item's data-migration review passed, because each looked only at its own branch, and nothing in Peer AI raised it. It was found when the branches were merged and the integration test's single-head assertion failed. Re-parenting is easy, but it changes migrations after they were reviewed.

## Design

### 1. The map judges a document's evidence

For each document the map counts as evidence, `assess` now also checks three things, all from git and the files, with no AI involved:

- **Stale:** the document hasn't changed in 90 days, while the code of the part it covers has had many commits since: 50, or a quarter of the part's files changed. The part is its track, or the whole project for a project-wide document.
- **Duplicate:** it's byte-for-byte the same as another evidence file. Only the first counts.
- **About something that's gone:** it names, in a path or a code span, a folder of the project that no longer exists, or a track that's retired (RFC 0017).

A document with any of these is still listed as evidence, with the reason. An item whose evidence is all flagged is `partial`, not `present`, with a note: "docs/architecture.md was last changed 2026-07-01, and services/api has had 140 commits since". `next_work` then offers the item's document skill to bring it up to date. A document that's current but flagged anyway, such as a record of a decision that's meant to stay as it was, can be marked so in `docs.settled`, and is never called stale.

### 2. Migrations that will collide

Peer AI knows each open work item's branch. For the item on the branch being worked on, it compares the migrations its branch adds with those the other open items' branches add, against where each leaves the default branch:

- **In the same migrations folder,** two branches adding a migration will need ordering, so `next_work` says so for the current item: "SHOP-5 also adds a migration in services/api/alembic/versions. Whichever merges second needs its migration re-parented, then reviewed again."
- **For Alembic, where a migration names its parent,** two new migrations with the same `down_revision` will make two heads, which is certain, not just likely. The message says so.
- **`advance_work_item` to verify and to ship** repeats it as a warning, never a refusal, since the order of merging is a person's call.
- **`data-migration-review`** reads the same list, so the review of a migration says whether it will need re-parenting.

The migrations folders are the ones `assess` already recognises: Alembic, Django and Rails migrations, Prisma, Drizzle, and SQL migration folders. Branches are read from git, locally or from the remote, with no network.

## Compatibility

Minor:

- A map item's evidence gains reasons, and items can move from `present` to `partial`.
- `next_work` and `advance_work_item` gain the migration warning.
- The config gains `docs.settled`.

A project's map may show more partial items after updating. That's the point: the documents were stale before, and the map now says so.

## Drawbacks

- **Thresholds are a judgement.** 90 days and 50 commits fit a project in active development. A quiet project's documents won't be called stale by time alone, since the code hasn't moved either.
- **A path that no longer exists** might be named on purpose, as history. `docs.settled` covers it.
- **Reading every open branch** costs a git call per branch. It's done for the current item only, not on every call.

## Alternatives

- **An AI review of every document's accuracy.** Thorough, and costly every time the map runs. The git signals are free, and point the document skills, which do read the documents, at the ones worth their time.
- **Failing the gate on stale documents.** A stale document is work to do, not a reason to block a change. The map's gaps already become work items.
- **Checking migrations only at merge.** That's when it was found. The point is to say it while each branch can still choose its order.
