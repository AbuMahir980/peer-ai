---
name: infrastructure-review
description: Reviews infrastructure and deployment (environments kept apart, what each service may access, what the internet can reach, secrets, backups, how changes reach production), proving each rule was checked. Use when infrastructure or deployment changes.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-rules: OPS-01 OPS-02 OPS-03 OPS-04 OPS-05 OPS-06 DEL-06 SEC-10 SEC-15 SEC-23 SEC-26 SEC-28 SEC-29
---

# Infrastructure review

Check everything that runs the product against every rule in [rules.md](references/rules.md): the infrastructure code, container and hosting files, and the pipeline that deploys them. Record a report that proves what was checked. The report is the output: don't change or apply anything during the review, and never run a command against a real environment.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the infrastructure and deployment files the work item changed, or all of them
- [ ] 2. Inventory: every environment, resource, way in, identity, secret, backup and pipeline
- [ ] 3. Rules: which apply at the project's stage
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review the infrastructure and deployment files its branch changed (`git diff --name-only <base>...HEAD`), and whatever they connect to.
- **The whole project:** every infrastructure part on the map from the peer-ai MCP tool `project_map`, and every infrastructure-as-code, container, hosting and pipeline file in the repository, older ones included.

Read these first, and list them in the report's `inputs`: the infrastructure code, container and hosting files, the CI and deployment pipelines, the environments in `peer-ai.config.json`, and the architecture. Read what the files declare. Never run a plan, an apply or a deploy, and never connect to a live environment: the review is of the code.

## 2. Inventory

List from the files, with an id, a kind and its file and line:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `environment` | `environment:production` | Each environment, and what keeps it apart from the others |
| `resource` | `resource:bookings-db` | Each database, store, queue, service, function and cache |
| `exposure` | `exposure:api-load-balancer` | Each thing reachable from the internet: an address, a port, a public link, a page |
| `identity` | `identity:api-service` | Each account a service, job or pipeline uses, and what it's allowed to do |
| `secret` | `secret:db-password` | Each secret, and where it's kept |
| `backup` | `backup:bookings-db` | Each backup, how long it's kept, and whether a restore has been tried |
| `pipeline` | `pipeline:deploy-production` | Each way a change reaches an environment |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the infrastructure files in scope. It returns the rules that apply at the project's stage.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here, and the line says why. A rule that applies from a later stage, such as OPS-03 from production, is `not-applicable` with that reason. Either way, a problem it describes that the files already show is still a finding: mark that rule's line `fail`, not `not-applicable`, with the finding, and say in the finding when the rule applies in full.

## 4. Check

[checking.md](references/checking.md) says how to check each rule.

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the rule holds, such as "infra/db.tf:22 keeps the bookings database on a private network, with no public address".
- **A failure is a finding:** what could happen and to what, the file and line, and a fix. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every item, not a sample.** Each `exposure` is checked against SEC-29, each `identity` against SEC-28, each `secret` against SEC-10 and SEC-26, and each store of data against OPS-05.
- **Only what the files show.** What depends on the live environment, such as whether a restore was ever tried, or who holds access today, is `not-checked` with the question to ask its owner, unless a file records it.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/infrastructure-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `infrastructure-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `infrastructure-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: the result, each finding's severity and title, most serious first, and the questions for whoever runs the environments. Offer to turn the findings into work items.
