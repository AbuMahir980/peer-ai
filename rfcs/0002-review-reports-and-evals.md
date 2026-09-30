# RFC 0002: Review reports and evals

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Proposal issue | #14 |

## Summary

When an AI reviews code, it must write a report that shows its work: what it looked at, which rules it checked, and every problem it found, with the exact file and line. Peer AI reads the report and decides whether the review passed. The AI no longer just says "pass".

To prove each review does its job, we test it on small practice projects with mistakes planted in them on purpose. A review is ready only when it finds the serious ones.

## Motivation

**Today, a review result is only a claim.** The `record_review` tool stores "pass", "fail" or "incomplete", and nothing checks it. We already fixed the same problem for tests: an AI can't say "tests passed", because only `run_verify` records a test result, and it runs the tests itself. Reviews need the same treatment.

We saw the gap in the Gate B runs, where Claude Code and Codex each worked through a task on a practice project:

- **An AI recorded "pass" with nothing to show for it.** One run reviewed its own change, found nothing, and recorded a pass. The review may have been right, but nothing on record shows what it checked.
- **An AI had nowhere to explain its review.** Codex wrote its review summary into the field meant for the location of a report file, because there was no proper place for it.

It also blocks two things we need:

- **The shipping rule can't work.** Projects can already set how serious a problem must be to stop shipping (`gates.blockOn`), but `peer-ai check` can't apply it, because reviews record no problems.
- **Reviews can't be tested.** To ask "did the security review find the planted mistake?", a person would have to read the review's prose. We need something a program can check.

And it answers issue #2. In v0, reviews checked code against one fixed way of structuring a project, even when a project was built differently. If a report lists what the review read, including the project's own architecture decisions, anyone can see whether it judged the project by its own design.

## Design

### 1. Every review writes a report

A report is a JSON file, saved and committed with the work:

- `.peer-ai/reports/<work item id>/<skill>-<time>.json` for a review of one piece of work
- `.peer-ai/reports/project/<skill>-<time>.json` for a review of the whole project

Committing it means the evidence stays with the code, for teammates, auditors or a payment provider to read.

A report answers six questions:

| Question | Field | Example |
|----------|-------|---------|
| What was reviewed? | `scope` | The commits in this change, in the `api` part of the project |
| What did the review read first? | `inputs` | The architecture doc, the API standards, the NDPA rule pack |
| What exactly was checked? | `inventory` | Every route, screen, database change or dependency in scope, each with an id |
| Which rules were checked, and how did each go? | `coverage` | A line for every rule: passed, failed, doesn't apply, or not checked |
| What problems were found? | `findings` | Each problem: the rule it breaks, how serious it is, the file and line, the evidence, and a suggested fix |
| In short? | `summary` | Up to 500 characters, for people |

The coverage lines are where the review shows its work:

- **passed** must say what was checked, such as "api/orders.py line 43 takes the owner from the session"
- **failed** points to the problem it found
- **doesn't apply** and **not checked** must give a reason

A review can't stay silent about a rule. If it didn't check something, it has to say so and say why.

Here is a small example:

```json
{
  "$schema": "https://raw.githubusercontent.com/AbuMahir980/peer-ai/main/packages/workflow/schemas/review-report.schema.json",
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
    { "rule": "SEC-LOG-03", "status": "not-checked", "reason": "Logging is set up in another repository" }
  ],
  "findings": [
    {
      "id": "F1",
      "rule": "SEC-AUTHZ-01",
      "severity": "high",
      "status": "open",
      "title": "Any signed-in user can read another user's order",
      "location": { "file": "api/orders.py", "line": 58, "endLine": 61 },
      "evidence": "get_order loads the order by id and never checks that it belongs to the caller.",
      "fix": "Load the order by id and the caller's user id, and return 404 otherwise."
    }
  ],
  "result": "fail",
  "summary": "One high problem: any signed-in user can read another user's order. 14 rules checked, 1 not checked."
}
```

A problem can be `open`, `fixed`, or `accepted`. Accepted means a person knowingly accepted the risk, and the report says why.

### 2. Peer AI decides the result, not the AI

Peer AI works out the result from the report:

1. **fail** if there is an open problem at or above the project's blocking level (`gates.blockOn`, which is "critical" unless the project sets it lower)
2. **incomplete** if not, but some rule was left unchecked
3. **pass** otherwise

