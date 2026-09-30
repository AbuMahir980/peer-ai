---
"@peer-ai/standards": minor
"@peer-ai/eslint-config": minor
"@peer-ai/workflow": minor
"peer-ai": minor
---

Stack profiles, from RFC 0006. A profile is data in `@peer-ai/standards`: each rule carries out a core rule, and may apply only to some architectures, hold a value a project can change in `standards.overrides`, and name the tool setting that enforces it. The first profile is TypeScript, with ten rules. The new `@peer-ai/eslint-config` turns a project's profiles into ESLint settings, each part's rules for its own files and relative to the project's root, sharing the project's copy of each plugin; every rule it enforces is run through ESLint on an example that must fail and one that must pass. `standards_for_file` returns the profile rules for the file's part, `peer-ai doctor` checks the listed profiles exist, that overrides fit their rule, and that the ESLint config nearest each part and its tsconfig files enforce their rules; `peer-ai assess` suggests profiles from each part's stack, and a stack for each part that names none. `readConfig` moves into `@peer-ai/workflow`.
