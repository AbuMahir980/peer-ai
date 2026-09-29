---
"@peer-ai/skills": minor
---

Add the reliability-review skill. It lists every place something can fail (calls out, jobs, live connections, stores, caches, timers and start-up) and checks each against the reliability rules: timeouts and handled failures, jobs safe to run twice, offline as a state, the only copy of a person's data protected, apps that cache themselves still updating, and configuration that fails closed. For each call out it traces what the person sees when it's slow, fails, or there's no connection.
