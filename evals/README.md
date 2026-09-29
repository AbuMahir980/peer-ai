# Evals

An eval tests whether a review finds the problems it should. Each practice project in [`fixtures/`](../fixtures/) has problems planted in it on purpose, and its answer sheet lives here, outside the project, so the AI tool under test never sees the answers. The design is in [RFC 0002](../rfcs/0002-review-reports-and-evals.md).

| Answer sheet | Practice project | Planted problems |
|--------------|------------------|------------------|
| [`courier.json`](courier.json) | [`courier`](../fixtures/courier/): a parcel pickup service, with a React web app and a Python API | 19: 18 planted, and 1 a review found that nobody planted |
| [`shelf.json`](shelf.json) | [`shelf`](../fixtures/shelf/): a book-lending phone app in React Native, half rebuilt | 18: 16 planted, and 2 that reviews found and nobody planted |
| [`sprout.json`](sprout.json) | [`sprout`](../fixtures/sprout/): a plant-care journal that works offline, with an AI feature | 14 |

## Running one

```bash
node scripts/eval.ts courier --skill security-review
```

It makes a fresh copy of the project with Peer AI's skills installed, as `peer-ai render` would, asks the AI tool for the review in plain words, collects the report the tool writes, and marks it against the answer sheet. The copy's log shows whether the tool used the skill.

| Option | What it does |
|--------|--------------|
| `--tool codex` | Use Codex instead of Claude Code |
| `--model <model>` | Ask for a model, such as a fast one and a strong one. RFC 0004 asks for both on each tool. |
| `--baseline` | Run without the skill, and tell the tool where the report format is, to measure what the skill adds |
| `--runs 2` | Run it twice |
| `--record` | Add the result to the table below |

Each run uses about $1 to $3 of the tool's usage.

## How a review is marked

- A planted problem counts as **found** when the report names a problem within three lines of it, at a severity no more than one level away.
- Problems the report raises that aren't on the answer sheet are listed **for a person to judge**. A real problem nobody planted is added to the answer sheet; a wrong one counts against the review.
- A review is **ready** when it finds every planted critical and high problem, and at least 80% of the medium ones, in a valid report.
- **Rules covered** counts how many of the rules the skill answers for have a line in the report. A review with the skill must cover them all; that's the proof a baseline can't give.

## Each answer sheet

A planted problem is found in its file by a short piece of the exact code, not by line number, so the answers can't quietly drift when a file changes. A test fails if that code is ever changed or removed.

## What people judged

- **2026-09-28, courier, security-review, Claude Code.** This was a baseline, before Peer AI's own review skills exist. Of the 6 problems it raised that weren't on the answer sheet:
  - **One was real and nobody had planted it:** session tokens never expire. It's now D19 on the answer sheet.
  - **One was a planted problem at the wrong severity:** the migration that deletes customers' notes (D13) is critical, and the review called it medium.
  - **The other four were fair, minor points:** the login token kept in the browser's storage, no length limits on text fields, no lockfile for the web app, and no tests for who can see what.
- **2026-09-28, shelf, security-review, Claude Code.** Also a baseline. Of the 4 problems it raised that weren't on the answer sheet:
  - **One was real and nobody had planted it:** usage data goes to an analytics service with no consent or opt-out. It's now S17 on the answer sheet.
  - **The other three were fair, minor points:** API responses aren't checked for shape, the older sign-in doesn't check for a failed request, and there's no certificate pinning.
- **2026-09-28, sprout, ai-feature-review, Claude Code.** Also a baseline. All 4 problems it raised that weren't on the answer sheet were **fair points about the project's paperwork rather than its code**: no tests for the identification feature, the service's contract isn't written down, there's no threat model, and the photo transfer isn't recorded for the NDPA. None was added to the answer sheet.

- **2026-09-29, security-review with the skill, on courier, shelf and sprout.** These were the first runs of Peer AI's own skill, and each problem they showed changed the skill or the tools before the next run:
  - **Whole-project reviews skipped the report check.** A whole-project review has no work item, so nothing checked its report. Haiku wrote malformed reports that went unnoticed. `record_review` now checks a report without a work item.
  - **Consent was found in a different place.** Shelf's missing analytics consent (S17) was reported where the app sends location to analytics, not where analytics is set up. The skill now says to check a service where it's set up, and Opus then found S17. Codex still reported it at the call site, under the right rule, PRIV-04, and naming the missing consent. A person would count that as finding S17; the scorer, which matches by location, doesn't. S17's location was not moved to make those runs pass.
  - **A missing scanner was rated critical.** A missing secret scanner was reported under SEC-10, which is critical and is about a secret actually in the code. SEC-27, "Secret scanning runs on every change", now covers the scanner, at medium.
  - **Tools were read as shell commands.** Haiku read "the peer-ai `record_review` tool" as a command and ran `npx peer-ai record_review`, which was refused. Skills now say "the peer-ai MCP tool", and the build rejects the older wording. `peer-ai check-report` runs the same checks from a shell.
  - **Codex hung.** The runner left Codex's input open, and Codex waited for more until the 30-minute timeout. The runner now closes it.
- **What people judged in those runs:**
  - **Two points came up in every run with the skill:** no threat model (SEC-25) and no tests that attack the code (TEST-08). Both are real under Peer AI's rules. They're about how the projects are run, not planted code, so they aren't on the answer sheets.
  - **One was real and nobody had planted it:** on shelf, signing out only forgets the token on the phone, so the session stays valid on the server. It's now S18 on the answer sheet. The shelf runs above were scored before it was added, against 8 problems.
  - **Shelf's "credentials in the device log"** is S3 reported a second time under another rule.
  - **Courier's "refused sign-ins leave no trace"** (SEC-24) is real under the rules, and is also about practice.
  - **Codex flagged sprout's photo input as unchecked** (SEC-19). Sprout doesn't declare the uploads trait, so the rule doesn't apply there: a fair point, outside the review's scope.
