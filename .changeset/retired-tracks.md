---
"peer-ai": minor
"peer-ai-workflow": minor
---

A part of the project can be retired (RFC 0017):

- **A track's status can be `retired`.** It needs no folder, and the instructions say it's no longer part of the product. Its work items stay valid and readable, and no new item goes on it.
- **A work item's track can change,** with `track` on `update_work_item`, or `npx peer-ai work move <id> <track>`.
- **A track is checked only when it's set.** An item whose track was retired or removed can still be advanced, updated or cancelled, and `doctor` and `check` warn about it instead of failing.

If you kept a removed app's track as `external` to keep its items working, set it to `retired` instead.
