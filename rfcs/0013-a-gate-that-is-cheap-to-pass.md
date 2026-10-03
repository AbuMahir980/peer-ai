# RFC 0013: A gate that's cheap to pass

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #164 |

## Summary

RFC 0010 made a pull request wait until its work item is verified and reviewed on the commit about to merge. It works, but on a real project it costs a full local verify for every pull request, a redo of every review after each merge from the base branch, and no way to close work that merged before the gate existed. This RFC keeps the gate as strict and makes passing it cheap:

- CI's run of the verify command on the pull request's commit counts as the verify, read from GitHub and recorded with a link, so nobody runs it again on a laptop.
- Moving an item to ship takes CI's verify itself and says exactly what's still missing; `peer-ai ship` does the same from a terminal.
- A merge from the base branch keeps an item's reviews when it brings in none of the files the item changes.
- `peer-ai check` writes what the gate is waiting for to the job's summary on the pull request.
- Work whose branch is already merged can be closed in one step, saying how it was closed.

## Motivation

From the first project to use 1.0 every day (a Python API, React Native apps and Terraform), with several agents working in parallel on one laptop:

- **The local verify is the heaviest step, and CI does it anyway** (#154). The project's verify command, `make check`, runs a Docker backend and the app: 10 to 15 minutes, and heavy. In one day, 15 pull requests merged. Each needed `run_verify` locally, then each required review recorded, then the item moved to ship, while CI ran the same checks again on the same commit. With several agents at once, the local verify runs exhausted the laptop's memory.
- **A merge from the base branch makes every review stale** (#154). After merging the base branch to resolve a conflict, the verify and reviews named an older commit, so they had to be redone, even when only other people's code had moved in.
- **The gate is silent about what it wants** (#154). Its reasons are in the job's log, so someone has to open it to find out.
- **Work merged before the gate can't be closed** (#155). The project moved from next.2 to next.6 after merging those 15 pull requests. Their items were at prepare, build or verify, with reviews recorded, because the ship gate didn't exist yet. The only way to close each was to check out its branch, run the 15-minute verify, ship it, then close it, for code already merged and verified by CI on the main branch.

## Design

### 1. CI's verify counts

A new setting, `commands.verifyCheck`, names the CI check that runs the project's verify command on every pull request, such as `"ci / check"`: the name GitHub shows for it on a pull request.

When it's set, `run_verify` takes the result from CI instead of running the command, when asked with `from: "ci"`:

- It needs the item's latest commit to be pushed. It asks GitHub for that commit's check runs, through the `gh` command the person is signed in with, or a `GITHUB_TOKEN`.
- **A passing check** is recorded as the verify, with where it came from: `"lastVerify": { "result": "pass", "at": "…", "commit": "…", "ci": { "check": "ci / check", "url": "https://github.com/…/runs/…" } }`.
- **A failing check** is recorded as a failed verify, with the link.
- **A check still running** isn't recorded. The reply says it's running and to ask again when it finishes.
- **Without `gh` or a token,** it says so, and the local run stays available.

`peer-ai check` in CI confirms a verify that came from CI. It asks GitHub whether that check passed on that commit, with the workflow's own token, which `render` gives `checks: read`. A record that claims a CI verify that didn't happen fails the gate, so a CI verify is better evidence than a local one.

### 2. One step to ship

`advance_work_item` to ship already checks the gate and lists what's missing. With `verifyCheck` set, it now also takes CI's verify itself when the item's verify is missing or older than its latest commit, before it checks. Each thing still missing is listed with how to get it: the review skill to run, or the CI check still running.

A new command, `peer-ai ship [id]`, does the same from a terminal, for the item on the branch checked out when no id is given. A person can then ship without asking their AI tool.

### 3. Reviews survive a merge from the base branch

A review stays fresh while nothing the item itself changes has changed since it. Today, any file changed since the review's commit makes it stale. Instead, the files changed since the review's commit are compared only with the files the branch changes against its base, from the merge base: `git diff --name-only <base>...HEAD`.

- **A merge that brings in only other people's files** leaves every review as it was.
- **A merge that brings a change to a file the item also changes** makes that review stale, as today. Whether the two changes fit together needs a look.
- **The verify always follows the latest commit,** since merged code can break the build. With section 1, CI does that.

### 4. The gate says what it's waiting for

`peer-ai check` writes its result to the job's summary, which GitHub shows on the pull request's checks: the branch's item, its stage, and each thing missing with how to get it. Writing to the summary needs no extra permission, so it works for pull requests from forks too.

### 5. Closing work that already merged

An item whose branch is already merged into the default branch can move to done from any stage:

- **Merged** means its branch's last commit is in the default branch, or, for a squash or rebase merge, GitHub says its pull request was merged.
- **The item records how it was closed:** `"closed": { "by": "merge", "commit": "<the merge commit>", "pullRequest": 214, "at": "…" }`. It keeps whatever verify and reviews it had.
- **`peer-ai check` accepts such an item without a verify and reviews,** and lists it among the items closed by merge, so the record stays honest about what it holds.
- **A new command, `peer-ai close-merged`,** lists every open item whose branch is merged, and closes them all once the person agrees. `--yes` skips the question.
- **`doctor` warns** when open items' branches are merged: "15 open items' branches are already merged. Close them with npx peer-ai close-merged."

This doesn't open a way around the gate: with `peer-ai check` required, nothing merges before its item is at ship. It closes work that merged before the gate, or while the check wasn't required.

## Compatibility

Minor:

- The config gains `commands.verifyCheck`.
- A work item's `lastVerify` gains `ci`, and the item gains `closed`.
- The gate's workflow gains `checks: read`, and `render` updates it.
- `run_verify` gains `from`.
- Two commands arrive: `ship` and `close-merged`.

Without `verifyCheck`, everything works as today, except that reviews survive a merge from the base branch. That change only ever keeps a review fresh that the old rule called stale, so it can't block anything new.

## Drawbacks

- **GitHub only, for now.** Reading a check's result needs GitHub's API. Projects on other CI keep the local verify until each host is added.
- **A check name can change** when a workflow's job is renamed. Then `run_verify from: "ci"` finds no such check, and says so with the names it found.
- **Reviews kept after a merge** rely on file names. A change elsewhere can still affect an item's files, such as a renamed function they call. The verify on the latest commit is what catches that, as it does today.
- **Closing by merge records less** than shipping does. The record says so, and `check` lists those items, so nobody mistakes one for a verified and reviewed item.

## Alternatives

- **Have the gate's own workflow run the verify command.** It frees the laptop, but runs the whole verify twice in CI, once in the project's pipeline and once in the gate's.
- **Trigger the gate when the project's CI finishes** (`workflow_run`). It could read CI's result directly, but it runs with the base branch's permissions next to the pull request's files, a pattern zizmor flags as dangerous. It also changes how the required check works.
- **Drop the verify from the ship gate.** Cheaper, but a pull request could then merge with nothing showing its commit was ever verified.

## Open questions

- **Should `doctor` suggest `verifyCheck`** when it finds a job in the project's own workflows that runs the verify command? Proposed: yes, with that job's check name.
- **Should the gate also comment on the pull request,** in one comment that updates itself? It needs permission to write to pull requests, which a fork's pull request doesn't get. Proposed: the job summary now, and an optional comment later if people miss it.
