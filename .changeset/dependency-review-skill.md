---
"@peer-ai/skills": minor
---

Add the dependency-review skill. It checks every dependency against the delivery rules: exact versions and committed lockfiles, a reason for each new package, an automated check for known vulnerabilities (with lookups from an audit tool or advisory database, never from memory), nothing only needed for building or testing in production, packages only from the registry the project expects, a current list of dependencies, licences that fit how the product is shipped, and risky packages (look-alike names, deprecated or abandoned, install scripts) chosen on purpose.
