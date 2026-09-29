---
name: performance-review
description: Reviews code for performance problems (queries per row, unpaged lists, slow work in requests, long lists, leaks, oversized images, caching) against Peer AI's rules, proving each was checked. Use when reviewing performance, or before a launch.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-domains: performance
  peer-ai-rules: SYS-02 API-07 API-08 REL-01 REL-09
---

# Performance review

Check the code in scope against every rule in [rules.md](references/rules.md), and record a report that proves what was checked. The report is the output: don't fix anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the work item's change, or the whole project
- [ ] 2. Inventory: every list, query, outside call, cache, timer and image path
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review what its branch changed (`git diff --name-only <base>...HEAD`), and the code a changed path calls, such as the query behind a changed endpoint.
- **The whole project:** every part on the map from the peer-ai MCP tool `project_map`, except external and dormant ones, older code included.

Read the requirements' needs first, such as how many people and how much data, and list them in the report's `inputs`. They say what "slow" means here. Read the migrations or schema too: indexes live there.

## 2. Inventory

List everything whose cost grows with use, from the code, with an id, a kind and its file and line:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `list-endpoint` | `list-endpoint:GET /bookings` | Each endpoint or query that returns a list |
| `query` | `query:bookings-by-shop` | Each database query, and the columns it filters and sorts by |
| `outside` | `outside:maps` | Each call to another service |
| `slow-work` | `slow-work:send-receipt` | Email, notifications, file processing and exports |
| `cache` | `cache:shop-hours` | Each cache, and each app that caches itself, such as with a service worker |
| `screen-list` | `screen-list:bookings` | Each list a screen draws |
| `resource` | `resource:poll-timer` | Each timer, subscription, listener or object URL a screen creates |
| `image` | `image:damage-photo` | Each place photos or large images are stored or uploaded |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the files in scope. It returns the rules that apply at the project's stage, with the stack profile's numbers, such as the largest page size.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here. A rule that applies from a later stage, such as PERF-02 from production, or only with a trait the project hasn't set, such as `offline`, is `not-applicable` with that reason. Either way, a problem it describes that the code already shows, such as a list filtered on a column with no index or a service worker that never updates, is still a finding, saying when the rule applies in full.

## 4. Check

| Rules | Reference |
|-------|-----------|
| PERF-01 to PERF-04, SYS-02, API-07, API-08, REL-01: the server | [server.md](references/server.md) |
| PERF-05 to PERF-07, REL-09: screens and apps | [screens-and-apps.md](references/screens-and-apps.md) |

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the rule holds, such as "bookings.py:52 loads the bookings with their shops in one joined query".
- **A failure is a finding:** the cost in plain words, such as "each page load makes one query per booking", the file and line, and a fix. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every item, not a sample.** A rule about each list is checked on each list.
- **Show the growth.** Say what makes it worse: more rows, more photos, a longer session.
- **Only what the code shows.** Timings need the running system: when the proof needs one, such as a query plan, the line is `not-checked` with that reason.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/performance-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `performance-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `performance-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: the result, each finding's severity and title, and what wasn't checked and why. Offer to turn the findings into work items.
