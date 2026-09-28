---
"peer-ai": minor
---

Add `peer-ai check`, the gate CI runs. It fails when the setup is broken, or when a work item claims more than its record shows: work at ship or done without a passing verify or reviews, or a gap marked done that a fresh assessment still finds. Gaps on the map and an out-of-date map are warnings, never failures. At the prototype stage an incomplete review is allowed.

`assess` now counts a CI pipeline in the repository even when the config says there is none, and `doctor` warns about that mismatch, so Peer AI extends the existing pipeline instead of adding a second one.
