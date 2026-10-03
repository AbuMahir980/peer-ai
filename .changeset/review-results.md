---
"peer-ai": minor
"peer-ai-workflow": minor
"peer-ai-skills": patch
---

Review results mean what they say (RFC 0015):

- **A recorded review keeps how many findings it leaves open at each severity,** and is shown that way: in `record_review`'s reply, in `next_work`'s reviews, and in `peer-ai check`. For example, "pass, 7 high open". A pass is never read as all clear. `peer-ai check` also warns about items at ship or done with high findings open below the blocking level.
- **A `qa-acceptance` review fails on any acceptance criterion that doesn't hold,** whatever its finding's severity. After that, `update_work_item` changes the criteria only with a `reason` and who decided (`by`), which the item records.
