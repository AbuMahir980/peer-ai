---
"peer-ai": patch
---

`standards_for_file` gives the right rules and enforcement for two kinds of file:

- **A dependency manifest or lockfile** gets the delivery rules for its dependencies, such as pinned versions, watched vulnerabilities, the expected registry and licences, and no longer the code's TypeScript, React or Python rules (#224). So a change to `package.json` gives `dependency-review` its rules to answer for, rather than none (#227).
- **A file in no part of the project,** such as a settings file at the root, is never told a rule is enforced: Peer AI's settings for ESLint, Ruff and the compiler check only the parts' files, so each such rule says `enforced: false`, with that reason (#223).
