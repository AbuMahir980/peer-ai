---
"peer-ai": patch
---

`render` now creates a new `CLAUDE.md` or `GEMINI.md` as a one-line import of `AGENTS.md` when `AGENTS.md` carries the instructions, so the tool doesn't read them twice. The instructions, and the MCP server's own, now say when to move a work item to each stage: `build` before changing code, `verify` once the change is complete, `ship` when it is verified, reviewed and ready to merge, and `done` once it is merged or released.
