---
"peer-ai": minor
"peer-ai-skills": patch
---

A review of a change answers only for the rules that can apply to the files it touched (RFC 0016). They're worked out the way `standards_for_file` works them out for each file, so a change to a screen doesn't need a coverage line for every database or pipeline rule in the skill. `next_work` gives each required review its `rules`, and `record_review` checks the report against them. A whole-project review still answers for every rule.
