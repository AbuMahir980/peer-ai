---
"peer-ai": minor
---

Two changes to the gate, from RFC 0013:

- **A review survives a merge from the base branch** when the merge brings in none of the files the branch itself changes. Merging the main branch to resolve a conflict no longer makes every review stale. A review is stale only when a file the item changes has changed since it. The verify still has to be on the latest commit, since merged code can break the build.
- **`peer-ai check` writes what it found to the job's summary on GitHub Actions,** which shows on the pull request's checks: each problem with its fix.
