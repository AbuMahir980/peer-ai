---
"peer-ai": patch
---

`peer-ai migrate` now says to make its decisions on the migration's branch, before it merges (#215). The gate it adds holds that branch's pull request to the `migrate-v0` work item, and v0's instructions often held the project's own rules, which the decisions bring back. Its closing message, `docs/peer-ai-migration.md`, the work item and the README's steps say the same, and the README adds the step of shipping `migrate-v0` before the pull request.
