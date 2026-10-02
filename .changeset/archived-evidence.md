---
"peer-ai": patch
---

`peer-ai assess` no longer counts a document in a folder of retired ones, such as `docs/archive/` or `docs/retired/`, as evidence for the project map: a spec moved there is history, not the project's current spec.
