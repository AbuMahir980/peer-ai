---
"peer-ai": minor
"peer-ai-workflow": minor
---

CI's run of the verify command can count as the verify (RFC 0013), so nobody runs a slow verify again on a laptop.

Set `commands.verifyCheck` to the CI check that runs it on every pull request, as GitHub names it, such as `"ci / check"`. Then:

- **`run_verify` with `from: "ci"`** takes that check's result on the item's latest pushed commit from GitHub through `gh`, and records it with a link to the run.
- **Moving an item to ship** takes it automatically, and says what's still missing. So does the new `npx peer-ai ship`.
- **`peer-ai check` confirms it with GitHub.** Run `npx peer-ai render` after setting `verifyCheck`, so the gate's workflow gets `checks: read` and the run's token.
