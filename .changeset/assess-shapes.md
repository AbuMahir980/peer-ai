---
"peer-ai": patch
---

`assess` handles two more project shapes. A part that hasn't started yet, such as a local-first app's future sync server, no longer creates requirements for an API contract or data model. And a database kept on the device and defined in code, such as IndexedDB through Dexie or idb, WatermelonDB or SQLite, now counts as the data model. A new test runs `assess` on every example project shape.
