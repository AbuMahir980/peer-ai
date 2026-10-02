---
"peer-ai": minor
---

A work item now lives on its branch, wherever that's checked out (RFC 0010). The tools read and write it, and `run_verify` runs, in the working copy where the item's branch is checked out, the main one or any git worktree, so agents working in parallel worktrees never touch each other's items, and switching branches never rolls one back. `next_work` takes the branch of an agent in a worktree of its own. `run_verify` refuses while that working copy has changes not yet committed, since a verify proves a commit. New ids are unique across worktrees, and moving an item to build records the commit it starts from.
