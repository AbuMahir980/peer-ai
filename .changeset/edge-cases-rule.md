---
"@peer-ai/standards": minor
"@peer-ai/skills": patch
---

Add CODE-15, "Edge cases are handled": time zones and daylight saving, empty and very long input, ties, the first and last item, and zero. Code-review evals showed plain logic bugs, such as a date worked out in UTC, had no rule to be reported under. code-review now answers for 67 rules.
