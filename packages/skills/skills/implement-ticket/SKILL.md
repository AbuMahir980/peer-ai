---
name: implement-ticket
description: Builds a work item from start to ship (tests from its acceptance criteria first, the smallest change that meets them, a proven verify and the reviews it needs). Use when a work item, a ticket or a small feature is ready to build.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: work
  peer-ai-domains: testing
  peer-ai-rules: REQ-02 REQ-04 CODE-15 DEL-04
---

# Implement a ticket

Take one work item from where it stands to ready to ship: every acceptance criterion proven by a test, the smallest change that makes them pass, a verify Peer AI ran itself, and every review the change needs, recorded. The item's plan is the brief: its goal, acceptance criteria and sources (RFC 0005).

`next_work`, `create_work_item`, `update_work_item`, `advance_work_item`, `standards_for_file`, `run_verify` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that runs in a shell is `npx peer-ai check`.

Copy this checklist and tick it off as you go:

```
- [ ] 1. The item: its plan, what it waits for, and build before any code changes
- [ ] 2. Read: its sources, the code it touches, and the standards for each file
- [ ] 3. Tests first: one or more for every acceptance criterion
- [ ] 4. Build: the smallest change that passes them, in scope
- [ ] 5. Verify: run_verify until it passes
- [ ] 6. Review: every review the item needs, recorded, findings fixed
- [ ] 7. Ship: advance to ship, or say exactly what holds it back
```

## 1. The item

- **Find it:** call the peer-ai MCP tool `next_work`. The item for the current branch is `current`; the person may name another. If the work has no item, create one with the peer-ai MCP tool `create_work_item`, with a goal and acceptance criteria written from the request, and say which criteria you wrote.
- **Its plan:** the goal, the acceptance criteria and the sources. When the item has no criteria, write them from its sources before building, add them with the peer-ai MCP tool `update_work_item`, and tell the person.
- **What it waits for:** `waiting` in `next_work` lists items it depends on that haven't shipped. It can be built now, but it can't ship before them. Say so at the start, and don't build the other items as well unless the person asks.
- **Move to build** with the peer-ai MCP tool `advance_work_item` before changing any code.

Record where you are with `update_work_item` at each step, so another session can pick up exactly there.

## 2. Read

- **The sources:** the spec, design or requirement the item names. Where they and the criteria disagree, the criteria win; ask about the difference at hand-over.
- **The code it touches,** and the tests around it. Follow how the code already does things.
- **The standards:** call the peer-ai MCP tool `standards_for_file` for every file you'll change or add. Follow what it returns, including the stack profile's numbers.

## 3. Tests first

Write the tests before the code, and watch them fail. [tests.md](references/tests.md) shows tests written from criteria.

- **Every criterion gets a test,** named so a reader can match it to the criterion. Keep a list: criterion, then the test that proves it.
- **The edges** (CODE-15): zero, empty, the largest value, time zones, ties.
- **Abuse** (TEST-08), where the change handles sign-in, permissions, money, uploads or input that reaches a database: another person's id, bad input, a repeat.
- **Never weaken an existing test** to make the change pass. A test that's wrong is a finding to raise, not to edit quietly.

## 4. Build

- **The smallest change that passes the tests,** following the architecture and the standards.
- **In scope** (REQ-04): an idea beyond the item becomes a new work item, created with `create_work_item`, not part of this change.
- **Keep it working:** existing behaviour and existing callers keep working, unless the item says otherwise.
- **Update what describes it,** such as the README or the API contract, in the same change.

## 5. Verify

Call the peer-ai MCP tool `run_verify`. It runs the project's own checks and records the result; never report a result yourself. Fix what fails and run it again, until it passes.

## 6. Review

Move the item to verify with `advance_work_item`: Peer AI works out the reviews the change needs from what it touched. `next_work` then lists them. For each, use its skill, such as `peer-ai-code-review`, and record the review with the peer-ai MCP tool `record_review`. Fix every finding at or above the project's blocking level, verify again, and review again, until each passes.

## 7. Ship

You MUST finish with this step. Call `advance_work_item` to move the item to ship. It checks the same gates as CI: a passing verify, the reviews, and the items it depends on. When it refuses, fix what it names, or, when it's waiting on another item, leave the item at verify and say so. Then run `npx peer-ai check`.

Tell the person, in a few lines: what changed, each acceptance criterion with the test that proves it, the reviews and their results, anything left for the backlog, and the stage the item reached.
