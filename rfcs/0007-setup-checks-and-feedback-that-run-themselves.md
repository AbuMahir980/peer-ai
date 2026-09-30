# RFC 0007: Setup checks and feedback that run themselves

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Proposal issue | #87 |

## Summary

Two things that today depend on a person remembering become automatic. First, `peer-ai check` fails on anything `peer-ai doctor` would fail on, and `next_work` tells the AI tool about every setup problem at the start of each session, so the AI fixes it or tells the person before starting other work. Second, when Peer AI gets something wrong in a project, the AI tool drafts a feedback report with a new MCP tool, `draft_feedback`, and a new command, `peer-ai feedback`, sends it as a GitHub issue once the person approves.

## Motivation

**Setup drifts silently.** `peer-ai doctor` checks what keeps Peer AI working: the AI tools set up in the repository against the config, the files `render` writes, the ESLint, Ruff and TypeScript settings that enforce the stack profiles, rules set aside until a date that has passed, and a v0 `peer-ai/` folder left behind. Only a person typing `doctor` runs those checks. `peer-ai check` in CI reuses two of them, the tracks and the work items, and nothing runs the rest. AI tools work fast: a project can go days with an AI changing it before anyone thinks to run `doctor`, and by then a linter that stopped enforcing Peer AI's rules has let problems through.

**Mistakes don't come back.** When a review misses a problem, a check blocks work by mistake, or a command misleads, the person has to notice, remember what happened and write it up. In v0, eight such reports from one project were never sent upstream. The evals catch what the practice projects plant, but only real projects show what the practice projects don't.

## Design

### 1. `peer-ai check` includes the setup checks

`check` runs the same diagnosis `doctor` runs and adds every check with the status `fail` to its own result, under a heading of their own, so CI fails when Peer AI can't work as intended. Checks `check` already runs itself, the tracks and the work items, aren't repeated. Warnings don't fail the build; `check` prints how many there are, with `Run npx peer-ai doctor for the details`.

Nothing changes in what `doctor` checks, or in what it marks a failure or a warning: `check` reuses its verdict. One check behaves differently in CI: the skills are never there, since they stay out of git, and that is already a warning, not a failure.

### 2. `next_work` reports setup problems

`next_work`, which the AI tool calls at the start of every session, gains a `setup` field whenever the diagnosis finds something:

```json
{
  "setup": {
    "problems": [
      {
        "check": "enforcers",
        "status": "fail",
        "message": "web/eslint.config.js doesn't spread peer-ai-eslint-config, so ESLint doesn't enforce the react profile.",
        "fix": "Add ...peerAi() to the array eslint.config.js exports."
      }
    ]
  }
}
```

It holds every failure and warning, each with the message and the fix `doctor` prints. With nothing to report, the field is absent. The instructions `render` writes gain one line:

> If `next_work` reports setup problems, fix what you can, such as running `npx peer-ai render`, before other work, and tell the person in plain words about anything only they can decide.

### 3. `draft_feedback`: the AI writes the report

A new MCP tool. The AI tool calls it when Peer AI gets something wrong: a review misses a problem or reports one that isn't there, a check blocks work by mistake, a skill's step can't be followed, or a command fails or misleads. It takes:

| Field | What it holds |
|-------|---------------|
| `title` | One line, such as "security-review flagged a test file as production code" |
| `what` | What happened, in plain words |
| `expected` | What should have happened |
| `skill` | The skill involved, when there is one |
| `command` | The command or tool involved, when there is one |

Peer AI adds what it knows itself: its version, the AI tool (from the MCP session), the operating system, the Node version, the project's stage and the stack profiles it lists. It writes the report to `.peer-ai/feedback/<date>-<slug>.md` and returns its path.

**What never goes in a report:** code from the project, file contents, names of people, companies or products, secrets, and addresses such as URLs or hosts. The tool's description tells the AI so, and Peer AI checks the draft before writing it: it refuses a draft holding a fenced code block, a line that looks like a key or a token, or an email address, and says what to take out.

`render` adds `.peer-ai/feedback/` to its block in `.gitignore`, so drafts stay on the person's machine.

The instructions `render` writes gain one line:

> When Peer AI gets something wrong, call `draft_feedback`. At a natural stopping point, show the person each draft in a few words and ask whether to send it.

### 4. `peer-ai feedback`: the person decides, the AI sends

A new command:

| Command | What it does |
|---------|--------------|
| `peer-ai feedback` | Lists the drafts waiting, with each title |
| `peer-ai feedback send <draft>` | Opens an issue on Peer AI's repository with the draft, labelled `feedback`, then moves the draft to `.peer-ai/feedback/sent/` with the issue's link |
| `peer-ai feedback drop <draft>` | Deletes the draft |

`send` uses the GitHub CLI, `gh`, when it's installed and signed in, so the issue is opened under the person's own account. Without it, `send` prints a link to a new issue with the title and report filled in, for the person to open and submit.

The AI tool runs `send` or `drop` only after the person answers. There is no automatic sending, no background upload and no tracking: a report leaves the machine only when a person has read it and said yes.

## Compatibility

Minor, under the versioning rules: a new MCP tool, a new command, a new optional field in `next_work`, and a new `.gitignore` line.

One change can turn a green build red: a project whose setup `doctor` already fails will now fail `check` in CI too. That is the point of the change, and each failure comes with its fix. Projects on 1.0 pre-releases pick it up with the version bump; nothing needs migrating.

## Drawbacks

- **`check` takes a little longer.** The diagnosis reads the project's settings and runs a fresh assessment: all of `peer-ai doctor` takes about a second on the practice projects.
- **Reports are public.** Issues on the repository are visible to everyone. The checks on a draft and the person's approval keep project details out, but they can't catch everything a person might consider private; the person reading every draft before it's sent is the last line.
- **Not every AI tool will call `draft_feedback` reliably.** It depends on the model noticing that Peer AI, not the project, got something wrong. The instruction is short and specific to make that likelier, and a person can always ask their AI tool to write one.

## Alternatives

- **Tell people to add `peer-ai doctor` to CI.** It relies on each project remembering a second step, which is the problem being solved.
- **A git hook.** Not every setup runs hooks, and they only fire on commit, not when an AI session starts.
- **A start-up step in each AI tool,** such as Claude Code's `SessionStart` hook. Only some tools have one, and the problem reaches the AI as raw output instead of through `next_work`, which every tool already calls.
- **Automatic, anonymous error reports.** Rejected: Peer AI promises it sends nothing anywhere, and products handling personal data, money or client work can't have a tool reporting from inside them without a person's say.
- **A separate, private feedback channel,** such as email. Possible later, for reports a person would rather not make public; for now, an issue is where the maintainer already works, and anyone can see what's been reported and fixed.

## Open questions

- Should a failed setup check stop an AI session's work entirely, or only come first? This RFC says it comes first: the AI fixes what it can and reports the rest, then carries on.
- Should `check` also fail on warnings at the production stage? This RFC says no, to keep one meaning for a warning everywhere.
