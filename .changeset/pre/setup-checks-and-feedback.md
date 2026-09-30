---
"peer-ai": minor
"peer-ai-workflow": minor
---

Setup checks and feedback that run themselves (RFC 0007). `peer-ai check` fails on anything `peer-ai doctor` fails on, and `next_work` gives the AI tool every setup problem with its fix at the start of each session. When Peer AI gets something wrong, the AI tool drafts a report with the new `draft_feedback` tool, which refuses code, keys and email addresses; the new `peer-ai feedback` command lists, sends or drops the drafts, and sends one only after a person approves. `render` keeps `.peer-ai/feedback/` out of git.
