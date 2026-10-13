---
"peer-ai": minor
"peer-ai-workflow": minor
"peer-ai-skills": patch
---

CI that costs only what it must (RFC 0021, for #247):

- **The gate skips draft pull requests,** and runs when one is marked ready. A draft can't merge, so a red gate now always means a pull request meant to merge isn't ready. The instructions render writes say to open a pull request as a draft until its item reaches ship. `"gates": { "drafts": "check" }` keeps the gate on drafts.
- **Records go up in one push.** With CI's verify, the instructions render writes, and `implement-ticket`, say to push the change, let CI run, then record the reviews and the verify from CI together, in one push.
- **The security pipeline skips records-only pushes.** Each scan's job still runs and reports, so a required check never waits, but skips its scan when GitHub's compare API says the push changed only `.peer-ai/`.

After updating, run `npx peer-ai render` to write the new workflows.
