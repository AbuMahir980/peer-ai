---
"peer-ai": minor
"peer-ai-workflow": minor
"peer-ai-skills": patch
---

Whole-project reviews are recorded (RFC 0015). `record_review` without a work item now keeps the review in `.peer-ai/project-reviews.json`: the latest from each skill, with its open findings at the blocking level or high.

- **A work item can list the findings it fixes** in `fixes`, as `skill#finding`, such as `security-review#F-3`.
- **`next_work` gives `projectFindings`:** the open critical findings, and the critical and high ones no work item covers, so none is dropped.
- **`peer-ai check` warns about open critical findings,** and fails on them at the production stage. It also warns about findings no work item covers.
- **Each review skill's last step,** after a whole-project review, groups the open findings into work items with the person.
