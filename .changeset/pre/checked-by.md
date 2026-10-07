---
"peer-ai": minor
"peer-ai-workflow": minor
"peer-ai-skills": patch
---

A review says how it checked each automatic rule (RFC 0019, for #202):

- **`standards_for_file` says whether each rule's tool enforces it** for the file's part, as `peer-ai doctor` finds it, with `enforced`, and why not in `notEnforced`: no ESLint config, settings that don't use Peer AI's, the report stage or a deferral, and so on.
- **A report's coverage line gains `checkedBy`,** `tool` or `reading`, for a pass of an automatic rule. `record_review` refuses `tool` where the tool doesn't enforce the rule in the parts the change touched.
- **Every result counts the automatic rules checked by reading only,** such as "pass, 2 automatic rules checked by reading only", in `record_review`, `next_work` and `peer-ai check`, so a pass by eye isn't taken for one a tool enforces.
