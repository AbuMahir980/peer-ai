---
"peer-ai": patch
---

When an AI tool is still connected to an older Peer AI after an update merges, its tools no longer just call the config invalid (#201). They say the project now uses the newer version, naming it and where it's pinned, and ask for the AI tool to be reconnected, with what the older version doesn't recognise below. `peer-ai render` says to reconnect right after the update merges when it moves a project to a new version, and so does the update pull request.
