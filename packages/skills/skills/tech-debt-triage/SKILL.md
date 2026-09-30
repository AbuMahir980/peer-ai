---
name: tech-debt-triage
description: Finds a codebase's technical debt and ranks it by what it costs and risks against what fixing takes, raising anything hurting people now as a fix first, and plans the top items as work. Use when planning a clean-up, or when changes have slowed.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: work
  peer-ai-domains: code-quality architecture
---

# Tech debt triage

Find what makes this codebase slow or risky to change, decide what's worth paying off first, and plan it as work. Debt is what costs a little every day: code people work around, duplicates that drift, tests that don't cover what changes, versions left behind. A problem hurting people now isn't debt. It's a fix, and it goes first.

`next_work`, `project_map`, `create_work_item` and `standards_for_file` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that runs in a shell is `npx peer-ai check`.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: the map, open findings and work, the code, and its history
- [ ] 2. Inventory: every area checked, and each piece of debt with where it is and what it costs
- [ ] 3. Separate: anything hurting people now, raised as a fix first
- [ ] 4. Rank: by cost and risk against what fixing takes
- [ ] 5. Plan: work items for the top of the list, a register for the rest
- [ ] 6. Check and hand over
```

## 1. Sources

- **The map:** call the peer-ai MCP tool `project_map`. Its gaps, such as missing tests or no CI, are often debt.
- **What's already known:** open findings in review reports under `.peer-ai/reports/`, and open work items from the peer-ai MCP tool `next_work`. Don't list anything twice.
- **The code:** read it, older parts included.
- **The history:** the files that change most, and where fixes cluster, from the change history, such as `git log`. Debt that sits where work happens costs more than debt nobody touches.
- **The intent:** the architecture and the standards. Code that doesn't follow them is debt when it slows work down.

Don't change any code. This is triage: the output is a plan.

## 2. Inventory

Go through every area in [finding.md](references/finding.md), in order: the code, the tests and checks, what it's built on, the data, secrets and settings, and how it's built and run. Run each check it lists, and record what each found, one line per check, even when that's nothing. The register lists every check, so a skipped one shows.

For each piece of debt, note:

- **What and where:** the files and lines, and the rule it breaks, if any, such as CODE-04 or ARC-02.
- **What it costs now:** changes it slows, bugs it has caused, the work people do around it.
- **What it risks:** what could go wrong because of it, and to whom.
- **What fixing takes:** how big, how risky, and what has to happen first.

## 3. Separate

Anything hurting people now, or waiting to, isn't debt to schedule: a security hole, data that can be lost or exposed, money worked out wrongly, a broken journey. Raise each as a fix to make first: a `bug` work item, created with the peer-ai MCP tool `create_work_item`, at the top of the hand-over.

## 4. Rank

Rank the debt by what it costs and risks, against what fixing it takes. Put first what's costly and risky, and where work is happening now: debt that most changes pass through costs every day. Something that costs nothing yet ranks on its risk alone. Group items one change pays off together. Easy isn't a reason to go first; cheap and valuable is.

Give each item a one-line reason for its place, so a person can disagree with the order and not only the list.

## 5. Plan

- **The top of the list:** each becomes a work item with the peer-ai MCP tool `create_work_item`: a goal, acceptance criteria a reviewer could check, its sources, and the items it depends on. Slice big debt so each item ships on its own, such as one screen moved to the newer code at a time.
- **The rest:** keep a register at `docs/tech-debt.md`, or update the project's own: each check with what it found, then each item with what it is, where, its cost, risk and size, and the date it was found. Keep what people wrote in it before.

Don't stop to wait for answers. Put each question in the hand-over, with who can answer it.

## 6. Check and hand over

Run `npx peer-ai check`, and fix what it names in the work items you created.

Then tell the person, in a few lines: the fixes to make now, the top of the debt list and why, the work items created, and where the register is.
