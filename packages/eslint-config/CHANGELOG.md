# peer-ai-eslint-config

## 1.0.0-next.16

### Patch Changes

- 2deff7f: - **A rule that only reports no longer weakens one that enforces the same ESLint rule (#235).** ESLint takes the last setting of a rule for a file, so a deferred component-size rule (a warning at 150 lines) replaced the enforced file-size rule (an error at 400) for every `.tsx` and `.jsx` file. A reporting-only setting is now left out wherever an enforced setting of the same ESLint rule covers the same files, so the error stays.
  - **The review guides agree with the validator (#225).** A rule that applies from a later stage, but whose problem the files already show, was to be `not-applicable` with a finding, which `record_review` refuses, since every finding needs a failing line. The guides now say to mark that rule's line `fail`, with the finding, which says when the rule applies in full.
- peer-ai-standards@1.0.0-next.16
  - peer-ai-workflow@1.0.0-next.16

## 1.0.0-next.15

### Patch Changes

- Updated dependencies [2a0e5e1]
- Updated dependencies [f217df4]
  - peer-ai-workflow@1.0.0-next.15
  - peer-ai-standards@1.0.0-next.15

## 1.0.0-next.14

### Patch Changes

- 6dae453: `peer-ai-eslint-config` works with ESLint 9.30 or later as well as ESLint 10, so an Expo app can stay on the ESLint 9 that Expo's own lint settings target (#206). `peer-ai doctor` says when the installed ESLint is older than 9.30. Its fix for an ESLint config that doesn't use Peer AI's settings now says to rename a `.js` config in a package without `"type": "module"`, or a `.cjs` one, to `eslint.config.mjs`, so following it doesn't make Node warn on every lint run (#203).
- peer-ai-standards@1.0.0-next.14
  - peer-ai-workflow@1.0.0-next.14

## 1.0.0-next.13

### Patch Changes

- Updated dependencies [bd9fad3]
- Updated dependencies [13850d2]
  - peer-ai-workflow@1.0.0-next.13
  - peer-ai-standards@1.0.0-next.13

## 1.0.0-next.12

### Patch Changes

- Updated dependencies [9d53962]
- Updated dependencies [b38f1d8]
  - peer-ai-workflow@1.0.0-next.12
  - peer-ai-standards@1.0.0-next.12

## 1.0.0-next.11

### Patch Changes

- Updated dependencies [cfe9406]
- Updated dependencies [c8ddf71]
  - peer-ai-workflow@1.0.0-next.11
  - peer-ai-standards@1.0.0-next.11

## 1.0.0-next.10

### Patch Changes

- Updated dependencies [9eea4ce]
- Updated dependencies [81a614c]
- Updated dependencies [a473f61]
  - peer-ai-workflow@1.0.0-next.10
  - peer-ai-standards@1.0.0-next.10

## 1.0.0-next.9

### Patch Changes

- Updated dependencies [88de847]
- Updated dependencies [f8fc198]
  - peer-ai-workflow@1.0.0-next.9
  - peer-ai-standards@1.0.0-next.9

## 1.0.0-next.8

### Patch Changes

- Updated dependencies [bb558a4]
  - peer-ai-workflow@1.0.0-next.8
  - peer-ai-standards@1.0.0-next.8

## 1.0.0-next.7

### Patch Changes

- peer-ai-standards@1.0.0-next.7
  - peer-ai-workflow@1.0.0-next.7

## 1.0.0-next.6

### Patch Changes

- peer-ai-standards@1.0.0-next.6
  - peer-ai-workflow@1.0.0-next.6

## 1.0.0-next.5

### Patch Changes

- Updated dependencies [e9ce810]
  - peer-ai-workflow@1.0.0-next.5
  - peer-ai-standards@1.0.0-next.5

## 1.0.0-next.4

### Minor Changes

- f04434c: An existing codebase can adopt Peer AI's enforcement in stages (RFC 0011):
  
  - **`standards.enforcement: "report"`** has the tools run and report without failing a build: the security workflow's jobs run with `continue-on-error`, ESLint runs Peer AI's rules as warnings, and Ruff's settings leave them out until they enforce. `init` and `migrate` write `report` for an existing codebase and `enforce` for a new one. A config without the setting keeps enforcing, so nothing changes until you choose; `doctor` suggests `report` to an existing codebase.
  - **`standards.deferred`** holds back one rule's enforcement until a date or a work item is done, with why and who decided. Reviews still apply it.
  - **A check your own workflows already run isn't added twice.** At your next `render`, a security job whose tool (gitleaks, osv-scanner, zizmor, Semgrep, SSLyze or ZAP) already runs in one of your workflows is left out, and `standards.coveredBy` does the same for a rule you cover with another tool.
  - **`render` says what it wrote:** each job of the security workflow, with its rules, which only report, and what's covered elsewhere. `.peer-ai/enforce/ruff.toml` explains itself in its header. `doctor` lists the stage, each deferral and each check covered elsewhere.

### Patch Changes

- Updated dependencies [f04434c]
  - peer-ai-workflow@1.0.0-next.4
  - peer-ai-standards@1.0.0-next.4

## 1.0.0-next.3

### Patch Changes

- 546ee9b: Each package now ships its changelog, and every release has notes on GitHub that gather what changed across all five packages, with how to update. When `render` moves a project to a new version, it says which version it moves from and links to what changed.
- Updated dependencies [2462b24]
- Updated dependencies [546ee9b]
  - peer-ai-workflow@1.0.0-next.3
  - peer-ai-standards@1.0.0-next.3

## 1.0.0-next.2

### Patch Changes

- Updated dependencies [f6f543e]
  - peer-ai-workflow@1.0.0-next.2
  - peer-ai-standards@1.0.0-next.2

## 1.0.0-next.1

### Patch Changes

- Updated dependencies [c8b7aa9]
  - peer-ai-workflow@1.0.0-next.1
  - peer-ai-standards@1.0.0-next.1

## 1.0.0-next.0

### Major Changes

- a9510fd: The first release of Peer AI 1.0: one package that keeps AI coding tools to a senior team's standard, from the first brief to production.
  
  - **peer-ai:** the `peer-ai` command (`init`, `assess`, `render`, `doctor`, `check`, `check-report`, `check-document`) and the MCP server AI tools connect to (`mcp`), for Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI and any tool that reads `AGENTS.md`.
  - **peer-ai-skills:** 29 skills in the Agent Skills format: 15 reviews, 10 documents and 4 work skills, each proving what it checked.
  - **peer-ai-standards:** 197 rules in 18 domains, plus rules for products that handle money or safety-critical data, and 11 stack profiles with the tools that enforce them.
  - **peer-ai-workflow:** the config, project map, work item and review report formats, with their JSON schemas.
  - **peer-ai-eslint-config:** ESLint settings that enforce a project's stack profiles.

### Patch Changes

- Updated dependencies [a9510fd]
- Updated dependencies [68ca210]
  - peer-ai-workflow@1.0.0-next.0
  - peer-ai-standards@1.0.0-next.0
