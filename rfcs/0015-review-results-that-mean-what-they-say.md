# RFC 0015: Review results that mean what they say

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #179 |

## Summary

A review's recorded result is a single word, worked out from its report: `fail` when an open finding is at the blocking level, `critical` by default; `incomplete` when a rule wasn't checked; `pass` otherwise. On a real project, that word told people the opposite of what the report said:

- `pass` was recorded with seven high findings open.
- A tester's check of a work item was recorded as `pass` with three acceptance criteria not met.
- A whole-project review recorded nothing at all, so its findings fell outside every gate.

This RFC keeps the word, and makes it honest:

- A result carries its open findings by severity, and is shown with them: "pass, 7 high open".
- A `qa-acceptance` review fails when any acceptance criterion isn't met, whatever the severity of its finding.
- `init` asks which findings block a merge, and suggests `high` for a product in production.
- Whole-project reviews are recorded, with their open findings. `next_work` and `peer-ai check` report them, and a work item can say which findings it fixes, so a finding no item covers shows.

## Motivation

All from the first project to use 1.0 every day:

- **"Pass" read as "all clear"** (#107). With the default blocking level, three reviews were recorded as `pass`, each with high findings open:
  - an AI-feature review with seven;
  - a reliability review with four, one of them uploaded documents kept only in memory on staging and lost on every restart;
  - a contract check with five.

  The auditor had to explain in prose that "pass" only meant "nothing critical".
- **A failed acceptance check recorded as a pass** (#120). A `qa-acceptance` review of a work item's eight criteria found three not met. The reviewer's own summary said "Not ready to ship as written: 5 of 8 criteria hold". `record_review` computed `pass`, because no finding was critical, and nothing stopped the item from moving to ship.
- **Whole-project reviews left no record** (#117). Six whole-project reviews were checked and their reports written, two failing on critical findings. With no work item, Peer AI stored nothing: no result, no open findings. About 250 findings existed only as files. Turning them into work meant reading every report by hand, and nothing connected the twelve resulting items to the findings they came from. `next_work`, the map and the gate all still showed the project as healthy.

## Design

### 1. A result with its open findings

When a review is recorded, its entry on the work item gains the count of open findings at each severity:

```json
{ "skill": "ai-feature-review", "result": "pass", "open": { "high": 7, "medium": 3 }, "report": "…", "at": "…", "commit": "…" }
```

A severity with none is left out. Wherever a result is shown, it's shown with those counts, the most serious first:

- in `record_review`'s reply;
- in `next_work`'s reviews;
- in `peer-ai check`;
- in `doctor`;
- in the report's summary, which a review skill now starts with its open findings.

For example: "ai-feature-review: pass, 7 high open". A result is never shown as a bare `pass` while findings are open.

`peer-ai check` also warns about each item at ship or done with high findings open, below the blocking level, so they're seen before a release. It fails only at the blocking level, as today.

### 2. An acceptance check fails on an unmet criterion

For a `qa-acceptance` review, any criterion line that fails (a coverage line under REQ-05 whose item is a `criterion:`) makes the result `fail`, whatever its finding's severity. The skill exists to answer one question: does every criterion hold?

The item then can't move to ship until either:

- the criterion holds, and the review is recorded again; or
- whoever agreed the criterion changes or drops it, with `update_work_item`, and says why. The item records the change with who made it.

### 3. Choosing what blocks a merge

`init` and `migrate` ask which open findings block a merge: critical, or critical and high. They suggest critical for a prototype or an MVP, and high for a product in production, and write `gates.blockOn`. `doctor` suggests `high` to a project at production whose `blockOn` is still `critical`.

### 4. Whole-project reviews are recorded

`record_review` without a work item now records the review in `.peer-ai/project-reviews.json`: one entry per skill, the latest, with:

- its result, open counts, report and commit;
- each open finding at the blocking level or high: id, severity and title.

- **`next_work` and `peer-ai check` report open critical findings from whole-project reviews.** `next_work` lists them for the AI tool. `check` warns at the MVP stage, and fails at production, where an open critical finding stops a release.
- **A work item can say which findings it fixes:** `fixes: ["security-review#F-3", "security-review#F-7"]`, by skill and finding id. Creating items from a report's findings, grouped by what they touch, becomes a step at the end of every whole-project review skill.
- **A finding no item covers shows.** `next_work` lists the open critical and high findings that no open or finished item `fixes`, so nothing is dropped silently. Re-recording the review after the fixes closes them.

## Compatibility

Minor:

- A work item's review entry gains `open`, and an item gains `fixes`.
- A new file, `.peer-ai/project-reviews.json`, appears.
- `qa-acceptance`'s result changes for a report with an unmet criterion: from `pass` to `fail`.
- `init` asks one more question.

A review recorded before this has no `open`, and is shown as it was. A `qa-acceptance` review recorded before keeps its result until it's recorded again.

## Drawbacks

- **Showing counts makes results longer.** Only open findings are counted, and severities with none are left out.
- **Failing on any unmet criterion** blocks an item whose criterion is wrong rather than its code. The way out is to change the criterion, with a reason, which is the decision the reviewer was really asking for.
- **One more file in `.peer-ai/`.** It holds the latest review per skill, not every review, so it stays small.

## Alternatives

- **A new result, `pass-with-findings`.** It's still one word that can be misread, and every tool that reads results would need to learn it. Counts say exactly what's open.
- **Making `high` the default blocking level for everyone.** It would block prototypes and MVPs on findings they reasonably defer. The stage is the better guide, so `init` suggests by stage.
- **Turning a whole-project review's findings into work items automatically.** Most findings group into a handful of items, and how to group them is a judgement. The skill does it with the person, and Peer AI makes sure none are lost.

## Open questions

- **Should `fixes` also accept findings from item reviews,** for follow-up work split out of a change? Proposed: yes, by the same `skill#id` form, with the item's id when it's another item's report.
