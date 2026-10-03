---
"peer-ai": minor
"peer-ai-workflow": minor
---

With `"updates": { "pullRequest": true }`, on GitHub Actions, `peer-ai render` writes `.github/workflows/peer-ai-update.yml` (RFC 0014). Once a day it opens a pull request, "Update Peer AI to <version>", when a newer release is out, with `render` already run on its branch. CI doesn't start on a pull request opened with the workflow's own token, so add a `PEER_AI_UPDATE_TOKEN` secret for CI to run by itself; without one, close and reopen the pull request. A project with `peer-ai` in its `package.json` is left to Dependabot or Renovate.
