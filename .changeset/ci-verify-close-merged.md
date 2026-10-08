---
"peer-ai": patch
---

- **`run_verify` from CI asks about the item's own branch (#231).** Where the item's branch isn't checked out, such as when the working copy moved to a branch stacked on it, CI's result is read for the branch as pushed, not for whatever the working copy holds. When GitHub can't tell the result, the message now says the commit may not be pushed yet, as well as that `gh` may not be signed in.
- **`close-merged` and doctor see merges correctly (#230).** An item at prepare is never closed as merged because another item's branch of the same name merged. A branch whose only unmerged commit is Peer AI's own record, such as the one that closed its item after its pull request merged, now counts as merged.
