---
"@peer-ai/skills": minor
"peer-ai": patch
---

Add the ai-feature-review skill: every model call, what goes into it, what can steer it, what its output can do, and its limits and tests, checked against the eight AI rules (from the OWASP Top 10 for LLM Applications) and six related rules on HTML, secrets in apps, personal data and timeouts. `peer-ai assess` no longer counts Peer AI's own rendered skills as the project's documents, which could make a map item look present when it isn't.
