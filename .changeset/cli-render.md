---
"peer-ai": minor
---

Add `peer-ai render`, which sets up each AI tool in the config: a marked block of instructions in `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` or Copilot's instructions, a Cursor rule, and the MCP server's registration in each tool's project config. It only ever rewrites its own block and its own server entry, refuses what it can't edit safely, and changes nothing on a second run. `--check` fails when the files are out of date, `doctor` warns about it, and `init` now points to `assess` and `render` as the next steps.
