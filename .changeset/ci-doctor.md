---
"peer-ai": minor
"peer-ai-workflow": minor
---

doctor warns where a project's CI runs checks that can't apply (RFC 0022, for #256). It reads the project's own GitHub Actions workflows and warns, never fails, about a deployment on pull requests, a workflow on pull requests that doesn't cancel the run a newer push replaced, and, in a project of several parts, a part's jobs that run on every pull request with no condition on what changed, pointing to `.github/workflows/peer-ai-changes.yml`. Each warning names the workflow and its jobs. A workflow meant that way goes in `declined`, which now takes `{ "workflow": "<path>", "reason": "…" }`, and isn't warned about again.

Peer AI's own gate and security workflows now cancel a pull request's run when a newer push replaces it, and always finish a run on the default branch. After updating, run `npx peer-ai render`.
