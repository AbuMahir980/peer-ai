# Report

## Contents

- Where the report goes
- What each part holds
- Coverage: a line for every rule
- A light review
- Findings
- The result
- Recording it
- Example

## Where the report goes

A JSON file, committed with the work:

- `.peer-ai/reports/<work item id>/<skill>-<time>.json` for a review of one piece of work
- `.peer-ai/reports/project/<skill>-<time>.json` for a review of the whole project

Write `<time>` as `20261005T1000Z`: no colons, so the name works on every system.

Before a whole-project review starts, call the peer-ai MCP tool `project_map`. Its `reviewSizes` gives this review's rough size over the whole project, as small, medium or large, with the files, lines and rules behind it and the token range it means (RFC 0016). Tell the person, and ask whether to run it whole, for one part, or not now. The estimate is rough, so say so.

## What each part holds

| Field | Holds |
|-------|-------|
| `version` | `1` |
| `skill` | This skill's id |
| `workItem` | The work item's id. Leave it out for a whole-project review. |
| `at` | When the review ran, with its time zone, such as `2026-10-05T10:00:00Z` |
| `scope` | What was reviewed: `base` and `head` commits, `tracks`, and `files` |
| `inputs` | Every document, profile, rule pack and decision read first |
| `inventory` | Everything under review, each with an `id`, a `kind` and a `location` |
| `coverage` | How each rule went (below) |
| `findings` | Each problem found (below) |
| `result` | `pass`, `fail` or `incomplete` (below) |
| `summary` | Up to 500 characters, for people. Start with the result and what's left open, the most serious first, such as "Pass, with 7 high findings open: …", so a pass is never read as all clear |

## Coverage: a line for every rule

For a review of a work item, every rule `next_work` lists with the review, its `rules`, gets at least one line: those are the rules that can apply to the files the change touched, and the ones this review answers for (RFC 0016). A whole-project review answers for every rule in `rules.md`. A line for a rule outside the set is accepted too. A rule that applies to each item, such as a permission check on each route, gets a line per item, with `item` set to the inventory id.

A rule that doesn't apply is `not-applicable`, with the reason: the peer-ai MCP tool `standards_for_file` didn't return it for any file in scope (its stage is later than the project's, the project lacks its trait, or it's for another kind of part, another kind of file or another language), nothing in scope is of its kind, or the project has set it aside (give the recorded reason and who decided). A rule that doesn't apply yet, but whose problem the files already show, is `fail` with its finding, not `not-applicable`: say in the finding when the rule applies in full. Every finding needs a failing line, so Peer AI refuses a finding whose rule is marked `not-applicable`.

| `status` | Needs |
|----------|-------|
| `pass` | `evidence`: what was checked and where, such as "orders.ts:43 takes the owner from the session". For an automatic rule, `checkedBy` too (below) |
| `fail` | `finding`: the id of the finding |
| `not-applicable` | `reason`, such as "No upload in this change" |
| `not-checked` | `reason`, such as "Logging is configured in another repository" |

Silence is never an answer: a rule left out of coverage makes the report invalid.

**An automatic rule says how it was checked** (RFC 0019). For a pass of a rule a tool checks, set `checkedBy`:

- `tool` when its tool enforces the rule for the files in scope, and the tool's run is the evidence. `standards_for_file` says so: the rule has `enforced: true`.
- `reading` when you checked it by reading the code, including wherever `standards_for_file` gives the rule `enforced: false`, with why in `notEnforced`.

Left out, it counts as `reading`. Peer AI refuses `tool` where the tool doesn't enforce the rule, and the result says how many automatic rules were checked by reading only. Check those with extra care: nothing else will catch them.

## A light review

When `next_work` gives a required review `depth: light`, its trigger was weak: a few changed lines, no new file, nothing about routes, access or sessions (RFC 0016). Then:

- inventory only the changed hunks, not the screens or routes around them;
- answer for the rules `next_work` gives the review, as they apply to those hunks;
- write the report as usual, with `"depth": "light"`.

