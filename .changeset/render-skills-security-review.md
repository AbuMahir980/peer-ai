---
"peer-ai": minor
"@peer-ai/skills": minor
---

Add the first skill, security-review, and have `peer-ai render` write skills where each AI tool reads them. security-review checks a change or a whole project against the 26 security rules and 11 related rules from other domains. It has one reference per group of rules, saying what to look for, what counts as evidence and the usual false alarms. Render writes each skill as `peer-ai-<skill>`: to `.claude/skills/` for Claude Code, and to `.agents/skills/` for Codex, Cursor, Copilot and Gemini CLI, as few times as the listed tools need. It keeps them out of git in a marked `.gitignore` block, and replaces or removes only its own `peer-ai-` folders. `peer-ai doctor` warns when skills are missing or out of date. A skill can now list single rules from other domains in `metadata.peer-ai-rules`.
