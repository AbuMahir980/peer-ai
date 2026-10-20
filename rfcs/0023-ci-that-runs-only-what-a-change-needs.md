# RFC 0023: CI that runs only what a change needs

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #285 |

## Summary

RFCs 0021 and 0022 stopped Peer AI's own records from running CI, and gave projects a workflow that says which parts a change touched. On a real project that still wasn't enough to rely on: documentation counted as every part, files that feed a part from outside its folder weren't known, the security scans still started a runner on every push, and the default branch tested again what its pull request had just tested. This RFC lets the config say which paths need no build and which files a part is built from, has the "what changed" workflow trust a comparison only when the commit compared with passed, moves the security scans' skip to job level so a skipped scan starts no runner, lets the default branch skip what its pull request already tested, tells agents that pushing costs money when CI is metered, and adds a command that shows where the minutes went.

## Motivation

From two projects on private repositories, where every minute of CI is billed (#275, #276):

- **A budget gone in two weeks.** One project ran out of Actions minutes halfway through the month. About a third of the minutes spent on pull requests tested parts the change didn't touch, and runs on the main branch after a merge, testing exactly what the pull request's passing run had tested, were a quarter of the month.
- **Docs count as every part.** The "what changed" workflow sets `other` for any file outside a part, and the job condition it suggests runs every part's tests when `other` is true. A typo fixed in a document, or a design board added, ran the whole suite. On the other project, a fifth of the month's pull request minutes were docs, design or records-only changes.
- **Files that feed a part from outside it are unknown.** One app's design tokens are generated from a file in the design folder, and its API types from the backend's contract. Scoping by part either skips the app's tests when that file changes, or runs everything for any design change. So the project couldn't use the workflow safely, and wrote its own script.
- **A skip trusts a base that may have failed.** The workflow judges only what changed. When the commit it compares with failed its own CI, or was cancelled, the parts it skips were never shown to pass.
- **Each scan still starts a runner.** The security pipeline's records-only skip is at step level, so each job starts, and is billed at least a minute, to decide it has nothing to do. A docs change scans dependencies and workflows it didn't touch.
- **Nothing tells the agents.** Agents pushed after each small commit, and pushed again while a run was still going, each push billed in full.

## Design

### 1. Paths that need no build

`delivery.noBuild` lists paths that no build or test reads, such as documentation and design boards:

```json
"delivery": { "noBuild": ["docs/**", "design/**", "*.md"] }
```

A pattern without a `/` matches a file name anywhere, as in `.gitignore`. In the "what changed" workflow, a file that matches counts for no part and not for `other`. It still counts for `code`, since it isn't one of Peer AI's records, so a check that reads docs, such as a link check or a secrets scan, still runs. `init` suggests the list from the folders it finds (`docs/`, `design/`, a root `README.md`), for the person to keep or change.

### 2. Files a part is built from

A part can name files outside its own folder that it's built from:

```json
{ "id": "app", "path": "apps/mobile", "builtFrom": ["design/tokens.json", "api/openapi.yaml"] }
```

In the "what changed" workflow, a change to one of them counts for every part that names it, besides the part whose folder holds it. A file named by a part isn't `noBuild`, whatever the patterns say.

### 3. A comparison holds only when it passed

The "what changed" workflow reads the check runs on the commit it compares with: a pull request's base, a merge group's base, or the commit before a push. When any of them failed, was cancelled or timed out, every output is true, so nothing is skipped on the strength of a commit that didn't pass. A check still running doesn't count against it. The workflow asks for `checks: read` for this.

### 4. The default branch skips what its pull request tested

On a push to the default branch, the "what changed" workflow asks GitHub for the pull request merged as that commit. When the commit's files are exactly the pull request's last commit's, and every check on that commit passed, it sets a new output, `tested`, with the pull request's run. A project's build and test jobs add `needs.changes.outputs.tested != 'true'` to their condition. Deployment jobs don't, and run as before. A merge that brought in anything the pull request's run didn't test, such as a merge commit joining a newer default branch, gets `tested: false`.

### 5. The security scans skip at job level

The security pipeline gains one small job, `peer-ai / what changed`, that every scan job needs. It says, for each scan, whether its kind of file changed:

| Scan | Runs when the change touches |
|------|------------------------------|
| secrets | anything outside Peer AI's records |
| dependencies | a dependency manifest or lockfile |
| workflows | `.github/workflows/` or `.github/actions/` |
| code | anything outside Peer AI's records and `noBuild` |

Each scan's job has `if:` on that answer, so a skipped scan starts no runner and reports as skipped, which GitHub counts as passing for a required check. As in #270's fix, a scan runs whenever the same check didn't pass on the commit compared with, and on the default branch, a merge `tested` by its pull request skips them all. The schedule and a run by hand still run every scan.

### 6. Telling agents a push costs money

`delivery.metered` says pushing bills CI minutes. `init` sets it to true for a private repository on GitHub, where it can ask. When it's true, the instructions render writes tell the AI tool:

- Push at milestones, not after each commit, and run the project's checks locally first.
- Don't push while a run for the branch is still going.
- When a run fails, re-run only the failed jobs.

### 7. Where the minutes went

`peer-ai ci-usage` reads the last 30 days of runs through `gh`, and reports the minutes:

- by workflow and job
- in runs on the default branch that repeated a pull request's passing run
- in jobs with no time limit
- the slowest steps

It reads only, and needs `gh` signed in.

## Compatibility

Minor:

- The config gains `delivery.noBuild`, `delivery.metered` and a part's `builtFrom`, all optional.
- The "what changed" workflow gains the `tested` output and `checks: read`. A project's workflow that calls it keeps working; its jobs change only when they add the new condition.
- The security pipeline gains a `peer-ai / what changed` job. Its scans keep their check names, so required checks are unchanged.
- A new command, `peer-ai ci-usage`.

After updating, `npx peer-ai render` rewrites both workflows.

## Drawbacks

- **A skipped check is a check that didn't run.** Every skip rests on the config being right: a `noBuild` pattern too wide, or a `builtFrom` left out, skips a test that would have failed. The comparison holding only when it passed, and `tested` needing identical files, limit the damage, and the infrastructure review checks the config against the workflows (DEL-13).
- **More API calls per run.** Each run asks GitHub for a comparison and some check runs. They use the run's own token, and are far cheaper than the minutes they save.
- **A `tested` skip leaves no run of the tests on the default branch's commit.** The pull request's run is named instead. A project that wants every commit on its default branch tested leaves the condition out.

## Alternatives

- **`paths` filters on workflows.** GitHub leaves a required check skipped by a workflow's filter waiting, which blocks the merge (RFC 0022).
- **A third-party "paths changed" action.** One more action to pin and trust in every project's pipeline, and it still knows nothing of the parts or what feeds them.
- **Each project writes its own script.** The project behind #276 did, with rules and tests of its own. Every metered project would have to.

## Open questions

- Whether `.peer-ai/enforce/` should count as code for Peer AI's own checks too, so a change to the lint settings makes a verify stale. The generated workflows count it as code since #284; Peer AI's freshness checks still treat it as records, so a render on a branch doesn't make every review stale.
- Whether `ci-usage` should become a `doctor` check once its cost is known: reading 30 days of runs takes many API calls.
