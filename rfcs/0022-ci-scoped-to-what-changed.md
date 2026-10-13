# RFC 0022: CI scoped to what changed

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Proposal issue | #257 |

## Summary

A project's CI usually runs every check on every change, so a change to one component runs every part's tests and the deployment checks, which fail where they can't apply. Each run costs money on a paid plan, and the failures make a developer's pull requests look broken. Peer AI knows the project's parts and which files belong to each, so it can help. This RFC has render write a workflow that says which parts a change touched, for the project's own jobs to use; adds a delivery rule that each check runs on the changes it can apply to; has doctor flag CI that runs where it can't apply; and has the infrastructure and release reviews check each workflow's triggers.

## Motivation

From a project with a private repository on a paid GitHub plan (#256):

- **Every check runs on every change.** A change to one screen component runs the backend's tests, builds, and the deployment checks. Each run bills Actions minutes for checks that can't say anything about the change.
- **Checks fail where they can't apply.** Deployment checks are meant for a release. On a feature branch, what they check isn't there yet, so they fail, and the developer gets an email for each failed run.
- **Pull requests look broken.** The red crosses read, to the owner, a client and anyone looking at the repository, as constant failures in the developer's work, though nothing they changed is wrong.

RFC 0021 stops Peer AI's own workflows adding to this: the gate skips drafts, records go up in one push, and the security pipeline skips records-only pushes. But the expensive checks are the project's own, and nothing in Peer AI helps scope them, though it knows exactly what each part is and where it lives.

## Design

### 1. A workflow that says what changed

Render writes `.github/workflows/peer-ai-changes.yml`, a reusable workflow (`on: workflow_call`) built from the config's parts:

- **One job, `changes`,** asks GitHub's compare API what the pull request or push changed: a pull request against its base, a push against the commit before it. It uses the run's own read-only token and no checkout.
- **Its outputs say which parts changed,** one per part, named by the part's id (`web: "true"`), from the part paths in `peer-ai.config.json`, plus `code`, true when anything outside `.peer-ai/` changed, and `other`, true when anything outside every part changed, such as the root's settings.
- **When it can't tell,** on a schedule, a first push, or when GitHub can't be asked, every output is true, so everything runs.

A project's own workflow calls it first, and each job runs for its part:

```yaml
jobs:
  changes:
    uses: ./.github/workflows/peer-ai-changes.yml
  api-tests:
    needs: changes
    if: needs.changes.outputs.api == 'true' || needs.changes.outputs.other == 'true'
    runs-on: ubuntu-latest
    steps: …
```

A job skipped by its `if` reports success, so a required check never hangs, which a workflow skipped by `paths` filters doesn't. Render never edits a project's own workflows: the README shows the pattern, and doctor and the reviews point at it.

### 2. DEL-13: each check runs on the changes it can apply to

A new core delivery rule:

| | |
|-|-|
| Id | DEL-13 |
| Title | Each check runs on the changes it can apply to |
| Rule | A CI job runs its work only when the change can affect what it checks: a part's tests when that part, or what it depends on, changed; deployment checks when deploying, not on every pull request. Every required check still reports on every change (DEL-04): a job that has nothing to check is skipped, and reports success. A workflow cancels a run a newer push to the same branch has replaced. |
| Why | Checks that run where they can't apply cost money, fail for reasons unrelated to the change, and teach everyone to ignore a red cross. |
| Ask | Does any check in this change's CI run where it can't apply, or keep running after a newer push? |
| Stage | mvp |
| Check | ai-review |
| Severity | medium |

`infrastructure-review` and `release-readiness` answer for it, reading each workflow's triggers and conditions against what its jobs are for.

### 3. doctor flags CI that runs where it can't apply

doctor reads the project's own workflows, and warns, never fails:

- **A deployment job on pull requests:** a job with a deployment `environment`, or a deploy step, in a workflow triggered by `pull_request`. The fix: run it on a push to the default branch, a tag, or by hand, or give it an `if` for when it applies.
- **No cancelling of replaced runs:** a workflow triggered by pull requests with no `concurrency` group that cancels in progress. The fix gives the two lines.
- **Every job running for every part:** on a project of several parts, a workflow whose jobs run on every pull request with no condition on what changed. The fix points to the "what changed" workflow.

Each warning names the workflow and job. A project that means it that way says so in `declined`, with why, and doctor stops warning about that workflow.

## Compatibility

Minor:

- Render writes `.github/workflows/peer-ai-changes.yml` on a GitHub Actions project with more than one part. Nothing calls it until a project's workflow does.
- A new core rule, DEL-13, from mvp. Reviews of CI changes answer for it.
- doctor gains warnings about the project's own workflows. `declined` gains an entry for a workflow, `{ "workflow": ".github/workflows/deploy.yml", "reason": "…" }`, that silences them for it.

## Drawbacks

- **A skipped check is a check that didn't run.** Scoping is only as good as the parts' paths. A change outside every part runs everything (`other`), and a part's tests should run when what it depends on changes, which the project says in its job's condition. The review checks that.
- **doctor reading a project's workflows can be wrong** about what a job is for. The warnings are only warnings, and `declined` takes a reason.
- **Another workflow file.** It's small, and render keeps it in step with the parts.

## Alternatives

- **`paths` filters on the project's workflows.** GitHub leaves a required check skipped by a workflow's `paths` filter waiting, which blocks the merge. A job skipped by its condition reports success.
- **Render rewrites the project's own workflows.** They're the project's, and often hold more than Peer AI understands. Pointing at the pattern, and checking it in review, keeps them the project's.
- **Leave it to each project.** Every project would work out the same thing, and most wouldn't, at a cost a team will count against Peer AI.

## Open questions

- Whether the "what changed" workflow should also follow dependencies between parts, such as an app's tests running when the shared library it uses changed. The config doesn't say how parts depend on each other yet, so this RFC leaves it to each job's condition.
  - **Resolved in the implementation:** a part's `uses` in the config already says it, so a part's output is true when a part it uses changed, through each other.
