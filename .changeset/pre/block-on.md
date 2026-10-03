---
"peer-ai": minor
---

`init` and `migrate` ask which open findings in a review block a merge: critical only, or critical and high. They suggest high for a product in production, and write `gates.blockOn` (RFC 0015). `peer-ai doctor` warns when a project in production lets high findings ship. To have high findings block, set `"gates": { "blockOn": "high" }`.
