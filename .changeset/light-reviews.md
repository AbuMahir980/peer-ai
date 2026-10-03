---
"peer-ai": minor
"peer-ai-workflow": minor
"peer-ai-skills": patch
---

Reviews are sized to the change (RFC 0016):

- **A weak trigger asks for a light review.** That means 20 changed lines or fewer, in files the change didn't add, and nothing about routes, access or sessions. A light review covers the changed lines only and is written with `"depth": "light"`. It applies to code, security, accessibility and design reviews. A light review covers a light requirement; a full requirement still needs a full review.
- **A person can waive a review for one item,** with why and who decided: `update_work_item` with `waive`, or `npx peer-ai waive <id> <skill> --reason "…" --by "…"`. `peer-ai check` lists every waiver. At production, only a light review can be waived.
