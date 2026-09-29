---
"peer-ai": minor
"@peer-ai/workflow": minor
---

Skills reach cloud agents too. `peer-ai render` gives each tool a setup step that writes the skills before the agent starts:
- a `SessionStart` hook in `.claude/settings.json` for Claude Code, which also runs in cloud sessions and keeps skills fresh after an upgrade;
- the `start` command in `.cursor/environment.json` for Cursor's cloud agents;
- a step in `.github/workflows/copilot-setup-steps.yml` for Copilot's cloud agent;
- a printed line for Codex cloud's setup script.

The step runs the new `peer-ai render --skills --quiet`, which writes only the skills. A project can set `skills.commit` to `true` to commit its skills instead, marked as generated in `.gitattributes`.
