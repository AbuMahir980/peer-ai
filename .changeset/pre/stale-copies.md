---
"peer-ai": patch
---

A closed item is no longer taken for open from an older copy of its record (#278). A branch made before an item closed still holds that copy, and when it was checked out in another worktree, `next_work` listed the item as open at its old stage, `work_item` returned the old record, and `advance_work_item` wrote into that other worktree. Now each working copy's history, and the default branch's, decide: a record older than the item's closing is ignored, `work_item` says how the item closed and where it merged, and nothing is written into the older copy. Moving a closed item back to an earlier stage still reopens it, in the working copy asking, and the reply says it was closed and reopened.
