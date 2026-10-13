---
"peer-ai": minor
"peer-ai-workflow": minor
---

Choosing what `close-merged` closes (RFC 0020, for #230):

- **An item can stay open after its merge,** such as one merged before ship with device checks still owed. `update_work_item` with `keepOpen`, a reason and who decided, records `openAfterMerge` on the item. `close-merged` and `peer-ai doctor` leave it alone and list it as kept open, with why. Moving the item on clears it.
- **`close-merged` asks about each item:** close all, choose one by one, or close none. With `--yes`, it closes all except those named with `--skip <id>`, which can be given more than once.
