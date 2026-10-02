# RFC 0010: A record that follows the branch and its commits

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Proposal issue | #127 |

## Summary

A work item's record should prove what happened to its own change. Today it can't, because nothing in it names a commit or a branch. This RFC ties the record to both:

- every verify and review records the commit it looked at;
- moving to ship needs them on the branch's latest commit;
- the reviews a change needs are worked out from the item's own commits, and kept after it merges;
- on a pull request, the CI gate asks for the branch's item to be at ship.

The tools also stop working on whatever happens to be checked out. They find the copy of the work item on its own branch, wherever that is checked out, and run verify there. That lets parallel agents and stacked branches work without touching each other.

## Motivation

The first project to use 1.0 every day, with a Python API, mobile apps and Terraform, run by one person with several AI agents in parallel worktrees and stacked branches, found the gaps within two days. Six of its reports are about this one problem:

- **A verify and the reviews checked different code** (#122). One item's verify ran on a stacked branch six commits ahead of the item's own; its eight reviews looked at the item's own branch. The ship gate accepted both, because neither records a commit. New commits after a review don't make it stale either.
- **Verify ran on someone else's branch** (#112). `run_verify` runs in the main working copy, whatever is checked out there. Agents in their own worktrees had to be told not to call it and to paste their test output instead: the unproven "it passed" the tool exists to prevent.
- **Unreviewed code merged, and the gate let it** (#116). A pull request merged while its item was at verify, with none of its eight required reviews. At the MVP stage a missing review is only a warning, and the gate fails only on items that claim more than their record. An item that's behind passes. After the merge, the diff against the main branch is empty, so moving the item on would have asked for no reviews at all. Files also changed while an item was still at prepare, and nothing noticed.
- **A stacked branch was asked for its parents' reviews** (#110). An item that only moved files was asked for seven reviews, because the required reviews come from the whole diff against the main branch, two unmerged parents included.
- **State on one branch, tools on another** (#118). The work item files live on each branch, but the tools always write to the main working copy. Agents in worktrees changed item files belonging to a different branch. Switching branches meant stashing item files first. Several times an item's stage silently went back after a branch switch.
- **Reports in the wrong place, recorded twice** (#121). `record_review` accepted reports inside an agent's worktree, which break when the worktree goes. Recording again only appends, so one item lists sixteen reviews for eight.

Each of these alone makes the record something to trust rather than check. Together, they leave the promise "Proof, not promises" unkept on exactly the kind of project Peer AI is for.

## Design

### 1. Every record names its commit

`lastVerify` and each entry in `reviews` gain `commit`: the full id of the commit they looked at. `run_verify` and `record_review` fill it in. For a review, it is the commit checked out where the report was written, so the reviewer and the record agree.

### 2. A work item's home is its branch

A work item's file belongs to its branch: it travels with the change and merges with it, as now. What changes is where the tools read and write it:

- **The item's home** is the working copy where its `branch` is checked out: the main one, or any worktree `git worktree list` shows. Every tool that names an item reads and writes the item's file there. When the branch isn't checked out anywhere, the tool says so, with the command to check it out.
- **`create_work_item`** writes the new item where its branch is checked out, and records `base`: the commit the branch started from. For a branch stacked on another, that's the parent's commit, not the main branch's.
- **`next_work`** takes an optional `branch`, so an agent in its own worktree gets its own item rather than the main working copy's.

Two agents on two branches then update their items without touching each other or the person's working copy, and switching branches never rolls an item back.

### 3. Verify runs on the item's branch

`run_verify` runs the verify command in the item's home. It refuses when that working copy has uncommitted changes outside `.peer-ai/`, since a verify proves a commit:

> The verify for PAN-7 runs on a commit, and app/screens/list.tsx isn't committed. Commit it, then verify.

It records the result with the commit (section 1). Agents verify their own items, and nobody pastes test output.

### 4. Required reviews come from the item's own commits

When an item moves to verify, the files its change touched are the diff from its `base` to its branch's latest commit. Files whose only changes are whitespace or blank lines don't count. The reviews worked out from them are stored on the item, as now, and kept after the merge, so merging can't erase them. A stacked item is asked only for its own reviews. An item with no `base`, created before this change, keeps today's rule.

### 5. Ship needs evidence from the latest commit

Moving to ship, and the gate on a ship claim, need:

- **a passing verify, and every required review,** each on the branch's latest commit, or on a commit with no changes since outside `.peer-ai/`. Recording a review commits nothing but Peer AI's own files, so that doesn't make it stale;
- **every required review at the MVP stage as well as production.** A missing one fails, where today it only warns at MVP. A prototype is still only told, by `next_work`.

When something is stale, the refusal says which, and why:

> PAN-7 can't move to ship: its code-review looked at 3f2a91c, and src/api/orders.py has changed since. Review it again.

Items already at ship or done keep their stage. The rule applies from the next time an item moves.

### 6. The CI gate asks for the branch's item

On a pull request, `peer-ai check` finds the work item whose `branch` is the pull request's branch:

| Situation | What the gate does |
|-----------|--------------------|
| The item is at ship or done, with fresh evidence | Passes |
| The item is behind: prepare, build or verify | Fails: "PAN-7 is at verify, so this change isn't verified and reviewed yet. Move it to ship first." |
| No work item names this branch | Passes, and says so. That covers updates from Dependabot and other changes made without Peer AI. |

`check` reads the branch from the pull request (`GITHUB_HEAD_REF` on GitHub Actions) or from `--branch`. The workflow `render` writes (RFC 0009) checks out the pull request's own commit with its history, so the commits each record names are there to compare.

### 7. When the record falls behind

`next_work` and `doctor` warn when:

- **an item is at prepare while its branch has commits since its `base`:** "PAN-7 is at prepare, but its branch has 3 commits. Move it to build, and say what changed";
- **the branch has moved on since the item's verify or reviews:** the stale ones are named, with the commit each looked at.

### 8. One review per skill, and reports where they belong

- **`record_review` accepts a report only under `.peer-ai/reports/`** in the item's home. An agent in its own worktree writes there, since that worktree is the item's home.
- **Recording the same skill again replaces the earlier entry** instead of adding one. The earlier report stays in git history. An item lists one review per skill: the latest.

## Compatibility

Minor. The work item gains three optional fields, `base`, `lastVerify.commit` and `reviews[].commit`, and `next_work` gains an optional `branch`. Items written before keep working. Without a commit, a verify or review counts as stale at the next move to ship, so it's taken again once. Without a `base`, an item keeps today's required reviews.

Two behaviours are stricter on purpose. At the MVP stage, a missing required review now fails a ship claim. And the gate on a pull request now fails when the branch's item is behind. Both are what a project would assume the gate already did. The gate workflow changes once, when `render` runs.

## Drawbacks

- **More refusals at first.** Items recorded before this change verify and review again when they next move to ship.
- **Verify needs a commit.** An agent commits before it verifies. Running tests freely is unaffected; only the recorded verify needs a commit.
- **Worktrees must be visible to git.** A working copy that isn't a git worktree of the same repository, such as a second clone, isn't found.

## Alternatives

- **Keep work items outside the branches,** in the git folder or on a branch of their own (#118's first idea). Every branch would share one copy, but CI checks out the pull request alone and couldn't see the record, and the record would no longer merge with the change it describes.
- **Verify in a fresh temporary worktree.** It needs no clean working copy, but it has none of the project's installed dependencies, so most verify commands would fail or take minutes.
- **Warn instead of fail for MVP reviews.** That's today's rule, and it let unreviewed code merge on the first real project.

## Open questions

- **Should a pull request with no work item fail when it changes code?** Proposed: no, it passes and says so. A setting, such as `gates.requireWorkItem`, could come later if projects ask for it.
- **Should formatter-only changes, beyond whitespace, stop triggering reviews?** Proposed: not here. The next RFC, on review results, adds recorded waivers, which cover a reformatting pass without letting real changes through.
