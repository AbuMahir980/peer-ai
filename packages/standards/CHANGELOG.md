# peer-ai-standards

## 1.0.0-next.16

### Patch Changes

- peer-ai-workflow@1.0.0-next.16

## 1.0.0-next.15

### Minor Changes

- f217df4: Two new rules (RFC 0019, for #202):
  
  - **REACT-11: a hook is called by its own name, never passed around as a value.** It's enforced by ESLint's `react-hooks/hooks`, which `peer-ai-eslint-config` turns on for React, React Native and Next.js parts, and catches a hook passed as an argument. `code-review` reads for what the tool can't see: a hook renamed, passed as a prop, or kept in an object. Under the React Compiler, each breaks the component on a later render.
  - **TEST-12: tests run the code the build ships,** with the same compiler, transforms and flags, such as the React Compiler. Where a test runner can't, an end-to-end check of the built app covers the difference. `test-strategy` checks it for the project, `code-review` for a change to the build or test settings, and `qa-acceptance` for an item that adds a compiler or transform.
  
  `code-review` also gains a guide for CODE-16, the framework's own rules: a tool's check counts as evidence only when it runs for the file.

### Patch Changes

- Updated dependencies [2a0e5e1]
  - peer-ai-workflow@1.0.0-next.15

## 1.0.0-next.14

### Patch Changes

- peer-ai-workflow@1.0.0-next.14

## 1.0.0-next.13

### Patch Changes

- Updated dependencies [bd9fad3]
- Updated dependencies [13850d2]
  - peer-ai-workflow@1.0.0-next.13

## 1.0.0-next.12

### Patch Changes

- Updated dependencies [9d53962]
- Updated dependencies [b38f1d8]
  - peer-ai-workflow@1.0.0-next.12

## 1.0.0-next.11

### Patch Changes

- Updated dependencies [cfe9406]
- Updated dependencies [c8ddf71]
  - peer-ai-workflow@1.0.0-next.11

## 1.0.0-next.10

### Patch Changes

- Updated dependencies [9eea4ce]
- Updated dependencies [81a614c]
- Updated dependencies [a473f61]
  - peer-ai-workflow@1.0.0-next.10

## 1.0.0-next.9

### Patch Changes

- Updated dependencies [88de847]
- Updated dependencies [f8fc198]
  - peer-ai-workflow@1.0.0-next.9

## 1.0.0-next.8

### Patch Changes

- Updated dependencies [bb558a4]
  - peer-ai-workflow@1.0.0-next.8

## 1.0.0-next.7

### Patch Changes

- peer-ai-workflow@1.0.0-next.7

## 1.0.0-next.6

### Patch Changes

- peer-ai-workflow@1.0.0-next.6

## 1.0.0-next.5

### Patch Changes

- Updated dependencies [e9ce810]
  - peer-ai-workflow@1.0.0-next.5

## 1.0.0-next.4

### Patch Changes

- Updated dependencies [f04434c]
  - peer-ai-workflow@1.0.0-next.4

## 1.0.0-next.3

### Patch Changes

- 546ee9b: Each package now ships its changelog, and every release has notes on GitHub that gather what changed across all five packages, with how to update. When `render` moves a project to a new version, it says which version it moves from and links to what changed.
- Updated dependencies [2462b24]
- Updated dependencies [546ee9b]
  - peer-ai-workflow@1.0.0-next.3

## 1.0.0-next.2

### Patch Changes

- Updated dependencies [f6f543e]
  - peer-ai-workflow@1.0.0-next.2

## 1.0.0-next.1

### Patch Changes

- Updated dependencies [c8b7aa9]
  - peer-ai-workflow@1.0.0-next.1

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
