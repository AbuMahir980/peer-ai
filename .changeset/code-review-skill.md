---
"@peer-ai/skills": minor
---

Add the code-review skill. It checks a change against 66 rules: code quality, architecture, frontend, backend, system design (races, repeatable jobs, locks), money and safety-critical data where those traits apply, and single rules on lost data, timeouts, one query per row, long lists, leaks, breaking API fields and tests. It also sweeps for serious problems outside its rules, such as a secret in the code or a query built from input, and reports each under the rule it breaks while naming the specialist review to follow.
