# RFC 0014: Staying current

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #170 |

## Summary

A project pins one version of Peer AI, which is right: everyone and CI run the same one. But nothing tells the project when a newer version is out, nothing tells a person what changed in how the project works after an update, and the feedback a project sends piles up with no way to see what's been fixed. This RFC keeps a project current without unpinning it:

- `doctor`, and through it `next_work`, say when a newer release exists, at most once a day and never failing offline, with what changed and how to update.
- An optional scheduled workflow opens an "update Peer AI" pull request when a release appears.
- At a person's first session after the project's version changes, `next_work` gives a short "what changed since you last worked here" for the AI tool to tell them.
- `render` can write a short, project-owned section in the README, "How we work: Peer AI", with the details folded away.
- `peer-ai feedback` shows each sent report's state, `peer-ai feedback prune` clears the closed ones, and `draft_feedback` warns about a report already sent.

## Motivation

From the first project to use 1.0 every day:

- **Nobody heard about new releases** (#156). The project pinned 1.0.0-next.2 in `.mcp.json`, its session-start step and its CI gate. next.3 to next.6 came out with fixes for issues it had reported, and the project only found out because its owner happened to hear. `doctor` and `next_work` compare the version running with the project's pin (RFC 0011), but never the pin with the latest release.
- **A teammate doesn't know what changed** (#156). After pulling, a teammate's AI tool picks up the new pin, but nobody tells them in plain words what changed in how the project works: the ship gate, the enforcement stages, the report-only checks. The project's README doesn't mention Peer AI, so a person who doesn't use an AI tool doesn't know it's in use at all.
- **Sent feedback only grows** (#150). The project sent 23 reports with `peer-ai feedback send`, and 14 are closed. All 23 sit in `.peer-ai/feedback/sent/`, with nothing showing which are resolved. An agent re-drafted one report that had already been sent, and another that had already been fixed.

## Design

### 1. A newer release, said by doctor and next_work

`doctor` gains a check, "Updates". It compares the version the project uses (RFC 0011) with the latest release on npm:

- **When a newer release exists,** it warns, and `next_work` passes the warning on: "Peer AI 1.0.0-next.12 is out, and the project uses 1.0.0-next.9. What changed: https://github.com/AbuMahir980/peer-ai/releases. Update on a branch: npx --prefer-online peer-ai@latest render."
- **It asks npm at most once a day** per machine. The answer is kept in the user's cache folder (`$XDG_CACHE_HOME/peer-ai`, or `~/.cache/peer-ai`, or the platform's equivalent), never in the project. It asks with a short timeout. Offline, or when npm can't be reached, the check says nothing, and nothing fails.
- **A project that stays on a version on purpose** sets `"updates": { "notify": false }`. `doctor` then reports the check as skipped, saying so.
- **In CI**, the check is skipped: the gate shouldn't depend on npm's answer, and the update reaches people through their own sessions.

### 2. An update pull request, if the project wants one

With `"updates": { "pullRequest": true }`, on GitHub Actions, `render` writes `.github/workflows/peer-ai-update.yml`:

- **It runs once a day,** and on demand. It compares the project's pinned version with npm's latest, and does nothing when they match.
- **When they differ,** it runs `npx -y peer-ai@<latest> render` on a branch, `peer-ai/update-<version>`, commits what changed, and opens a pull request titled "Update Peer AI to <version>". The body links each release's notes.
- **It's idempotent:** with a pull request for that version already open, it does nothing.
- **It asks for `contents: write` and `pull-requests: write`,** only in that job, and pins its actions to commits, like Peer AI's other workflows.

A pull request opened with the workflow's own token doesn't start other workflows, which is GitHub's rule, so the project's CI and the gate wouldn't run on it. When the repository has a secret named `PEER_AI_UPDATE_TOKEN`, a token for a GitHub App or a fine-grained token, the workflow uses it instead, and CI runs. Without it, the pull request's body says to close and reopen it, which starts CI.

### 3. What changed since you last worked here

`next_work` remembers, per person and project, the Peer AI version of their last session. The memory is kept in the same cache folder, keyed by the project's folder, never in the project.

When the version has changed since, `next_work` adds `whatChanged`:

```json
"whatChanged": {
  "from": "1.0.0-next.6",
  "to": "1.0.0-next.9",
  "notes": [
    "1.0.0-next.8: next_work lists open items in one line each; work_item gives one in full.",
    "1.0.0-next.9: CI's verify can count as the verify, and peer-ai close-merged closes work that already merged."
  ]
}
```

- **Each note is the first sentence of each change** in the package's own changelog, which ships with it, so it works offline.
- **The server's instructions tell the AI tool** to give the person these notes in a few plain words at the start of the session, before other work, then carry on.
- **It's said once:** the next session doesn't repeat it.

### 4. A README section for people

With `"docs": { "readme": true }`, `render` writes a block between markers into the project's `README.md`, as it does for the AI tools' instructions. The block is "How we work: Peer AI", and it leads with three lines:

- what Peer AI does here;
- that nobody needs to install it;
- the one command a person might run, `npx peer-ai doctor`.

The details follow in folded `<details>` sections, so readers scan the headings and open what they need:

- the project's stage and what it asks for;
- the ship gate and what a pull request needs;
- the enforcement stage and any deferrals;
- how updates work.

They're written from the config, so they stay true as it changes. The project owns the section: it's off unless asked for, and removing the markers stops `render` from touching it.

### 5. Sent feedback that stays tidy

- **`peer-ai feedback`** also lists the sent reports, each with its issue's state from GitHub through `gh`: open, or closed and when. Without `gh`, it lists them without a state.
- **`peer-ai feedback prune`** removes the sent reports whose issues are closed, after listing them, and keeps the open ones. `--yes` skips the question. The reports are the project's own files in a folder git ignores, so this is the only copy. The issues themselves stay on GitHub.
- **`draft_feedback` warns about a draft like one already sent:** its title against each sent report's title. When they're close, the draft is still written, and the reply names the sent issue and its state: "This looks like a report already sent, #150, which is closed: it may be fixed in the version this project now uses. Check before sending it."

## Compatibility

Minor:

- The config gains a top-level `updates` (`notify`, default true; `pullRequest`, default false) and `docs.readme` (default false).
- `next_work` gains `whatChanged`, and `doctor` gains the "Updates" check, a warning.
- `peer-ai feedback` gains `prune`. `draft_feedback`'s reply can say a draft looks like one already sent.

Nothing changes in a project until it updates. The new warning then appears in sessions until the project moves to the latest release or sets `updates.notify` to false.

## Drawbacks

- **A warning about every release could nag** a project that updates on its own schedule. It can switch it off, and it's never a failure.
- **The update pull request needs a token to run CI by itself.** Without one, someone has to close and reopen it. That's GitHub's rule, and the pull request says so.
- **Asking npm needs the network.** It's at most daily, short and silent when offline, but it is a request from the person's machine. Turning `updates.notify` off stops it.
- **The README section is more for `render` to keep in step.** It's off unless a project asks for it.

## Alternatives

- **Dependabot or Renovate for updates.** They bump `package.json`, but a project that runs Peer AI through `npx` pins it in files they don't understand. A bump also needs `render` to run, which they don't do.
- **Unpinning, always running the latest.** Everyone and CI would drift onto different versions mid-change: the problem RFC 0011 solved.
- **Release notes only on GitHub.** A person in their AI tool doesn't look there. The point is to tell them where they work.

## Open questions

- **Should the update pull request also run `close-merged` and other one-off steps** a release asks for? Proposed: later, as a release learns to say what it needs after updating.
- **Should `whatChanged` also cover config changes,** such as the stage moving to production? Proposed: yes, in a later change, with the same note format.
