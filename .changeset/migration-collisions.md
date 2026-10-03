---
"peer-ai": minor
"peer-ai-skills": patch
---

Peer AI notices when open work items will collide on migrations (RFC 0018). When the current item's branch adds a migration, `next_work` names each other open item whose branch adds one in the same folder, as `migrationCollisions`: whichever merges second needs its migration re-parented, then reviewed again. For Alembic migrations on the same parent revision, two heads are certain, and it says so. `advance_work_item` repeats it at verify and ship as a warning, and `data-migration-review` says it in its report. It reads branches from git, locally or as last fetched, with no network.
