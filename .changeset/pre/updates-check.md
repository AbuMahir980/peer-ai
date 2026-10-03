---
"peer-ai": minor
"peer-ai-workflow": minor
---

`peer-ai doctor`, and through it `next_work` at the start of each session, now says when a newer Peer AI is out than the project uses, with where to read what changed and how to update (RFC 0014).

It asks npm at most once a day per machine, keeping the answer in your cache folder, never in the project. Offline and in CI it says nothing, and it never fails a build. To stay on a version on purpose, set `"updates": { "notify": false }` in `peer-ai.config.json`.
