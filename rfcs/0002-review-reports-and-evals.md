# RFC 0002: Review reports and evals

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #14 |

## Summary

Every review skill writes a **review report**: what it reviewed, what it read, every rule it checked against every item, and each finding with its file, line, evidence and severity. `record_review` validates the report and works the result out from it, so a review's result is proven rather than claimed, the way `run_verify` already proves a verify. `peer-ai check` then blocks on open findings at or above `gates.blockOn`.

Skills are held to this with **evals**: fixture projects with seeded defects, a manifest of those defects that the tool under test never sees, a runner, and a pass bar each skill must clear before it ships.

## Motivation

Milestone 3 builds 29 skills. The roadmap gives each one an anatomy: an inventory of what is under review, a rule ID on every check, evidence for every finding, a coverage report in which "silence is never an answer", a severity rubric, JSON output for CI, and an eval. None of that has a format yet, and the Gate B runs showed why it matters.

- **A review result is a claim.** `record_review` stores pass, fail or incomplete, and nothing checks it. In one Gate B run the agent reviewed its own diff and recorded a pass with no findings. The review may well have been right, but nothing on record shows it.
- **Agents improvise the missing parts.** Codex wrote its review summary into `record_review`'s `report` field, which is meant for the path of a report file. It needed somewhere to say what it checked, and there wasn't one.
- **The gates can't use findings.** `gates.blockOn` is in the config schema, and `peer-ai check` can't enforce it, because there are no findings to read.
- **A skill can't be tested.** Without a structured report, "did the security review find the seeded authorisation defect?" can only be answered by a person reading prose.
- **Reviews checked an architecture the project didn't have** (#2). v0's review checked code against one layering that a modular monolith had to skip on purpose. A report that records which architecture decisions and standards it read shows whether the review used the project's own.

## Design

### The report

A review writes one JSON file per run, validated against `review-report.schema.json` in `@peer-ai/workflow`:

- `.peer-ai/reports/<work item id>/<skill>-<timestamp>.json` for a review of a work item's change
- `.peer-ai/reports/project/<skill>-<timestamp>.json` for a review of the whole project

Reports are committed with the work, as the evidence a reviewer, a payment provider or a regulator can read.

```json
{
  "$schema": "https://raw.githubusercontent.com/AbuMahir980/peer-ai/next/packages/workflow/schemas/review-report.schema.json",
  "version": 1,
  "skill": "security-review",
  "workItem": "SHOP-12",
  "at": "2026-10-05T10:00:00Z",
  "scope": { "base": "a1b2c3d", "head": "e4f5a6b", "tracks": ["api"] },
  "inputs": ["docs/architecture.md", "docs/standards/api.md", "packs/ndpa"],
  "inventory": [
    { "id": "route:GET /orders/{id}", "kind": "route", "location": { "file": "api/orders.py", "line": 58 } },
    { "id": "route:POST /orders", "kind": "route", "location": { "file": "api/orders.py", "line": 42 } }
  ],
  "coverage": [
    { "rule": "SEC-AUTHZ-01", "item": "route:GET /orders/{id}", "status": "fail", "finding": "F1" },
    { "rule": "SEC-AUTHZ-01", "item": "route:POST /orders", "status": "pass", "evidence": "api/orders.py:43 takes the owner from the session" },
    { "rule": "SEC-RATE-01", "status": "not-applicable", "reason": "This change adds no public endpoint" },
    { "rule": "SEC-LOG-03", "status": "not-checked", "reason": "Logging is configured in another repository" }
  ],
  "findings": [
    {
      "id": "F1",
      "rule": "SEC-AUTHZ-01",
      "severity": "high",
      "status": "open",
      "title": "Any signed-in user can read another user's order",
      "location": { "file": "api/orders.py", "line": 58, "endLine": 61 },
      "evidence": "get_order loads the order by id and never compares order.user_id with the caller.",
      "fix": "Load the order by id and the caller's user id, and return 404 otherwise."
    }
  ],
  "result": "fail",
  "summary": "One high finding: any signed-in user can read another user's order. 14 rules checked, 1 not checked."
}
```

| Field | Rule |
|-------|------|
| `scope` | What was reviewed: a commit range for a change, and the tracks it touched |
| `inputs` | Every document, profile, rule pack and architecture decision the review read, so a person can see which rules it applied |
| `inventory` | The whole surface under review: every route, screen, migration, service, dependency or file, each with a stable `id` |
| `coverage` | At least one entry for every rule the skill checks. `item` names an inventory entry; without one, the entry covers the whole scope. `pass` needs `evidence`; `fail` names its `finding`; `not-applicable` and `not-checked` need a `reason`. |
| `findings` | Each with a `rule`, a `severity` from the rubric, a `location`, `evidence`, a suggested `fix`, and a `status`: `open`, `fixed` or `accepted` (a risk a person accepted, with a `reason`) |
| `result` | Worked out from the rest, and must agree with it (below) |
| `summary` | At most 500 characters, for people |

### The result is worked out, not claimed