- **Haiku, the fast model, isn't reliable for this review.** In Claude Code it never called the MCP tools, reached for shell commands instead, and its results changed from run to run. security-review needs a strong model.
- **A run without the skill still has Peer AI's MCP server.** Codex fetched the rules through `standards_for_file` and covered them without the skill; Claude Code didn't. So "without" measures the skill, not Peer AI as a whole.
- **Codex did as well or better with the skill, and faster:** 9 of 10, 7 of 8 and 3 of 3 with it, against 8 of 10, 7 of 8 and 3 of 3 without, in about 2.5 minutes a run rather than 3.5 to 6.
- **Rules covered** is out of 46 before SEC-27 was added, and out of 47 after. The rows are in the order the runs happened.

## Results

Newest last.

The Skill column says whether the run had the skill: without it (a baseline), used, or installed but not used.

| Date | Project | Review | Tool | Model | Skill | Found | Rules covered | Not on the sheet | Result | Cost |
|------|---------|--------|------|-------|-------|-------|---------------|------------------|--------|------|
| 2026-09-28 | courier | security-review | Claude Code | default | without | 9 of 9 | – | 6 | Ready | $2.49 |
| 2026-09-28 | shelf | security-review | Claude Code | default | without | 7 of 7 | – | 4 | Ready | $2.24 |
| 2026-09-28 | sprout | ai-feature-review | Claude Code | default | without | 5 of 5 | – | 4 | Ready | $1.70 |
| 2026-09-29 | courier | security-review | Claude Code | opus | used | 10 of 10 | 46 of 46 | 3 | Ready | $3.19 |
| 2026-09-29 | sprout | security-review | Claude Code | opus | without | 3 of 3 | 0 of 46 | 2 | Ready | $1.80 |
| 2026-09-29 | shelf | security-review | Claude Code | opus | used | 7 of 8 | 46 of 46 | 4 | Not ready | $2.28 |
| 2026-09-29 | sprout | security-review | Claude Code | opus | used | 3 of 3 | 46 of 46 | 3 | Ready | $2.94 |
| 2026-09-29 | courier | security-review | Claude Code | haiku | used | 0 of 10 | 0 of 46 | 0 | Not ready | $0.24 |
| 2026-09-29 | shelf | security-review | Claude Code | haiku | used | 6 of 8 | 33 of 46 | 3 | Not ready | $0.36 |
| 2026-09-29 | sprout | security-review | Claude Code | haiku | used | 0 of 3 | 0 of 46 | 0 | Not ready | $0.45 |
| 2026-09-29 | shelf | security-review | Claude Code | haiku | without | 0 of 8 | 0 of 46 | 0 | Not ready | $0.14 |
| 2026-09-29 | courier | security-review | Claude Code | haiku | without | 6 of 10 | 0 of 46 | 1 | Not ready | $0.20 |
| 2026-09-29 | sprout | security-review | Claude Code | haiku | without | 2 of 3 | 0 of 46 | 3 | Not ready | $0.29 |
| 2026-09-29 | sprout | security-review | Claude Code | haiku | used | 0 of 3 | 0 of 46 | 0 | Not ready | $0.24 |
| 2026-09-29 | courier | security-review | Claude Code | haiku | used | 7 of 10 | 46 of 46 | 1 | Not ready | $0.31 |
| 2026-09-29 | shelf | security-review | Claude Code | haiku | used | 8 of 8 | 46 of 46 | 4 | Ready | $0.52 |
| 2026-09-29 | shelf | security-review | Claude Code | opus | used | 8 of 8 | 46 of 46 | 6 | Ready | $3.32 |
| 2026-09-29 | sprout | security-review | Claude Code | haiku | used | 0 of 3 | 0 of 46 | 0 | Not ready | $0.24 |
| 2026-09-29 | shelf | security-review | Claude Code | haiku | used | 0 of 8 | 0 of 47 | 0 | Not ready | $0.29 |
| 2026-09-29 | courier | security-review | Claude Code | haiku | used | 0 of 10 | 0 of 47 | 0 | Not ready | $0.29 |
| 2026-09-29 | sprout | security-review | Claude Code | haiku | used | 3 of 3 | 47 of 47 | 3 | Ready | $0.43 |
| 2026-09-29 | sprout | security-review | Claude Code | opus | used | 3 of 3 | 47 of 47 | 3 | Ready | $3.08 |
| 2026-09-29 | courier | security-review | Codex | default | used | 9 of 10 | 47 of 47 | 1 | Not ready | – |
| 2026-09-29 | shelf | security-review | Codex | default | used | 7 of 8 | 47 of 47 | 4 | Not ready | – |
| 2026-09-29 | sprout | security-review | Codex | default | used | 3 of 3 | 47 of 47 | 4 | Ready | – |
| 2026-09-29 | courier | security-review | Codex | default | without | 8 of 10 | 47 of 47 | 1 | Not ready | – |
| 2026-09-29 | shelf | security-review | Codex | default | without | 7 of 8 | 47 of 47 | 4 | Not ready | – |
| 2026-09-29 | sprout | security-review | Codex | default | without | 3 of 3 | 47 of 47 | 2 | Ready | – |
