---
"peer-ai": patch
---

The gate asks GitHub whether a pull request is a draft as it runs (#271). It read the draft flag from the event's own copy, stored when the run was queued, so a push a second before "ready for review" left a skipped run as the newest result for the commit: `gh pr checks` showed the gate as skipping, a pre-merge script refused it, and re-running replayed the same copy. GitHub also counts a skipped required check as passing, so such a run could stand over a gate that failed. Now the job starts on every pull request event, its first step asks GitHub for the pull request's state, and on a draft the rest is skipped and the job passes. When GitHub can't be asked, the gate runs. The workflow asks for `pull-requests: read` for it.

After updating, run `npx peer-ai render`.
