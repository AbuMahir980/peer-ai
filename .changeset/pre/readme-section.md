---
"peer-ai": minor
"peer-ai-workflow": minor
---

With `"docs": { "readme": true }`, `peer-ai render` keeps a section for people in the project's `README.md`, "How we work: Peer AI", between markers (RFC 0014). It opens with three short lines: what Peer AI does here, that nobody needs to install it, and `npx peer-ai doctor`. The rest is folded into `<details>` sections: the stage, what a pull request needs, the checks and any deferrals, and how updates work. It's written from the config, so it stays true as the config changes. It's off unless asked for.
