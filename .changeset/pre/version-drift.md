---
"peer-ai": minor
---

`peer-ai doctor`, and through it `next_work`, now say when the Peer AI running isn't the version the project uses (RFC 0011). After an update merges, an AI tool whose MCP server still runs the old version is told to reconnect, so its tools and CI agree; a project behind the version run is told how to move to it. The README gains "Updating while agents work": let agents finish or pause, update and merge, reconnect each AI tool, then resume.
