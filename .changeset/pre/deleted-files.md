---
"peer-ai": patch
---

A file a change deleted no longer asks for a code, security, accessibility or design review, counts toward a weak trigger's changed lines, or adds its rules to those reviews' scope (#216): there's no code left in it to review. A deleted migration, dependency file or pipeline still asks for its own review, since deleting one matters.
