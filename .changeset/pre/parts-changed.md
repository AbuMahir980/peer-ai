---
"peer-ai": minor
---

Render writes a workflow that says what a change touched (RFC 0022, for #256). On GitHub Actions, a project of two parts or more gets `.github/workflows/peer-ai-changes.yml`, a reusable workflow its own workflows call first, so each job runs only for the parts a change touched. It asks GitHub's compare API, with the run's own read-only token and no checkout, and its outputs say which parts changed, counting a part as changed when one it `uses` did, plus `code` (anything outside `.peer-ai/`) and `other` (anything outside every part). When it can't tell, every output is true. A job skipped by its condition reports success, so a required check never waits. Its header shows how to call it.

The security pipeline's records-only step now runs its scans when GitHub lists 300 files, the most it lists, and counts a file moved into `.peer-ai/` as a change where it was.

After updating, run `npx peer-ai render`.