The `record_review` tool gains a place for the report and a short summary. When a report is given, Peer AI checks it is valid and records the result it works out. If the AI's claimed result doesn't match the report, the tool refuses and says what's wrong.

A review recorded without a report is marked **unproven**. `peer-ai check` warns about that for an MVP, and fails on it for a project in production.

### 3. One scale for how serious a problem is

| Level | Means | Examples |
|-------|-------|----------|
| critical | It causes harm now: a security hole, data lost or exposed, a law broken, or the service going down | A password or key in the code; a full card number stored; SQL injection; a database change that deletes user data |
| high | It is likely to hurt users or the business soon | A missing permission check; an API that no longer does what it promised; personal data written to logs |
| medium | A real problem with limited reach | A database query with no limit on a growing table; a screen a screen reader can't use; new behaviour with no test |
| low | It makes the code harder to change safely | A project standard broken in a way that affects nothing yet |

Reviews may not invent their own levels, and each problem cites the rule that sets its level.

### 4. Serious problems stop shipping

A work item can't move to "ship" or "done", and `peer-ai check` fails, while the latest report from any review has an open problem at or above the blocking level. An accepted problem doesn't block.

### 5. Testing the reviews themselves

We test each review the way a teacher tests a student: with an exam whose answers the student never sees.

- **Practice projects.** Small, made-up projects in `fixtures/`, each shaped differently: a web app with an API, a React Native app with old and new code side by side, and an app that works offline first.
- **Planted mistakes.** Each project has mistakes put there on purpose. The list of them, the answer sheet, lives in `evals/<project>.json`, outside the project. The AI works on a copy of the project only, so it never sees the answers.

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

- **Running a test.** `node scripts/eval.ts <project> --skill <review>` makes a fresh copy, asks the AI for the review in plain words, collects the report it writes, and marks it.
- **Marking.** A planted mistake counts as found when the report names a problem within three lines of it, at about the right level, no more than one level away. Problems the report raises that aren't on the answer sheet go to a person to judge. If one turns out to be a real mistake nobody planted, it's added to the answer sheet. If it's wrong, it counts against the review.
- **The pass mark.** A review is ready to ship when it finds every planted critical and high mistake and at least 80% of the medium ones, with a complete report, two runs in a row on Claude Code. Before version 1.0, it must also pass once on Codex.
- **A record of every test.** Results go in `evals/README.md`, as the Gate B runs are recorded in `fixtures/README.md`.

## Compatibility

Almost everything here is new. Only two existing things change, and neither breaks anything:

- A work item's review record gains an optional summary and an "unproven" mark. Existing work items stay valid.
- `record_review` refuses a result its report doesn't support. No reports exist yet, so nothing relies on the old behaviour.

Before 1.0, this is a minor version. After 1.0, any change to the report format is a major version, like changes to the config.

## Drawbacks

- **Reports are long.** A line for every rule, for everything reviewed, adds up; a full security review could have hundreds. The report is for tools and auditors; the summary is for people.
- **Testing costs money.** One test run uses about $1–3 of Claude usage, and testing every review is roughly 100 runs. So we test a review when it changes, and test everything before a release.
- **Practice projects aren't the real world.** A review can pass every test and still miss a mistake nobody thought to plant. Each real miss becomes a new planted mistake, so the tests get better over time.
- **Marking by line number is approximate.** In crowded code, three lines either side can match the wrong problem. Anything that doesn't match clearly goes to a person.

## Alternatives

- **Trust the AI's own result.** Rejected: that is exactly what Peer AI is meant to replace, and `run_verify` shows proof is cheap.
- **SARIF**, an existing format for code-scanning tools that many CI systems can display. It has no place to say "I didn't check this rule", which is the whole point, and no place for an accepted risk. We can export to SARIF later.
- **Have an AI mark the reviews by reading them.** Rejected as the main method: slower, more expensive and less consistent than checking file and line. It may help a person judge the problems that don't match.

## Open questions

- **What rule ids look like.** They come with the core standards, in step 20. Until then, a rule id is any text.
- **Running tests in CI.** Running them automatically on GitHub needs a paid API key, with a cost on every run. Until the maintainer decides, they run on the maintainer's machine when a review changes and before each release.
- **Who may accept a risk.** On a team, should accepting a serious problem need a second person?
