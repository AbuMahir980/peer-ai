# peer-ai

## 1.0.0-next.16

### Patch Changes

- 10a83c0: - **`run_verify` from CI asks about the item's own branch (#231).** Where the item's branch isn't checked out, such as when the working copy moved to a branch stacked on it, CI's result is read for the branch as pushed, not for whatever the working copy holds. When GitHub can't tell the result, the message now says the commit may not be pushed yet, as well as that `gh` may not be signed in.
  - **`close-merged` and doctor see merges correctly (#230).** An item at prepare is never closed as merged because another item's branch of the same name merged. A branch whose only unmerged commit is Peer AI's own record, such as the one that closed its item after its pull request merged, now counts as merged.
- 1e0e632: Work items across branches and worktrees:
  
  - **An id is never handed out twice (#234).** `create_work_item` gives the next number after every id taken anywhere: open or closed, in every working copy, and on every local and remote branch as committed. So an id an unmerged branch holds, even in its history, isn't reused from another checkout.
  - **A review is judged by its branch's own config (#236).** When an item's branch is checked out in another worktree, `record_review` checks the report against that worktree's `peer-ai.config.json`, which may enforce what the main checkout's only reports. A change that touches no part, such as one to the root's settings, is judged against the whole project, so a claim that a tool checked a rule can't slip through.
  - **`create_work_item` says where it wrote the item,** as `writtenTo`, since an item lives where its branch is checked out.
- a52ea29: The reviews a change needs come from the right files:
  
  - **Only the branch's own files count (#229).** After a branch merges the default branch to stay current, the files that merge brought in, which other items changed and reviewed, no longer ask for reviews. A file counts when the branch's own commits, or its uncommitted changes, touched it.
  - **An AI feature review needs an import of a model's library (#232),** on an import line, not the library's name anywhere in a file. A string naming a provider, or "replicate" in a comment, no longer asks for one.
  - **A design system asks for design review (#237).** A change to a screen asks for `design-review` when the project map finds a design system, such as design tokens or a design document, even without a `design` section in the config.
- b04a81e: `standards_for_file` gives the right rules and enforcement for two kinds of file:
  
  - **A dependency manifest or lockfile** gets the delivery rules for its dependencies, such as pinned versions, watched vulnerabilities, the expected registry and licences, and no longer the code's TypeScript, React or Python rules (#224). So a change to `package.json` gives `dependency-review` its rules to answer for, rather than none (#227).
  - **A file in no part of the project,** such as a settings file at the root, is never told a rule is enforced: Peer AI's settings for ESLint, Ruff and the compiler check only the parts' files, so each such rule says `enforced: false`, with that reason (#223).
- Updated dependencies [2deff7f]
  - peer-ai-skills@1.0.0-next.16
  - peer-ai-standards@1.0.0-next.16
  - peer-ai-workflow@1.0.0-next.16

## 1.0.0-next.15

### Minor Changes

- 2a0e5e1: A review says how it checked each automatic rule (RFC 0019, for #202):
  
  - **`standards_for_file` says whether each rule's tool enforces it** for the file's part, as `peer-ai doctor` finds it, with `enforced`, and why not in `notEnforced`: no ESLint config, settings that don't use Peer AI's, the report stage or a deferral, and so on.
  - **A report's coverage line gains `checkedBy`,** `tool` or `reading`, for a pass of an automatic rule. `record_review` refuses `tool` where the tool doesn't enforce the rule in the parts the change touched.
  - **Every result counts the automatic rules checked by reading only,** such as "pass, 2 automatic rules checked by reading only", in `record_review`, `next_work` and `peer-ai check`, so a pass by eye isn't taken for one a tool enforces.

### Patch Changes

- 6346cbc: A file a change deleted no longer asks for a code, security, accessibility or design review, counts toward a weak trigger's changed lines, or adds its rules to those reviews' scope (#216): there's no code left in it to review. A deleted migration, dependency file or pipeline still asks for its own review, since deleting one matters.
- 1e838b3: `peer-ai migrate` now says to make its decisions on the migration's branch, before it merges (#215). The gate it adds holds that branch's pull request to the `migrate-v0` work item, and v0's instructions often held the project's own rules, which the decisions bring back. Its closing message, `docs/peer-ai-migration.md`, the work item and the README's steps say the same, and the README adds the step of shipping `migrate-v0` before the pull request.
- 1e838b3: `peer-ai migrate` no longer copies v0's own wording into the instructions every session reads (#217). A phase's "**Skills to use here.**" header, and a line that only names an add-on and what it's for, are left out, since `also` holds the add-on. A note that says a phase has no skill, where 1.0 has one, becomes a decision in `docs/peer-ai-migration.md` instead of a note. The rest of each note is converted as before, and the whole of `phase-config.json` stays in the migration notes. On a real v0 project, this cut the converted notes from 48 to 22.
- Updated dependencies [2a0e5e1]
- Updated dependencies [f217df4]
  - peer-ai-workflow@1.0.0-next.15
  - peer-ai-skills@1.0.0-next.15
  - peer-ai-standards@1.0.0-next.15

## 1.0.0-next.14

### Patch Changes

- 7777291: Moving a work item to build no longer leaves out commits already made on its branch (#205). Its base is now where its branch leaves the default branch, so a dependency or settings change committed while the item was at prepare still decides the reviews it needs. A branch stacked on another open item's branch starts where it leaves that branch, as before, even after the parent gains commits of its own.
- 6dae453: `peer-ai-eslint-config` works with ESLint 9.30 or later as well as ESLint 10, so an Expo app can stay on the ESLint 9 that Expo's own lint settings target (#206). `peer-ai doctor` says when the installed ESLint is older than 9.30. Its fix for an ESLint config that doesn't use Peer AI's settings now says to rename a `.js` config in a package without `"type": "module"`, or a `.cjs` one, to `eslint.config.mjs`, so following it doesn't make Node warn on every lint run (#203).
- 974cd0c: When an AI tool is still connected to an older Peer AI after an update merges, its tools no longer just call the config invalid (#201). They say the project now uses the newer version, naming it and where it's pinned, and ask for the AI tool to be reconnected, with what the older version doesn't recognise below. `peer-ai render` says to reconnect right after the update merges when it moves a project to a new version, and so does the update pull request.
- 83e1ad5: In the report stage, `peer-ai doctor` says what reporting means for each tool: how many ESLint rules are warnings, how many Ruff rules are left out of Peer AI's Ruff file (Ruff has no warnings), and how many security checks report without failing (#204). It also names the staged route for making some checks block while others keep reporting: `enforce`, with the rules that aren't ready in `standards.deferred`, each until the work item that fixes them.
- peer-ai-skills@1.0.0-next.14
  - peer-ai-standards@1.0.0-next.14
  - peer-ai-workflow@1.0.0-next.14

## 1.0.0-next.13

### Minor Changes

- bd9fad3: The map judges a document's evidence, not just its existence (RFC 0018). `assess` flags a document, or a folder of them, that's stale (unchanged for 90 days while its part had 50 commits, or a quarter of its files changed), a byte-for-byte duplicate of another, or about something gone (it names a deleted path or a retired part). Flagged documents are listed under `flagged` in the map with why, and an item whose evidence is all flagged is partial, so `next_work` offers its document skill. List a document meant to stay as it was in `docs.settled`.
- 13850d2: Reviews are sized to the change (RFC 0016):
  
  - **A weak trigger asks for a light review.** That means 20 changed lines or fewer, in files the change didn't add, and nothing about routes, access or sessions. A light review covers the changed lines only and is written with `"depth": "light"`. It applies to code, security, accessibility and design reviews. A light review covers a light requirement; a full requirement still needs a full review.
  - **A person can waive a review for one item,** with why and who decided: `update_work_item` with `waive`, or `npx peer-ai waive <id> <skill> --reason "…" --by "…"`. `peer-ai check` lists every waiver. At production, only a light review can be waived.
- 48ebffd: Peer AI notices when open work items will collide on migrations (RFC 0018). When the current item's branch adds a migration, `next_work` names each other open item whose branch adds one in the same folder, as `migrationCollisions`: whichever merges second needs its migration re-parented, then reviewed again. For Alembic migrations on the same parent revision, two heads are certain, and it says so. `advance_work_item` repeats it at verify and ship as a warning, and `data-migration-review` says it in its report. It reads branches from git, locally or as last fetched, with no network.
- b683f25: `project_map` gives each review's rough size over the whole project, `reviewSizes` (RFC 0016). For each review, it gives the files, lines and rules in its scope, and a size of small, medium or large, with the token range that means. Before a whole-project review starts, the review skill tells the person, and asks whether to run it whole, for one part, or not now.
- bc24e2b: A review of a change answers only for the rules that can apply to the files it touched (RFC 0016). They're worked out the way `standards_for_file` works them out for each file, so a change to a screen doesn't need a coverage line for every database or pipeline rule in the skill. `next_work` gives each required review its `rules`, and `record_review` checks the report against them. A whole-project review still answers for every rule.

### Patch Changes

- Updated dependencies [bd9fad3]
- Updated dependencies [13850d2]
- Updated dependencies [48ebffd]
- Updated dependencies [b683f25]
- Updated dependencies [bc24e2b]
  - peer-ai-workflow@1.0.0-next.13
  - peer-ai-skills@1.0.0-next.13
  - peer-ai-standards@1.0.0-next.13

## 1.0.0-next.12

### Minor Changes

- 9d53962: Peer AI's own files stay tidy (RFC 0017):
  
  - **A work item that's done or cancelled leaves the tree** in that same change. Its file and its reports are removed, and it becomes one line in `.peer-ai/history/<year>-<month>.jsonl`, which git's union merge joins when several branches close items at once. `peer-ai render` now always writes a `.gitattributes` block for that. `work_item`, `peer-ai work show`, dependencies and `fixes` still read a closed item, and `peer-ai work show <id> --full` reads its full file back from git.
  - **Recording a review again removes the report it replaces.**
  - **`npx peer-ai tidy`** moves the closed items already in a project into the history, and removes reports of items that are gone, after asking. `peer-ai doctor` warns while there's anything to tidy.
  
  After updating, run `npx peer-ai render`, then `npx peer-ai tidy`, and commit both on a branch.
- b38f1d8: A part of the project can be retired (RFC 0017):
  
  - **A track's status can be `retired`.** It needs no folder, and the instructions say it's no longer part of the product. Its work items stay valid and readable, and no new item goes on it.
  - **A work item's track can change,** with `track` on `update_work_item`, or `npx peer-ai work move <id> <track>`.
  - **A track is checked only when it's set.** An item whose track was retired or removed can still be advanced, updated or cancelled, and `doctor` and `check` warn about it instead of failing.
  
  If you kept a removed app's track as `external` to keep its items working, set it to `retired` instead.

### Patch Changes

- Updated dependencies [9d53962]
- Updated dependencies [b38f1d8]
  - peer-ai-workflow@1.0.0-next.12
  - peer-ai-skills@1.0.0-next.12
  - peer-ai-standards@1.0.0-next.12

## 1.0.0-next.11

### Minor Changes

- cb81a83: `init` and `migrate` ask which open findings in a review block a merge: critical only, or critical and high. They suggest high for a product in production, and write `gates.blockOn` (RFC 0015). `peer-ai doctor` warns when a project in production lets high findings ship. To have high findings block, set `"gates": { "blockOn": "high" }`.
- cfe9406: Whole-project reviews are recorded (RFC 0015). `record_review` without a work item now keeps the review in `.peer-ai/project-reviews.json`: the latest from each skill, with its open findings at the blocking level or high.
  
  - **A work item can list the findings it fixes** in `fixes`, as `skill#finding`, such as `security-review#F-3`.
  - **`next_work` gives `projectFindings`:** the open critical findings, and the critical and high ones no work item covers, so none is dropped.
  - **`peer-ai check` warns about open critical findings,** and fails on them at the production stage. It also warns about findings no work item covers.
  - **Each review skill's last step,** after a whole-project review, groups the open findings into work items with the person.
- c8ddf71: Review results mean what they say (RFC 0015):
  
  - **A recorded review keeps how many findings it leaves open at each severity,** and is shown that way: in `record_review`'s reply, in `next_work`'s reviews, and in `peer-ai check`. For example, "pass, 7 high open". A pass is never read as all clear. `peer-ai check` also warns about items at ship or done with high findings open below the blocking level.
  - **A `qa-acceptance` review fails on any acceptance criterion that doesn't hold,** whatever its finding's severity. After that, `update_work_item` changes the criteria only with a `reason` and who decided (`by`), which the item records.

### Patch Changes

- ed83bb0: `whatChanged` in `next_work` no longer cuts a change short at a colon inside a quote, such as "How we work: Peer AI".
- Updated dependencies [cfe9406]
- Updated dependencies [c8ddf71]
  - peer-ai-workflow@1.0.0-next.11
  - peer-ai-skills@1.0.0-next.11
  - peer-ai-standards@1.0.0-next.11

## 1.0.0-next.10

### Minor Changes

- 9eea4ce: With `"docs": { "readme": true }`, `peer-ai render` keeps a section for people in the project's `README.md`, "How we work: Peer AI", between markers (RFC 0014). It opens with three short lines: what Peer AI does here, that nobody needs to install it, and `npx peer-ai doctor`. The rest is folded into `<details>` sections: the stage, what a pull request needs, the checks and any deferrals, and how updates work. It's written from the config, so it stays true as the config changes. It's off unless asked for.
- df721db: Sent feedback stays tidy (RFC 0014):
  
  - **`peer-ai feedback`** now also lists the reports already sent, each with its issue's state, open or closed and when, from GitHub through `gh`.
  - **`peer-ai feedback prune`** removes the sent reports whose issues are closed, after listing them and asking. `--yes` doesn't ask. Open ones stay.
  - **`draft_feedback`** says when a new draft looks like a report this project already sent, naming the issue and its state, so a duplicate or an already-fixed report isn't sent again.
- 81a614c: With `"updates": { "pullRequest": true }`, on GitHub Actions, `peer-ai render` writes `.github/workflows/peer-ai-update.yml` (RFC 0014). Once a day it opens a pull request, "Update Peer AI to <version>", when a newer release is out, with `render` already run on its branch. CI doesn't start on a pull request opened with the workflow's own token, so add a `PEER_AI_UPDATE_TOKEN` secret for CI to run by itself; without one, close and reopen the pull request. A project with `peer-ai` in its `package.json` is left to Dependabot or Renovate.
- a473f61: `peer-ai doctor`, and through it `next_work` at the start of each session, now says when a newer Peer AI is out than the project uses, with where to read what changed and how to update (RFC 0014).
  
  It asks npm at most once a day per machine, keeping the answer in your cache folder, never in the project. Offline and in CI it says nothing, and it never fails a build. To stay on a version on purpose, set `"updates": { "notify": false }` in `peer-ai.config.json`.
- 31474a9: At a person's first session after the project's Peer AI version changes, `next_work` gives `whatChanged`: a line per change since their last session, from the changelog that ships with the package (RFC 0014). The AI tool tells them in a few plain words, once, then carries on. Each machine remembers the version of its last session per project, in its cache folder, never in the project.

### Patch Changes

- 415c3b2: `whatChanged` in `next_work` no longer cuts a change short at a full stop or a colon inside code, such as `"docs": { "readme": true }`.
- Updated dependencies [9eea4ce]
- Updated dependencies [81a614c]
- Updated dependencies [a473f61]
  - peer-ai-workflow@1.0.0-next.10
  - peer-ai-skills@1.0.0-next.10
  - peer-ai-standards@1.0.0-next.10

## 1.0.0-next.9

### Minor Changes

- 88de847: CI's run of the verify command can count as the verify (RFC 0013), so nobody runs a slow verify again on a laptop.
  
  Set `commands.verifyCheck` to the CI check that runs it on every pull request, as GitHub names it, such as `"ci / check"`. Then:
  
  - **`run_verify` with `from: "ci"`** takes that check's result on the item's latest pushed commit from GitHub through `gh`, and records it with a link to the run.
  - **Moving an item to ship** takes it automatically, and says what's still missing. So does the new `npx peer-ai ship`.
  - **`peer-ai check` confirms it with GitHub.** Run `npx peer-ai render` after setting `verifyCheck`, so the gate's workflow gets `checks: read` and the run's token.
- f8fc198: Work whose branch is already merged can be closed without being verified again (RFC 0013). This covers work merged before the ship gate, or while `peer-ai check` wasn't a required check.
  
  - **`npx peer-ai close-merged`** lists every open item whose branch is merged, then asks and closes them. It finds merge commits and fast-forwards with git. It also finds squash and rebase merges whose files are all in the default branch, and asks GitHub through `gh` about the rest, including deleted branches. Each item records how it closed: `"closed": { "by": "merge", … }`.
  - **`advance_work_item` to `done`** does the same for one item when its branch is merged.
  - **`peer-ai check`** accepts these items and lists them.
  - **`peer-ai doctor`** warns when open items look merged.
  
  After updating, run `npx peer-ai close-merged` to close the items already merged, then commit the change on a branch.
- 68391a5: Two changes to the gate, from RFC 0013:
  
  - **A review survives a merge from the base branch** when the merge brings in none of the files the branch itself changes. Merging the main branch to resolve a conflict no longer makes every review stale. A review is stale only when a file the item changes has changed since it. The verify still has to be on the latest commit, since merged code can break the build.
  - **`peer-ai check` writes what it found to the job's summary on GitHub Actions,** which shows on the pull request's checks: each problem with its fix.

### Patch Changes

- Updated dependencies [88de847]
- Updated dependencies [f8fc198]
  - peer-ai-workflow@1.0.0-next.9
  - peer-ai-skills@1.0.0-next.9
  - peer-ai-standards@1.0.0-next.9

## 1.0.0-next.8

### Minor Changes

- bb558a4: The MCP server's replies fit what an AI tool can take in (RFC 0012):
  
  - **`next_work`** returns the current branch's item in full and every other open item in one line (id, title, stage, branch, part, next action and `waitingFor`), at most 50, so a project with dozens of open items no longer goes over the MCP output limit. `waitingFor` on each item replaces the separate `waiting` map.
  - **A new tool, `work_item`,** returns any item in full by its id.
  - **`standards_for_file`** chooses rules by what the file is (CI pipeline, build file, infrastructure, dependency manifest, migration, test, document, tool settings or source code) and the language it's in, as well as its part. So a TypeScript file no longer gets Python rules, and a CI workflow gets 38 rules instead of 189. Each rule comes as its id, title and severity, and `ruleIds` returns the full text of the ones asked for.
  - **`peer-ai doctor`** warns about a part that names no stack while profiles are listed, with the stack detection finds for it.
  
  After updating, reconnect each AI tool to Peer AI so it reads the new tools.

### Patch Changes

- Updated dependencies [bb558a4]
  - peer-ai-workflow@1.0.0-next.8
  - peer-ai-skills@1.0.0-next.8
  - peer-ai-standards@1.0.0-next.8

## 1.0.0-next.7

### Patch Changes

- c48acba: The package no longer includes `dist/test-helpers.js` and `dist/test-helpers.d.ts`, which only Peer AI's own tests use. The commands and the MCP server are unchanged, so there's nothing to do when you update.
- 9d737f1: While enforcement only reports (`standards.enforcement: "report"`, or a deferred rule), the security workflow's jobs now finish green on a pull request instead of showing a red cross. `continue-on-error` moves from the job to its check step, and a last step raises a warning and writes to the job's summary when the check found something, so findings are visible without looking like a failure. Run `npx peer-ai render` to update `.github/workflows/peer-ai-security.yml`; a workflow that enforces is unchanged.
- 7bd9cd7: `assess` no longer suggests the `safety-critical` trait from the word "diagnosis" alone, which also names a fault in a vehicle, a device or a system. Names that only a product about health or physical safety has, such as `allergens`, `medication` or `dosage`, still suggest it. If `doctor` warned about the trait because of that word, the warning goes away after updating, with no need to decline it.
- peer-ai-skills@1.0.0-next.7
  - peer-ai-standards@1.0.0-next.7
  - peer-ai-workflow@1.0.0-next.7

## 1.0.0-next.6

### Minor Changes

- e52b06c: `peer-ai doctor`, and through it `next_work`, now say when the Peer AI running isn't the version the project uses (RFC 0011). After an update merges, an AI tool whose MCP server still runs the old version is told to reconnect, so its tools and CI agree; a project behind the version run is told how to move to it. The README gains "Updating while agents work": let agents finish or pause, update and merge, reconnect each AI tool, then resume.

### Patch Changes

- peer-ai-skills@1.0.0-next.6
  - peer-ai-standards@1.0.0-next.6
  - peer-ai-workflow@1.0.0-next.6

## 1.0.0-next.5

### Minor Changes

- e9ce810: `init` and `migrate` take up the stack profiles and traits `assess` suggests (RFC 0011). They show each one with why it was suggested, all ticked, and ask why about any you untick; `--yes` takes them all. A new top-level `declined` records a suggestion the project decided against, with why, so it isn't suggested again.
  
  `peer-ai doctor` now warns about a suggestion the config has neither taken up nor declined. On a project set up before this release, run `npx peer-ai doctor` after updating: for each one, add it to `standards.profiles` or `project.traits`, or list it in `declined` with the reason. If the project's enforcement isn't staged yet, set `standards.enforcement` to `report` first, so a new profile reports before it blocks.

### Patch Changes

- Updated dependencies [e9ce810]
  - peer-ai-workflow@1.0.0-next.5
  - peer-ai-skills@1.0.0-next.5
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
  - peer-ai-skills@1.0.0-next.4
  - peer-ai-standards@1.0.0-next.4

## 1.0.0-next.3

### Minor Changes

- 1d8a859: `check_document` takes the branch of an agent working in a git worktree of its own, and checks that worktree's copy of the document instead of the main working copy's (RFC 0010).
- 84bdfa2: A work item now lives on its branch, wherever that's checked out (RFC 0010). The tools read and write it, and `run_verify` runs, in the working copy where the item's branch is checked out, the main one or any git worktree, so agents working in parallel worktrees never touch each other's items, and switching branches never rolls one back. `next_work` takes the branch of an agent in a worktree of its own. `run_verify` refuses while that working copy has changes not yet committed, since a verify proves a commit. New ids are unique across worktrees, and moving an item to build records the commit it starts from.
- 47779fb: On a pull request, `peer-ai check` now fails until the work item on its branch is at ship, so a change can't merge before it's verified and reviewed (RFC 0010). It reads the branch from the pull request on GitHub Actions, or from the new `--branch`; a branch with no work item, such as a dependency update, passes. The reviews an item needs now come from its own commits since it started, so a stacked branch isn't asked for its parents' reviews and a merge can't erase them, and whitespace-only changes no longer count. `peer-ai doctor`, and through it `next_work`, warns when an item is still at prepare while its branch has commits, or when its verify or a review looked at an older commit. The CI gate's workflow now checks out the pull request's own commit, with its history.
- 2462b24: A work item's record now names the commit each verify and review looked at, and moving to ship needs them on the branch's latest commit, or on one with no change since outside `.peer-ai/` (RFC 0010). At the MVP stage, a missing required review now fails for the item being worked on, where it only warned before; items finished before keep the old rule. `record_review` takes reports only from `.peer-ai/reports/`, and recording the same skill again replaces the earlier review instead of adding one. Records made before this change count until the item next moves to ship.

### Patch Changes

- c1852e1: `peer-ai assess` no longer counts a document in a folder of retired ones, such as `docs/archive/` or `docs/retired/`, as evidence for the project map: a spec moved there is history, not the project's current spec.
- 546ee9b: Each package now ships its changelog, and every release has notes on GitHub that gather what changed across all five packages, with how to update. When `render` moves a project to a new version, it says which version it moves from and links to what changed.
- Updated dependencies [2462b24]
- Updated dependencies [546ee9b]
  - peer-ai-workflow@1.0.0-next.3
  - peer-ai-standards@1.0.0-next.3
  - peer-ai-skills@1.0.0-next.3

## 1.0.0-next.2

### Minor Changes

- f6f543e: `render` sets up the CI gate, `peer-ai check`, so no one has to remember to (RFC 0009). On GitHub Actions it writes `.github/workflows/peer-ai.yml`, which installs Node 24 and runs the exact version of Peer AI, so it works with or without a `package.json`; for any other CI it prints the step to add. `peer-ai doctor` warns when no CI runs the gate, and `migrate` notes that the check should be made required. `delivery.gate: false` turns it off.

### Patch Changes

- Updated dependencies [f6f543e]
  - peer-ai-workflow@1.0.0-next.2
  - peer-ai-skills@1.0.0-next.2
  - peer-ai-standards@1.0.0-next.2

## 1.0.0-next.1

### Minor Changes

- c8b7aa9: `peer-ai migrate` moves a project from its copy of v0 onto the package (RFC 0008). It converts v0's project settings, `phase-config.json`, the project's standards documents and the work in progress, takes v0's text out of the instruction files, and copies everything that needs a decision into `docs/peer-ai-migration.md`, with a work item that brings it up in the next session. It never commits. `peer-ai doctor` now suggests it for a leftover v0 folder.
- 1f9804b: `render` writes the project's settings for models, skills and activities into the instructions it gives each AI tool: the models to use, each skill's add-ons, checklists and notes, and each activity's files to read first and notes. The config already accepted these settings, but nothing passed them on (RFC 0008).

### Patch Changes

- Updated dependencies [c8b7aa9]
  - peer-ai-workflow@1.0.0-next.1
  - peer-ai-skills@1.0.0-next.1
  - peer-ai-standards@1.0.0-next.1

## 1.0.0-next.0

### Major Changes

- a9510fd: The first release of Peer AI 1.0: one package that keeps AI coding tools to a senior team's standard, from the first brief to production.
  
  - **peer-ai:** the `peer-ai` command (`init`, `assess`, `render`, `doctor`, `check`, `check-report`, `check-document`) and the MCP server AI tools connect to (`mcp`), for Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI and any tool that reads `AGENTS.md`.
  - **peer-ai-skills:** 29 skills in the Agent Skills format: 15 reviews, 10 documents and 4 work skills, each proving what it checked.
  - **peer-ai-standards:** 197 rules in 18 domains, plus rules for products that handle money or safety-critical data, and 11 stack profiles with the tools that enforce them.
  - **peer-ai-workflow:** the config, project map, work item and review report formats, with their JSON schemas.
  - **peer-ai-eslint-config:** ESLint settings that enforce a project's stack profiles.

### Minor Changes

- 68ca210: Setup checks and feedback that run themselves (RFC 0007). `peer-ai check` fails on anything `peer-ai doctor` fails on, and `next_work` gives the AI tool every setup problem with its fix at the start of each session. When Peer AI gets something wrong, the AI tool drafts a report with the new `draft_feedback` tool, which refuses code, keys and email addresses; the new `peer-ai feedback` command lists, sends or drops the drafts, and sends one only after a person approves. `render` keeps `.peer-ai/feedback/` out of git.

### Patch Changes

- Updated dependencies [a9510fd]
- Updated dependencies [68ca210]
  - peer-ai-workflow@1.0.0-next.0
  - peer-ai-standards@1.0.0-next.0
  - peer-ai-skills@1.0.0-next.0
