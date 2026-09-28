---
"peer-ai": minor
---

Add `peer-ai assess`, which maps what a project already has and what its stage still needs, and writes `.peer-ai/map.json`. Each item on the map is present, partial, missing or not applicable, with the files that prove it. What it works out from the code rather than a document, such as the architecture, is marked inferred for a person to confirm. It reports personal data, card-related names and payment providers as compliance signals to check, respects `.gitignore`, and leaves out a copy of the v0 playbook. `peer-ai init` now finds infrastructure as code up to five levels inside an infrastructure folder.
