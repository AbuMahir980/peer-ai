---
"peer-ai-eslint-config": patch
"peer-ai-skills": patch
---

- **A rule that only reports no longer weakens one that enforces the same ESLint rule (#235).** ESLint takes the last setting of a rule for a file, so a deferred component-size rule (a warning at 150 lines) replaced the enforced file-size rule (an error at 400) for every `.tsx` and `.jsx` file. A reporting-only setting is now left out wherever an enforced setting of the same ESLint rule covers the same files, so the error stays.
- **The review guides agree with the validator (#225).** A rule that applies from a later stage, but whose problem the files already show, was to be `not-applicable` with a finding, which `record_review` refuses, since every finding needs a failing line. The guides now say to mark that rule's line `fail`, with the finding, which says when the rule applies in full.
