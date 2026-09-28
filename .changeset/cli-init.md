---
"peer-ai": minor
---

Add `peer-ai init`, which reads a repository, asks four questions and writes `peer-ai.config.json`. It detects the project's parts and stacks, infrastructure as code by its files, where each part deploys, an existing CI pipeline, the AI tools already set up and the git host. It never overwrites an existing config, and never assumes anything it didn't find.
