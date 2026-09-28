---
"peer-ai": minor
---

Add `peer-ai doctor`, which checks that Peer AI is set up correctly and says how to fix what isn't: the Node.js version, the config, tracks whose folders have moved and parts no track covers, files the config names, AI tools the config doesn't list, whether the project map is out of date, work items, git, and a leftover copy of the v0 playbook. It only reads, and it reports every check, including the ones it had to skip.