A light review never stands in for a full one: when the review isn't marked light, do the whole review. If the person decides the item doesn't need a review at all, they can waive it, with why: `update_work_item` with `waive`, or `npx peer-ai waive`. Never waive one yourself.

## Findings

| Field | Holds |
|-------|-------|
| `id` | `F1`, `F2` and so on |
| `rule` | The rule it breaks |
| `severity` | The rule's severity, from `severity.md` |
| `status` | `open`. `fixed` once a later change fixes it. `accepted` only when a person accepts the risk, with `acceptedBy` and `reason`. |
| `title` | The harm, in plain words |
| `location` | `file`, and `line` and `endLine` where there are lines |
| `evidence` | What shows the problem is real |
| `fix` | A suggested fix |

Each finding is one problem, at the place it happens. Two problems are two findings, each with its own rule, even when one leads to the other or they sit on the same screen.

## The result

Peer AI works out the result from the report, and the report must say the same:

1. `fail` if a finding is open at or above the project's blocking level (critical, unless the project sets it lower), or, for `qa-acceptance`, if any acceptance criterion doesn't hold, whatever its finding's severity
2. `incomplete` if not, but a rule is `not-checked`
3. `pass` otherwise

Peer AI records the result with how many findings are left open at each severity, and shows it that way everywhere: "pass, 7 high open". Tell the person the same.

## Recording it

Call the peer-ai MCP tool `record_review` with the `skill` and the `report` path, and the work item's `id` when there is one. Peer AI checks the report and works out the result. If it refuses, fix what it names and call it again, until it accepts. Record failed and incomplete reviews too.

A whole-project review has no work item: leave out the `id`. Peer AI checks the report the same way and records it in `.peer-ai/project-reviews.json`, with its open findings, so `next_work` and the gate keep them in sight. Then, with the person, group the open critical and high findings into work items with `create_work_item`, each listing the findings it fixes in `fixes`, as `skill#finding` (such as `security-review#F-3`). `next_work` lists any that no item covers. If the peer-ai MCP tools aren't available, run `npx peer-ai check-report <report path>`, which makes the same checks. Never skip this step: a report nobody checked may not count.

## Example

```json
{
  "version": 1,
  "skill": "security-review",
  "workItem": "SHOP-12",
  "at": "2026-10-05T10:00:00Z",
  "scope": { "base": "a1b2c3d", "head": "e4f5a6b", "tracks": ["api"] },
  "inputs": ["docs/architecture.md", "docs/threat-model.md"],
  "inventory": [
    { "id": "route:GET /orders/{id}", "kind": "route", "location": { "file": "api/src/orders.ts", "line": 58 } },
    { "id": "route:POST /orders", "kind": "route", "location": { "file": "api/src/orders.ts", "line": 42 } }
  ],
  "coverage": [
    { "rule": "SEC-01", "item": "route:GET /orders/{id}", "status": "fail", "finding": "F1" },
    {
      "rule": "SEC-01",
      "item": "route:POST /orders",
      "status": "pass",
      "evidence": "orders.ts:43 takes the owner from the session"
    },
    { "rule": "SEC-19", "status": "not-applicable", "reason": "No upload in this change" },
    { "rule": "SEC-24", "status": "not-checked", "reason": "Logging is configured in another repository" }
  ],
  "findings": [
    {
      "id": "F1",
      "rule": "SEC-01",
      "severity": "high",
      "status": "open",
      "title": "Any signed-in user can read another user's order",
      "location": { "file": "api/src/orders.ts", "line": 58, "endLine": 61 },
      "evidence": "getOrder loads the order by id and never checks that it belongs to the caller.",
      "fix": "Load the order by id and the caller's user id, and return 404 otherwise."
    }
  ],
  "result": "incomplete",
  "summary": "One high problem: any signed-in user can read another user's order. SEC-24 not checked."
}
```

The result is `incomplete`, not `fail`: the high finding is below the default blocking level (critical), and SEC-24 was not checked.
