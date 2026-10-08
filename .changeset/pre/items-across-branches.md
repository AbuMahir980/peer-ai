---
"peer-ai": patch
---

Work items across branches and worktrees:

- **An id is never handed out twice (#234).** `create_work_item` gives the next number after every id taken anywhere: open or closed, in every working copy, and on every local and remote branch as committed. So an id an unmerged branch holds, even in its history, isn't reused from another checkout.
- **A review is judged by its branch's own config (#236).** When an item's branch is checked out in another worktree, `record_review` checks the report against that worktree's `peer-ai.config.json`, which may enforce what the main checkout's only reports. A change that touches no part, such as one to the root's settings, is judged against the whole project, so a claim that a tool checked a rule can't slip through.
- **`create_work_item` says where it wrote the item,** as `writtenTo`, since an item lives where its branch is checked out.
