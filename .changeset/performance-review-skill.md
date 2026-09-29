---
"@peer-ai/skills": minor
---

Add the performance-review skill. It lists everything whose cost grows with use (lists, queries, outside calls, slow work, caches, screen lists, timers and images) and checks each against the performance rules, with paging, slow work kept out of requests, timeouts, and apps that cache themselves still updating. A problem a later stage's rule describes, such as a missing index before production, is still reported when the code already shows it.
