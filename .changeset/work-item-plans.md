---
"peer-ai": minor
"@peer-ai/workflow": minor
---

Work items carry their plan (RFC 0005): an optional goal, acceptance criteria, the sources an item implements, and the items it depends on. `create_work_item` and `update_work_item` take them; `next_work` shows what each open item is waiting for; `advance_work_item` won't move an item to ship before the items it depends on have shipped, though it can be built before; and `peer-ai check` fails on the same, and on a dependency that doesn't exist or a loop.
