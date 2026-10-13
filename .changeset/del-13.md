---
"peer-ai-standards": minor
"peer-ai-skills": minor
---

A new delivery rule, DEL-13, each check runs on the changes it can apply to (RFC 0022, for #256): a CI job runs its work only when the change can affect what it checks, deployment checks run when deploying rather than on every pull request, a skipped job still reports success, and a workflow cancels a run that a newer push replaced. It applies from MVP, is checked by AI review at medium severity, and `infrastructure-review` and `release-readiness` answer for it.
