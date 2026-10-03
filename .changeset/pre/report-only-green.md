---
"peer-ai": patch
---

While enforcement only reports (`standards.enforcement: "report"`, or a deferred rule), the security workflow's jobs now finish green on a pull request instead of showing a red cross. `continue-on-error` moves from the job to its check step, and a last step raises a warning and writes to the job's summary when the check found something, so findings are visible without looking like a failure. Run `npx peer-ai render` to update `.github/workflows/peer-ai-security.yml`; a workflow that enforces is unchanged.
