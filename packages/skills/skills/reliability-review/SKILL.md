---
name: reliability-review
description: Reviews code for reliability (timeouts, failures, repeatable jobs, offline use, data kept on a device, updates, safe configuration) against Peer AI's rules, proving each was checked. Use when reviewing reliability or before a launch.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-domains: reliability
  peer-ai-rules: SYS-01 FE-09 PERF-06 PERF-07 OPS-02
---

# Reliability review

Check the code in scope against every rule in [rules.md](references/rules.md), and record a report that proves what was checked. Reliability is what happens when things go wrong: a slow service, a dropped connection, a job run twice, a full device, a new version. The report is the output: don't fix anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the work item's change, or the whole project
- [ ] 2. Inventory: every call out, job, live connection, store, cache and start-up path
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review what its branch changed (`git diff --name-only <base>...HEAD`), and the code it relies on, such as the shared request helper a changed screen calls.
- **The whole project:** every part on the map from the peer-ai MCP tool `project_map`, except external and dormant ones, older code included.

Read the requirements' availability needs and the architecture first, and list them in the report's `inputs`. `project.traits` in `peer-ai.config.json` says whether the product works offline or keeps live connections.

## 2. Inventory

List every place where something can fail, from the code, with an id, a kind and its file and line:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `outside` | `outside:maps` | Each call to another service or API, including the project's own API from an app |
| `job` | `job:send-reminders` | Each background or scheduled job, and each queue consumer |
| `live` | `live:workshop-feed` | Each live connection |
| `store` | `store:bookings-on-device` | Each place data is kept, and whether it's the only copy |
| `cache` | `cache:app-shell` | Each cache, including an app that caches its own code |
| `resource` | `resource:status-poll` | Each timer, subscription or listener a screen creates |
| `startup` | `startup:api` | Each process's start-up, and how it decides which environment it's in |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the files in scope. It returns the rules that apply at the project's stage and traits.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here, such as REL-08 for a product that keeps nothing on a device. The line says why.

## 4. Check

| Rules | Reference |
|-------|-----------|
| REL-01, REL-02, REL-03, SYS-01, REL-07: calls, jobs, caches and connections | [failures.md](references/failures.md) |
| REL-08, REL-09, FE-09, PERF-06, PERF-07: apps and the data they keep | [apps-and-devices.md](references/apps-and-devices.md) |
| REL-04, REL-05, REL-06, OPS-02: environments and start-up | [environments.md](references/environments.md) |

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the rule holds, such as "requests.ts:9 aborts a request after 10 seconds, and the screen shows a retry message".
- **A failure is a finding:** what breaks and for whom, the file and line, and a fix. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every item, not a sample.** A rule about each call out is checked on each call out.
- **Follow the failure.** For each call out, trace what the person sees when it's slow, when it fails, and when there's no connection.
- **Only what the code shows.** When the proof lives where you can't see it, such as a queue's settings in the hosting platform, the line is `not-checked` with that reason.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/reliability-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `reliability-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `reliability-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: the result, each finding's severity and title, and what wasn't checked and why. Offer to turn the findings into work items.
