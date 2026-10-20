---
"peer-ai": patch
---

Fixes in the workflows render writes:

- **The "what changed" workflow passes actionlint (#273).** Its script read each part's variable through `${!name}`, which shellcheck can't follow, so it reported them as unused (SC2034). It now passes the values, and a part with no output of its own gets no variable.
- **A retired part gets no output** from it, and the lint settings in `.peer-ai/enforce/` count as code, not records, in it and in the security pipeline (#275, #276).
- **The security pipeline's records-only skip works on pull requests (#270).** It compared with `github.event.before`, which a pull request's first run doesn't have, and the workflow has no push trigger without a default branch in the config, so every scan ran on every pull request. It now compares with the pull request's base on its first run. And it skips only when the same check passed on the commit it compares with, so a records-only push never stands over a scan that failed. The jobs ask for `checks: read` for it.
- **Every security job has a time limit,** 20 minutes for each scan, so a stuck one doesn't run for GitHub's default six hours (#275).
- **The OWASP ZAP image is pinned** to the digest its `2.17.0` tag now has, since the ZAP project published it again.

After updating, run `npx peer-ai render`.
