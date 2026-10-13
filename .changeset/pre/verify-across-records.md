---
"peer-ai": patch
---

`run_verify` from CI, and moving to ship, take CI's result from the item's latest commit that changed anything outside `.peer-ai/` (#247). A commit that only records reviews or a verify leaves the code as CI tested it, so a project's CI can skip such commits and the verify still counts. The README shows how to skip them in a workflow without leaving a required check waiting.
