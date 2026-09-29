---
"@peer-ai/skills": minor
"peer-ai": patch
---

Add the data-modelling skill. It writes or updates the data model from the migrations or schema: each entity and field, what the database guarantees and what only the code checks, money and safety-critical fields, every personal or sensitive field with why it's kept and for how long, and each change's migration that keeps existing data. Problems such as stored card data or a migration that lost data are reported, never written in as the design. `peer-ai assess` now counts a written data model, such as `docs/data-model.md`, so a new product's data model fills its gap before any migration exists.
