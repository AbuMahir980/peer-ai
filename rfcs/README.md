# RFCs

An RFC is how a significant change to Peer AI gets proposed, discussed and decided in the open.

## When you need one

Write an RFC for a change to any of these:

- the workflow's activities, gates or state
- a skill's anatomy or output format, which CI jobs and other tools parse
- a standard's rule IDs, or what a rule requires
- the `peer-ai.config.json` or state schema
- the CLI's commands and flags, or the MCP server's tools

Bug fixes, new stack profiles, docs and wording changes that keep the meaning don't need one. Open a pull request directly.

## How it works

1. **Open a proposal issue** with the problem and a sketch of the change. This is where the idea gets its first reaction.
2. **Write the RFC.** Copy [`0000-template.md`](0000-template.md) to `rfcs/NNNN-short-title.md`, using the next free number in the index below, and open a pull request.
3. **Discussion.** Every RFC stays open for at least a week, so people in other timezones and on other stacks can weigh in. Before version 1.0 there are no outside contributors yet, so the maintainer may accept an RFC sooner and say so in the final comment.
4. **Decision.** A maintainer merges it as accepted or closes it as declined, with the reasoning in a final comment.
5. **Implementation** happens in separate pull requests that link back to the RFC.

## Index

| RFC | Title | Status |
|-----|-------|--------|
| [0001](0001-configuration-instead-of-patching.md) | Configuration instead of patching | Accepted |
| [0002](0002-review-reports-and-evals.md) | Review reports and evals | Accepted |
| [0003](0003-how-a-standard-is-written.md) | How a standard is written | Accepted |
| [0004](0004-how-a-skill-is-written.md) | How a skill is written | Accepted |
| [0005](0005-work-items-that-carry-their-plan.md) | Work items that carry their plan | Accepted |
| [0006](0006-stack-profiles-and-their-enforcers.md) | Stack profiles and the tools that enforce them | Accepted |
| [0007](0007-setup-checks-and-feedback-that-run-themselves.md) | Setup checks and feedback that run themselves | Accepted |
| [0008](0008-moving-a-v0-project-onto-1-0.md) | Moving a v0 project onto 1.0 | Accepted |
| [0009](0009-the-ci-gate-set-up-by-render.md) | The CI gate, set up by render | Accepted |
| [0010](0010-a-record-that-follows-the-branch.md) | A record that follows the branch and its commits | Accepted |
| [0011](0011-adopting-peer-ai-on-an-existing-codebase.md) | Adopting Peer AI on an existing codebase | Accepted |
| [0012](0012-replies-that-fit.md) | Replies that fit | Accepted |
| [0013](0013-a-gate-that-is-cheap-to-pass.md) | A gate that's cheap to pass | Accepted |
| [0014](0014-staying-current.md) | Staying current | Accepted |
| [0015](0015-review-results-that-mean-what-they-say.md) | Review results that mean what they say | Accepted |
| [0016](0016-proportionate-reviews.md) | Proportionate reviews | Accepted |
| [0017](0017-tidy-state.md) | Tidy state | Accepted |

## What carries weight

Evidence from a real run. Most defects in Peer AI's history were invisible to the project that introduced them and only showed up when a project of a different shape ran the same files. Say what happened, where, and on what kind of project: the stack, whether it had an API, and whether its design already existed.
