---
"@peer-ai/skills": minor
"peer-ai": patch
---

Add the design-system skill. It writes or updates the design system from the designs and the code: where design comes from, the tokens in one place, the shared components with every state, the rules every screen keeps, and accessibility with contrast worked out from the token values. Stray values, missing states and failing contrast are reported as problems. `peer-ai assess` now counts a written design system, such as `docs/design-system.md`.
