---
name: qa-acceptance
description: Checks a built work item against its acceptance criteria as a tester would (each met in the code and proven by a test that can fail, its edges and refusals, nothing extra built), proving each was checked. Use when an item is built, before it ships.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-rules: REQ-02 REQ-04 REQ-05 TEST-01 TEST-02 TEST-03 TEST-04 TEST-08 TEST-09 TEST-12 CODE-15
---

# QA acceptance

Check a built work item the way a tester would, before it ships: every acceptance criterion holds in the code, at its edges too, and is proven by a test that would fail if it didn't; and nothing was built that the item didn't ask for. Record a report that proves what was checked. The report is the output: don't fix anything during the check.

`next_work`, `run_verify`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. The item: its criteria, its sources, what changed, and the verify result
- [ ] 2. Inventory: every criterion, the code that meets it, the tests that claim it, and anything extra
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: each criterion in the code and in its tests, at its edges, and the scope
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review`
```

## 1. The item

- **Find it:** call the peer-ai MCP tool `next_work`. The item is the one the person names, or the current branch's.
- **Its plan:** read its goal, every acceptance criterion word for word, and its sources, such as the spec or the requirements. With no criteria, the item can't be accepted: that's a finding (REQ-02), and the check goes on against its sources, saying so.
- **What changed:** the files its branch changed (`git diff --name-only <base>...HEAD`). With no branch, find the code from the criteria's own words and the item's sources.
- **The verify result:** call the peer-ai MCP tool `run_verify`, so you know which tests pass. A failing verify is a finding of its own. A passing one proves only what the tests check, which is what step 4 finds out.

## 2. Inventory

List from the item and the code, with an id, a kind and where it is:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `criterion` | `criterion:SB-7-2` | Each acceptance criterion, numbered as the item lists it |
| `code` | `code:slots.ts:12` | The code that makes each criterion true |
| `test` | `test:slots.test.ts:40` | Each test that claims a criterion, and what it really asserts |
| `extra` | `extra:slots.ts:30` | Anything the change does that no criterion or source asks for |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the files the item changed. Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here, and the line says why, such as TEST-01 for an item that isn't a bug fix.

## 4. Check

[checking.md](references/checking.md) says how to check a criterion, its edges and its tests.

Hold every line to this bar:

- **Every criterion gets its own coverage line,** under REQ-05, with the `criterion` as its item. A pass names the code and the test: "slots.ts:12 refuses a full slot; slots.test.ts:40 books a full slot and expects the refusal".
- **A criterion the code doesn't meet is a finding under REQ-05,** saying which "then" fails and for which values, with the file and line. Any criterion that doesn't hold fails the review, whatever its finding's severity. The item can't ship until it's fixed, or the criterion is changed or dropped by whoever agreed it, through `update_work_item` with the new `acceptance`, the `reason` and who decided it (`by`), and then checked again.
- **A criterion no test proves, or a test that would pass even if the code were wrong, is a finding under the testing rule it breaks,** such as TEST-02 or TEST-09.
- **Follow the criterion's own values through the code,** and then its edges. Never accept a criterion because a test with its name passes.
- **Where a criterion protects something another rule covers,** such as whose data a person may change, cite that rule too.
- **Its severity is its rule's,** from [severity.md](references/severity.md).

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/qa-acceptance-<time>.json`. Its `skill` is `qa-acceptance`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `qa-acceptance`, the report's path, and the work item's id. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: whether the item can ship, each criterion that doesn't hold and why, each finding's severity and title, and anything built that nobody asked for. Offer to turn the findings into work on the item.
