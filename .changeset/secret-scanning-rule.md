---
"@peer-ai/standards": minor
"@peer-ai/skills": patch
---

Add SEC-27, "Secret scanning runs on every change", at medium severity, and narrow SEC-10 to a secret actually in the code, which stays critical. A missing scanner is a gap in the safety net, not a leak, so reviews no longer rate it critical. security-review covers SEC-27 and says to keep the two apart.
