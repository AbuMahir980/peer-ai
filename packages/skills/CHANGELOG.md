# peer-ai-skills

## 1.0.0-next.15

### Minor Changes

- f217df4: Two new rules (RFC 0019, for #202):
  
  - **REACT-11: a hook is called by its own name, never passed around as a value.** It's enforced by ESLint's `react-hooks/hooks`, which `peer-ai-eslint-config` turns on for React, React Native and Next.js parts, and catches a hook passed as an argument. `code-review` reads for what the tool can't see: a hook renamed, passed as a prop, or kept in an object. Under the React Compiler, each breaks the component on a later render.
  - **TEST-12: tests run the code the build ships,** with the same compiler, transforms and flags, such as the React Compiler. Where a test runner can't, an end-to-end check of the built app covers the difference. `test-strategy` checks it for the project, `code-review` for a change to the build or test settings, and `qa-acceptance` for an item that adds a compiler or transform.
  
  `code-review` also gains a guide for CODE-16, the framework's own rules: a tool's check counts as evidence only when it runs for the file.

### Patch Changes

- 2a0e5e1: A review says how it checked each automatic rule (RFC 0019, for #202):
  
  - **`standards_for_file` says whether each rule's tool enforces it** for the file's part, as `peer-ai doctor` finds it, with `enforced`, and why not in `notEnforced`: no ESLint config, settings that don't use Peer AI's, the report stage or a deferral, and so on.
  - **A report's coverage line gains `checkedBy`,** `tool` or `reading`, for a pass of an automatic rule. `record_review` refuses `tool` where the tool doesn't enforce the rule in the parts the change touched.
  - **Every result counts the automatic rules checked by reading only,** such as "pass, 2 automatic rules checked by reading only", in `record_review`, `next_work` and `peer-ai check`, so a pass by eye isn't taken for one a tool enforces.
- Updated dependencies [2a0e5e1]
- Updated dependencies [f217df4]
  - peer-ai-workflow@1.0.0-next.15
  - peer-ai-standards@1.0.0-next.15

## 1.0.0-next.14

### Patch Changes

- peer-ai-standards@1.0.0-next.14
  - peer-ai-workflow@1.0.0-next.14

## 1.0.0-next.13

### Patch Changes

- bd9fad3: The map judges a document's evidence, not just its existence (RFC 0018). `assess` flags a document, or a folder of them, that's stale (unchanged for 90 days while its part had 50 commits, or a quarter of its files changed), a byte-for-byte duplicate of another, or about something gone (it names a deleted path or a retired part). Flagged documents are listed under `flagged` in the map with why, and an item whose evidence is all flagged is partial, so `next_work` offers its document skill. List a document meant to stay as it was in `docs.settled`.
- 13850d2: Reviews are sized to the change (RFC 0016):
  
  - **A weak trigger asks for a light review.** That means 20 changed lines or fewer, in files the change didn't add, and nothing about routes, access or sessions. A light review covers the changed lines only and is written with `"depth": "light"`. It applies to code, security, accessibility and design reviews. A light review covers a light requirement; a full requirement still needs a full review.
  - **A person can waive a review for one item,** with why and who decided: `update_work_item` with `waive`, or `npx peer-ai waive <id> <skill> --reason "…" --by "…"`. `peer-ai check` lists every waiver. At production, only a light review can be waived.
- 48ebffd: Peer AI notices when open work items will collide on migrations (RFC 0018). When the current item's branch adds a migration, `next_work` names each other open item whose branch adds one in the same folder, as `migrationCollisions`: whichever merges second needs its migration re-parented, then reviewed again. For Alembic migrations on the same parent revision, two heads are certain, and it says so. `advance_work_item` repeats it at verify and ship as a warning, and `data-migration-review` says it in its report. It reads branches from git, locally or as last fetched, with no network.
- b683f25: `project_map` gives each review's rough size over the whole project, `reviewSizes` (RFC 0016). For each review, it gives the files, lines and rules in its scope, and a size of small, medium or large, with the token range that means. Before a whole-project review starts, the review skill tells the person, and asks whether to run it whole, for one part, or not now.
- bc24e2b: A review of a change answers only for the rules that can apply to the files it touched (RFC 0016). They're worked out the way `standards_for_file` works them out for each file, so a change to a screen doesn't need a coverage line for every database or pipeline rule in the skill. `next_work` gives each required review its `rules`, and `record_review` checks the report against them. A whole-project review still answers for every rule.
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
