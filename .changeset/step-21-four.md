---
"@peer-ai/skills": patch
---

code-review checks its worst kinds of problem as rules on every route, model call and page, instead of in a sweep it could skim: SEC-01 (a record belongs to the caller), SEC-05, SEC-07, SEC-08, SEC-10, SEC-15, PRIV-01, API-02 (the code matches its contract, field names letter for letter) and AI-01 (a model's reply is checked before it's used). A pass quotes the code it compared, and it records the edges it tried for each unit.

threat-model lists the defences already in place in a section of their own.

security-review lists each prompt the code puts together and traces every piece of it, names each id a route takes with the line that ties it to the caller, checks the fields a route returns, and fails a repository with no CI instead of marking it not checked.
