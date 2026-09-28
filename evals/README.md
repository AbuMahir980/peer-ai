# Evals

An eval tests whether a review finds the problems it should. Each practice project in [`fixtures/`](../fixtures/) has problems planted in it on purpose, and its answer sheet lives here, outside the project, so the AI tool under test never sees the answers. The design is in [RFC 0002](../rfcs/0002-review-reports-and-evals.md).

| Answer sheet | Practice project | Planted problems |
|--------------|------------------|------------------|
| [`courier.json`](courier.json) | [`courier`](../fixtures/courier/): a parcel pickup service, with a React web app and a Python API | 19: 18 planted, and 1 a review found that nobody planted |
| [`shelf.json`](shelf.json) | [`shelf`](../fixtures/shelf/): a book-lending phone app in React Native, half rebuilt | 17: 16 planted, and 1 a review found that nobody planted |
| [`sprout.json`](sprout.json) | [`sprout`](../fixtures/sprout/): a plant-care journal that works offline, with an AI feature | 14 |

## Running one

```bash
node scripts/eval.ts courier --skill security-review
```

It makes a fresh copy of the project, asks the AI tool for the review in plain words, collects the report the tool writes, and marks it against the answer sheet. Add `--tool codex` to use Codex, `--runs 2` to run it twice, and `--record` to add the result to the table below. Each run uses about $1 to $3 of the tool's usage.

## How a review is marked

- A planted problem counts as **found** when the report names a problem within three lines of it, at a severity no more than one level away.
- Problems the report raises that aren't on the answer sheet are listed **for a person to judge**. A real problem nobody planted is added to the answer sheet; a wrong one counts against the review.
- A review is **ready** when it finds every planted critical and high problem, and at least 80% of the medium ones, in a valid report.

Until Peer AI's own review skills exist, the runner also tells the tool where the report format is. The skills will carry it themselves.

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

## Results

Newest last.

| Date | Project | Review | Tool | Found | Not on the sheet | Result | Cost |
|------|---------|--------|------|-------|------------------|--------|------|
| 2026-09-28 | courier | security-review | Claude Code | 9 of 9 | 6 | Ready | $2.49 |
| 2026-09-28 | shelf | security-review | Claude Code | 7 of 7 | 4 | Ready | $2.24 |
| 2026-09-28 | sprout | ai-feature-review | Claude Code | 5 of 5 | 4 | Ready | $1.70 |
