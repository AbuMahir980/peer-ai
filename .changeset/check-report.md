---
"peer-ai": minor
"@peer-ai/workflow": minor
"@peer-ai/skills": patch
---

Add `peer-ai check-report <file>`: the same checks on a review's report as the `record_review` tool, from a shell, recording nothing. In the evals, a fast model reached for shell commands and never called the MCP tools, so its reports went unchecked; security-review now names `check-report` as the fallback.
