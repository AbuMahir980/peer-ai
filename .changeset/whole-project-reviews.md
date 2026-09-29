---
"peer-ai": minor
"@peer-ai/skills": patch
---

`record_review` checks a whole-project review's report too: without a work item id, it validates the report, checks every rule has a line and works out the result, without recording it anywhere. So every review, not only a work item's, gets its report checked and fixed until it passes. security-review's last step and the shared report guide now say so, and its guidance on consent checks a service where it's set up, not only where one call sends data.
