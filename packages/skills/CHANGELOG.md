# peer-ai-skills

## 1.0.0-next.12

### Patch Changes

- Updated dependencies [9d53962]
- Updated dependencies [b38f1d8]
  - peer-ai-workflow@1.0.0-next.12
  - peer-ai-standards@1.0.0-next.12

## 1.0.0-next.11

### Patch Changes

- cfe9406: Whole-project reviews are recorded (RFC 0015). `record_review` without a work item now keeps the review in `.peer-ai/project-reviews.json`: the latest from each skill, with its open findings at the blocking level or high.
  
  - **A work item can list the findings it fixes** in `fixes`, as `skill#finding`, such as `security-review#F-3`.
  - **`next_work` gives `projectFindings`:** the open critical findings, and the critical and high ones no work item covers, so none is dropped.
  - **`peer-ai check` warns about open critical findings,** and fails on them at the production stage. It also warns about findings no work item covers.
  - **Each review skill's last step,** after a whole-project review, groups the open findings into work items with the person.
- c8ddf71: Review results mean what they say (RFC 0015):
  
  - **A recorded review keeps how many findings it leaves open at each severity,** and is shown that way: in `record_review`'s reply, in `next_work`'s reviews, and in `peer-ai check`. For example, "pass, 7 high open". A pass is never read as all clear. `peer-ai check` also warns about items at ship or done with high findings open below the blocking level.
  - **A `qa-acceptance` review fails on any acceptance criterion that doesn't hold,** whatever its finding's severity. After that, `update_work_item` changes the criteria only with a `reason` and who decided (`by`), which the item records.
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

- bb558a4: The MCP server's replies fit what an AI tool can take in (RFC 0012):
  
  - **`next_work`** returns the current branch's item in full and every other open item in one line (id, title, stage, branch, part, next action and `waitingFor`), at most 50, so a project with dozens of open items no longer goes over the MCP output limit. `waitingFor` on each item replaces the separate `waiting` map.
  - **A new tool, `work_item`,** returns any item in full by its id.
  - **`standards_for_file`** chooses rules by what the file is (CI pipeline, build file, infrastructure, dependency manifest, migration, test, document, tool settings or source code) and the language it's in, as well as its part. So a TypeScript file no longer gets Python rules, and a CI workflow gets 38 rules instead of 189. Each rule comes as its id, title and severity, and `ruleIds` returns the full text of the ones asked for.
  - **`peer-ai doctor`** warns about a part that names no stack while profiles are listed, with the stack detection finds for it.
  
  After updating, reconnect each AI tool to Peer AI so it reads the new tools.
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
