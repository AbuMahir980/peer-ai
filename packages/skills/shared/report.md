# Report

## Contents

- Where the report goes
- What each part holds
- Coverage: a line for every rule
- Findings
- The result
- Recording it
- Example

## Where the report goes

A JSON file, committed with the work:

- `.peer-ai/reports/<work item id>/<skill>-<time>.json` for a review of one piece of work
- `.peer-ai/reports/project/<skill>-<time>.json` for a review of the whole project

Write `<time>` as `20261005T1000Z`: no colons, so the name works on every system.

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
| `summary` | Up to 500 characters, for people |

## Coverage: a line for every rule

Every rule in `rules.md` gets at least one line: those are the rules this review answers for. A rule that applies to each item, such as a permission check on each route, gets a line per item, with `item` set to the inventory id.

A rule that doesn't apply is `not-applicable`, with the reason: the peer-ai MCP tool `standards_for_file` didn't return it for any file in scope (its stage is later than the project's, the project lacks its trait, or it's for another kind of part), nothing in scope is of its kind, or the project has set it aside (give the recorded reason and who decided).

| `status` | Needs |
|----------|-------|
| `pass` | `evidence`: what was checked and where, such as "orders.ts:43 takes the owner from the session" |
| `fail` | `finding`: the id of the finding |
| `not-applicable` | `reason`, such as "No upload in this change" |
| `not-checked` | `reason`, such as "Logging is configured in another repository" |

Silence is never an answer: a rule left out of coverage makes the report invalid.

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

1. `fail` if a finding is open at or above the project's blocking level (critical, unless the project sets it lower)
2. `incomplete` if not, but a rule is `not-checked`
3. `pass` otherwise

## Recording it

Call the peer-ai MCP tool `record_review` with the `skill` and the `report` path, and the work item's `id` when there is one. Peer AI checks the report and works out the result. If it refuses, fix what it names and call it again, until it accepts. Record failed and incomplete reviews too.

A whole-project review has no work item: leave out the `id`. Peer AI checks the report the same way and gives its result, without recording it anywhere. If the peer-ai MCP tools aren't available, run `npx peer-ai check-report <report path>`, which makes the same checks. Never skip this step: a report nobody checked may not count.

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
