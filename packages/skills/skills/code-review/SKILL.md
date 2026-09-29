---
name: code-review
description: Reviews a change for bugs and maintainability (lost data, races, API breaks, slow queries, leaks and code quality) against Peer AI's rules, proving each was checked. Use when reviewing a change or pull request. Not a security audit.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-domains: code-quality architecture frontend backend system-design money safety-critical
  peer-ai-rules: DATA-03 REL-01 PERF-01 PERF-05 PERF-06 API-06 TEST-01 TEST-04 TEST-07
---

# Code review

Check the code in scope against every rule in [rules.md](references/rules.md), and watch for serious problems anywhere. Record a report that proves what was checked. The report is the output: don't fix anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the work item's change, or the whole project
- [ ] 2. Inventory: every unit the change touches
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: every rule against every unit it applies to, and the sweep for serious problems
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review what its branch changed (`git diff --name-only <base>...HEAD`), and read the unchanged code each changed unit calls or is called by.
- **The whole project:** every part on the map from the peer-ai MCP tool `project_map`, except external and dormant ones.

Read these first where they exist, and list them in the report's `inputs`: the architecture and its decision records, the API contract, the project's standards documents, and the rules it has set aside (`standards.exceptions` in `peer-ai.config.json`).

## 2. Inventory

List every unit in scope, from the code. Give each an id, a kind and its file and line.

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `function` | `function:priceFor` | Functions and methods with logic worth checking |
| `component` | `component:BookList` | Screens and components |
| `route` | `route:POST /parcels` | Endpoints and their handlers |
| `job` | `job:send-reminders` | Background and scheduled work |
| `migration` | `migration:0002_notes` | Database migrations, and changes to data stored on a device |
| `contract` | `contract:openapi` | The API contract, and the types that come from it |
| `test` | `test:pricing` | Test files |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the files in scope. For a whole project, one file from each part is enough. It returns the rules that apply at the project's stage and traits, with the stack profile's rules and numbers, such as how large a function may grow.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here. The line says why. The money and safety-critical rules apply only to projects with those traits.

## 4. Check

Work through each group. Its reference says what to look for, what counts as evidence for a pass, and the usual false alarms.

| Rules | Reference |
|-------|-----------|
| BE-01, DATA-03, API-06, SYS-01 to SYS-06: doing the right thing, and keeping data | [correctness.md](references/correctness.md) |
| REL-01, BE-02, PERF-01, PERF-05, PERF-06: outside calls, load and leaks | [performance-and-reliability.md](references/performance-and-reliability.md) |
| FE-01 to FE-09: screens and their data | [frontend.md](references/frontend.md) |
| ARC-01 to ARC-08: where code lives | [architecture.md](references/architecture.md) |
| CODE-01 to CODE-14: code people can change safely | [code-quality.md](references/code-quality.md) |
| TEST-01, TEST-04, TEST-07: tests | [testing.md](references/testing.md) |
| MONEY-01 to MONEY-12, SAFE-01 to SAFE-06: money and safety-critical data | [money-and-safety.md](references/money-and-safety.md) |

### The sweep for serious problems

A code review is not a security audit, but it never walks past a serious problem. As you read, watch for these even though their rules aren't in `rules.md`:

- a secret in the code;
- a query or command built by pasting in input;
- a record returned or changed without checking it belongs to the caller;
- outside content put into a page as HTML;
- personal data or a password written to a log;
- plain HTTP, or certificate checks switched off;
- a response that no longer matches the API contract;
- the client deciding a price or a permission.

Report each as a finding that cites the rule it breaks. The peer-ai MCP tool `standards_for_file` lists every rule for a file. Its severity is that rule's. In the summary, name the specialist review that should follow, such as security-review or contract-check.

### The bar for every line

- **A pass shows its evidence:** the file and line where the rule holds, such as "parcels.py:88 loads the list with one query joined to the customer". "Looks fine" isn't evidence.
- **A failure is a finding:** the harm in plain words, the file and line, what shows it's real, and a fix. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every unit, not a sample.** A rule about each function is checked on each function in scope.
- **The project's numbers.** Size and depth limits come from the stack profile through `standards_for_file`, not from habit.
- **Only what the code shows.** When the proof lives where you can't see it, the line is `not-checked` with that reason.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/code-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `code-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `code-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way. Don't skip this step, even when you're sure the report is right.

Then tell the person in a few lines: the result, each finding's severity and title, any specialist review the sweep calls for, and what wasn't checked and why. Offer to turn the findings into work items.