1. **fail** when an open finding is at or above the project's `gates.blockOn`, which defaults to `critical`
2. **incomplete** otherwise, when any coverage entry is `not-checked`, or a rule the skill checks has no coverage entry
3. **pass** otherwise

`record_review` gains a `report` path and a `summary`. With a report, the server validates it, checks that its skill, work item and result agree with the call, and records the result it works out. A report that disagrees is refused, with what to fix. Without a report, the review is recorded as before and marked `unproven`. `peer-ai check` warns about an unproven review on an MVP, and fails on one in production.

### Severity rubric

| Severity | Means | Examples |
|----------|-------|----------|
| critical | Harm now: exploitable, data lost or exposed, a legal or regulatory breach, or an outage | Secrets in the repository; a full card number stored; SQL injection; a migration that drops user data |
| high | Likely to hurt users or the business soon | A missing authorisation check; an API that breaks its contract; personal data in logs |
| medium | A real defect with limited reach | An unbounded query on a growing table; a screen a screen reader can't use; changed behaviour with no test |
| low | Makes the code harder to change safely | A rule from the project's standards broken in a way that affects nothing yet |

A skill may not invent its own levels, and a finding cites the rule that sets its severity.

### Gates

`peer-ai check`, and `advance_work_item` moving to ship or done, fail when the latest report from any skill on the work item has an open finding at or above `gates.blockOn`. An `accepted` finding doesn't block, and says who accepted the risk and why.

### Evals

An eval measures whether a skill finds what it should.

- **Fixtures** are small, made-up projects in `fixtures/`, each with a different shape. Step 17 adds three: a web app with an API, a React Native app with older and newer parts side by side, and a local-first app.
- **Seeded defects** are planted on purpose and listed in `evals/<fixture>.json`, outside the fixture. `scripts/fixture.ts` copies only the fixture, so the tool under test never sees the answers.

  ```json
  {
    "fixture": "courier",
    "prompts": { "security-review": "Review the parcel API for security problems." },
    "defects": [
      {
        "id": "D1",
        "skills": ["security-review", "code-review"],
        "severity": "high",
        "location": { "file": "api/app/routes/parcels.py", "line": 58, "endLine": 61 },
        "description": "GET /parcels/{id} doesn't check that the parcel belongs to the caller."
      }
    ]
  }
  ```

- **The runner**, `node scripts/eval.ts <fixture> --skill <id> [--tool claude-code|codex] [--runs <n>]`, prepares a fresh copy, gives the tool the prompt in plain words, collects the reports the run wrote, and scores them.
- **Scoring.** A seeded defect is found when a finding from one of its skills overlaps its lines, within three lines, at a severity no more than one level away. Findings that match no seeded defect are listed for a person: a real defect nobody planted is added to the manifest, and a wrong one counts against the skill.
- **Pass bar** for a skill to ship: every seeded critical and high defect found, at least 80% of the medium ones, and a valid report with no rule left uncovered, on two runs in a row on Claude Code. Before 1.0, each skill also passes once on Codex.
- **Results** are logged in `evals/README.md` with the date, tool, version, score, turns and cost, as the Gate B runs are in `fixtures/README.md`.

## Compatibility

Minor, while Peer AI is `0.x`. Everything here is new except two changes to what already exists:

- A work item's review entry gains an optional `summary` and an `unproven` flag. Both are additive, so existing work items stay valid.
- `record_review` with a report now refuses a result the report doesn't support. Nothing publishes reports yet, so nothing depends on the old behaviour.

After 1.0, a change to the report format is a major version, like the config and state schemas.

## Drawbacks

- **Reports are long.** A coverage entry for every rule against every item adds up; a production security review may have hundreds. They are for tools and auditors, and the summary is for people.
- **Evals cost money.** A run costs roughly $1 to $3 on Claude Code. A full pass, with every skill on its fixtures, twice, is on the order of a hundred runs. So evals run per skill when that skill changes, and in full before a release.
- **Seeded defects are not the real world.** A skill can pass its evals and still miss a defect nobody thought to plant. Adding every real miss to a manifest narrows that gap over time.
- **Line matching is approximate.** Three lines of tolerance can match the wrong finding in dense code. Unmatched findings go to a person rather than being scored silently.

## Alternatives

- **Keep results claimed, and trust the agent.** Rejected: it is exactly what Peer AI replaces. `run_verify` already showed that proving a result costs little.
- **SARIF**, the static-analysis interchange format. Considered: CI systems can display it. It has no place for coverage, the "not checked" that makes silence visible, or accepted risk. A SARIF export can be added later, generated from the report.
- **Score evals by a model judging the prose.** Rejected as the primary measure: it is slower, costlier and less repeatable than matching locations. It may help triage unmatched findings.

## Open questions

- **Rule ID format.** Rule IDs come from the core standards in step 20. The report takes them as strings until then.
- **Evals in CI.** Running evals in CI needs an API key and costs money on every run. Until the maintainer decides, they run locally, before releases and when a skill changes.
- **Accepting risk.** Who may mark a finding `accepted` on a team project, and whether it needs a second person.
