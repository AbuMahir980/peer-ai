---
name: release-readiness
description: Checks a release before it reaches people (every item's gates, the pipeline's checks, a way back at each step, safe data changes, staging, signs it's healthy), proving each rule was checked. Use when a deploy, app release or library publish is next.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-rules: REQ-05 API-06 DATA-03 DEL-04 DEL-05 DEL-06 DEL-07 DEL-08 DEL-10 OPS-04 OPS-05 OPS-09 OPS-10 OPS-11 OPS-14 OPS-15 TEST-10 MOB-06
---

# Release readiness

Check a release before it reaches production: every item in it has passed its own gates, it goes out through the pipeline with every required check, it can be undone at every step, its data changes are safe in the order they'll run, it was tried first, and someone will know if it goes wrong. Record a report that proves what was checked. The report is the output: don't release, deploy or publish anything during the check, and don't move any work item's stage.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the release, its items, its changes and its plan
- [ ] 2. Inventory: every item, change, step, check and signal
- [ ] 3. Rules: which apply at the project's stage
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review`
```

## 1. Scope

- **The release:** what the person names, such as a version, a tag or a branch to deploy, an app going to the stores, or a library about to be published. Otherwise, the work items at verify and ship that haven't shipped, from the peer-ai MCP tool `next_work`. List each item in the report's `scope`.
- **What changed:** everything between the last release and this one, such as the commits since the last release tag, or since the commit that set the version now published when there's no tag, and each work item's record: its stage, last verify, required reviews and their results.
- **How it goes out:** the release plan or notes, if there are any; the CI and deployment pipelines; the environments in `peer-ai.config.json`; and the infrastructure it runs on.

List what you read in the report's `inputs`. With no release plan at all, say so at the top of the summary, and check the release from its items and changes.

## 2. Inventory

List from the files and records, with an id, a kind and where it is:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `item` | `item:BK-12` | Each work item in the release: its stage, last verify, required reviews and results |
| `change` | `change:0007_add_frame_size` | Each change that needs care going out: a data change, a new setting or secret, an infrastructure change, a change to an interface others use |
| `step` | `step:migrate` | Each step of the release, in the order it runs, and its way back |
| `check` | `check:tests` | Each required check, and whether it can stop the release |
| `signal` | `signal:bookings-errors` | Each alert, health check or measure that shows the release is healthy |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the files the release changes. It returns the rules that apply at the project's stage.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here, and the line says why, such as MOB-06 for a product with no phone app. A rule that applies from a later stage is `not-applicable` with that reason; a problem it describes that the release already shows is still a finding, saying when the rule applies in full.

## 4. Check

[checking.md](references/checking.md) says how to check each rule.

Hold every line to this bar:

- **Every item passes its own gates.** Its last verify passed, every required review is recorded and passed, and every acceptance criterion holds (REQ-05). An item that hasn't is a finding: it comes out of the release, or the release waits.
- **Every interface against what people have now.** For each change to an interface others use, diff it with `git` against the version people have now, and quote the old form and the new in the evidence. Tests changed in this release show the new form, not the code people wrote against the old one (API-06).
- **Every step in order.** Say what runs first, and what the previous version meets at each step. At every step the release can be undone (OPS-14).
- **Only what the files and records show.** A scan, a restore or a penetration test counts when a report or record shows it, with its date. Otherwise the line is `not-checked`, with the question for whoever would know.
- **A failure is a finding:** what could go wrong for people using the product, the file and line or record, and what must happen before release. Its severity is its rule's, from [severity.md](references/severity.md).

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/release-readiness-<time>.json` for a single item, or under `project/` for a release of several. Its `skill` is `release-readiness`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `release-readiness`, the report's path, and the work item's id when the release is one item. For a release of several, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: whether the release is ready, what must happen before it goes out, most serious first, and what wasn't checked and why. Offer to turn the findings into work items.
