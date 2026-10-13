---
"peer-ai": minor
---

A merged item's record lands where it counts (RFC 0020, for #233). Moving an item whose branch has merged to `done`, or closing it with `close-merged`, writes its record where the merge is: a working copy that holds the merged work and isn't on the merged branch, the main checkout first. So the record reaches the default branch with the next pull request, rather than staying on a branch that's gone, or needing a pull request of its own. With no such working copy, it says to pull the default branch first. `advance_work_item` says where it wrote the record, and `next_work` lists records waiting to be committed, as `unlanded`.
