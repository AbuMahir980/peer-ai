---
name: observability-review
description: Reviews how a product is watched in production (logs, request ids, health checks, alerts, security events, service targets, nothing personal in logs), proving each rule was checked. Use when logging, monitoring or alerting changes.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-rules: OPS-07 OPS-08 OPS-09 OPS-10 OPS-12 OPS-13 OPS-15 SEC-24 PRIV-01
---

# Observability review

Check how the product tells its people what it's doing in production: what it logs, whether a request can be followed, whether its health checks tell the truth, whether its alerts are worth waking someone for, whether attacks and missed targets get noticed, and that none of it leaks personal data. Check it against every rule in [rules.md](references/rules.md), and record a report that proves what was checked. The report is the output: don't change anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: what the work item changed, or everything that runs in production
- [ ] 2. Inventory: every log, trace, health check, alert, security event and target
- [ ] 3. Rules: which apply at the project's stage
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review what its branch changed (`git diff --name-only <base>...HEAD`), and the logging, monitoring and alerting around it.
- **The whole project:** every part on the map from the peer-ai MCP tool `project_map` that runs in production, and its logging setup, monitoring and error-reporting libraries, health checks, alert rules and dashboards, and any written service targets.

Read these first, and list them in the report's `inputs`: the logging setup, the error or crash reporting setup, the health checks, the alert rules, the service targets, the incident plan, and the threat model.

## 2. Inventory

List from the code and files, with an id, a kind and its file and line:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `log` | `log:booking-created` | Each log call, and where logs go |
| `trace` | `trace:request-id` | How a request is followed: its id, where it's set and passed on |
| `health` | `health:ready` | Each health or readiness check, and what it tests |
| `alert` | `alert:bookings-failing` | Each alert, what fires it, and who it reaches |
| `event` | `event:sign-in-failed` | Each security event the product should record |
| `target` | `target:booking-success` | Each written target for a main journey, and how it's measured |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the files in scope. It returns the rules that apply at the project's stage.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here, and the line says why. A rule that applies from a later stage, such as OPS-08 from production, is `not-applicable` with that reason; a problem it describes that the code already shows is still a finding, saying when the rule applies in full.

## 4. Check

[checking.md](references/checking.md) says how to check each rule.

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the rule holds, such as "logging.ts:12 writes JSON with the request id on every line".
- **A failure is a finding:** what someone would miss, or what would leak, the file and line, and a fix. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every log call that could carry data** is checked against PRIV-01, not a sample.
- **Every security event the product has** is checked against SEC-24: sign-ins, failed ones, refused permissions, and the security controls it runs.
- **Only what the code and files show.** Where logs, alerts or dashboards are set up in a tool outside the repository, the line is `not-checked`, with the question for whoever runs it.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/observability-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `observability-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `observability-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: the result, each finding's severity and title, most serious first, and what wasn't checked because it lives outside the repository. Offer to turn the findings into work items.
