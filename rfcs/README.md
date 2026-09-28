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
2. **Write the RFC.** Copy [`0000-template.md`](0000-template.md) to `rfcs/0000-short-title.md` and open a pull request. Once the PR exists, rename the file to use the PR number.
3. **Discussion.** Every RFC stays open for at least a week, so people in other timezones and on other stacks can weigh in.
4. **Decision.** A maintainer merges it as accepted or closes it as declined, with the reasoning in a final comment.
5. **Implementation** happens in separate pull requests that link back to the RFC.

## What carries weight

Evidence from a real run. Most defects in Peer AI's history were invisible to the project that introduced them and only showed up when a project of a different shape ran the same files. Say what happened, where, and on what kind of project: the stack, whether it had an API, and whether its design already existed.
