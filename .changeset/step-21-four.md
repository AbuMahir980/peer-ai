---
"@peer-ai/skills": patch
---

code-review checks SEC-01 (a record belongs to the caller), API-02 (the code matches its contract) and AI-01 (a model's reply is checked before it's used) on every route and model call, and records the edges it tried for each unit. threat-model lists the defences already in place in a section of their own. security-review traces every piece of a model's instructions to where it comes from.
