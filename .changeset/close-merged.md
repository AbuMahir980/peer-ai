---
"peer-ai": minor
"peer-ai-workflow": minor
---

Work whose branch is already merged can be closed without being verified again (RFC 0013). This covers work merged before the ship gate, or while `peer-ai check` wasn't a required check.

- **`npx peer-ai close-merged`** lists every open item whose branch is merged, then asks and closes them. It finds merge commits and fast-forwards with git. It also finds squash and rebase merges whose files are all in the default branch, and asks GitHub through `gh` about the rest, including deleted branches. Each item records how it closed: `"closed": { "by": "merge", … }`.
- **`advance_work_item` to `done`** does the same for one item when its branch is merged.
- **`peer-ai check`** accepts these items and lists them.
- **`peer-ai doctor`** warns when open items look merged.

After updating, run `npx peer-ai close-merged` to close the items already merged, then commit the change on a branch.
