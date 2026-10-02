---
"peer-ai": minor
"peer-ai-workflow": minor
"peer-ai-eslint-config": minor
---

An existing codebase can adopt Peer AI's enforcement in stages (RFC 0011):

- **`standards.enforcement: "report"`** has the tools run and report without failing a build: the security workflow's jobs run with `continue-on-error`, ESLint runs Peer AI's rules as warnings, and Ruff's settings leave them out until they enforce. `init` and `migrate` write `report` for an existing codebase and `enforce` for a new one. A config without the setting keeps enforcing, so nothing changes until you choose; `doctor` suggests `report` to an existing codebase.
- **`standards.deferred`** holds back one rule's enforcement until a date or a work item is done, with why and who decided. Reviews still apply it.
- **A check your own workflows already run isn't added twice.** At your next `render`, a security job whose tool (gitleaks, osv-scanner, zizmor, Semgrep, SSLyze or ZAP) already runs in one of your workflows is left out, and `standards.coveredBy` does the same for a rule you cover with another tool.
- **`render` says what it wrote:** each job of the security workflow, with its rules, which only report, and what's covered elsewhere. `.peer-ai/enforce/ruff.toml` explains itself in its header. `doctor` lists the stage, each deferral and each check covered elsewhere.
