---
"peer-ai": patch
---

`peer-ai migrate` no longer copies v0's own wording into the instructions every session reads (#217). A phase's "**Skills to use here.**" header, and a line that only names an add-on and what it's for, are left out, since `also` holds the add-on. A note that says a phase has no skill, where 1.0 has one, becomes a decision in `docs/peer-ai-migration.md` instead of a note. The rest of each note is converted as before, and the whole of `phase-config.json` stays in the migration notes. On a real v0 project, this cut the converted notes from 48 to 22.
