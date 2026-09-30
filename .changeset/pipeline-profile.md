---
"@peer-ai/standards": minor
"peer-ai": minor
---

The github-actions stack profile: the checks a pipeline runs. `peer-ai render` writes them as `.github/workflows/peer-ai-security.yml`, with job names that never change, so they can be required checks: secret scanning with Gitleaks, dependency checks with OSV-Scanner every change and every day, workflow checks with zizmor, and code scanning with Semgrep and a pinned set of its rules; and, for environments with an address, a TLS check with SSLyze and a scan of the running app with OWASP ZAP, only where the config says it isn't production. Every tool is a release checked against its checksum or an image pinned to its digest, the workflow starts from no permissions, and render leaves it alone once someone changes it by hand. Each automatic check is proven in Peer AI's own CI by running the tool on its rule's failing and passing examples, and the workflow itself must pass zizmor.
