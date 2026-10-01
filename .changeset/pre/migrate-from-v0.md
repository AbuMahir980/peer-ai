---
"peer-ai": minor
"peer-ai-workflow": minor
---

`peer-ai migrate` moves a project from its copy of v0 onto the package (RFC 0008). It converts v0's project settings, `phase-config.json`, the project's standards documents and the work in progress, takes v0's text out of the instruction files, and copies everything that needs a decision into `docs/peer-ai-migration.md`, with a work item that brings it up in the next session. It never commits. `peer-ai doctor` now suggests it for a leftover v0 folder.
