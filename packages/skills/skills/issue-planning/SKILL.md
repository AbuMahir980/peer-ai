---
name: issue-planning
description: Plans a feature, a spec or the project's gaps as small work items, each with its goal, acceptance criteria, sources and dependencies, in the order they can ship. Use when a spec or design is ready to build, or work needs breaking down.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: work
  peer-ai-domains: requirements
---

# Issue planning

Turn a spec, a design, the requirements or the project's gaps into work items that can each be built, reviewed and shipped on their own. Each item carries its plan (RFC 0005): what done means, the acceptance criteria that prove it, the sources it implements, and the items it depends on. The agent that builds an item works from the item, without hunting for the spec.

`next_work`, `project_map`, `create_work_item` and `update_work_item` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that runs in a shell is `npx peer-ai check`.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: what to plan from, and the work already open
- [ ] 2. Slices: small pieces that each ship on their own
- [ ] 3. Plans: a goal, criteria, sources and dependencies for each
- [ ] 4. Create: each item through the peer-ai MCP tools, none twice
- [ ] 5. Check: next_work shows the order, and peer-ai check passes
- [ ] 6. Hand over: the order, what's waiting on whom, and questions
```

## 1. Sources

- **What to plan:** the spec or design the person names, such as `docs/specs/<feature>.md` and its system design, or the requirements. Read all of it: the acceptance criteria come from here.
- **The gaps:** when the person asks to plan what the project still needs, call the peer-ai MCP tool `next_work`. With nothing open, it lists the gaps for the stage and the skill that fills each.
- **What's already open:** `next_work` lists every open work item. Read them first, so nothing is planned twice.
- **The parts:** call the peer-ai MCP tool `project_map`, and read `tracks` in `peer-ai.config.json`. Each item names the part it changes. The architecture says where new code goes, such as which module owns the data it changes: say so in the items it affects.
- **The code each slice touches.** Read it before slicing. It shows prerequisites the spec doesn't mention: a change to stored data, such as a migration; a contract change; or existing code that breaks a criterion, such as a slot check that ignores the shop's closing days. Each becomes its own item, or a criterion of the slice that needs it.

With no spec, plan from the request and the requirements, mark inferred criteria as proposed, and suggest a spec at hand-over.

## 2. Slices

Split the work into slices a person could review in one sitting, as one pull request. [slicing.md](references/slicing.md) shows slicing done well.

- **Through the layers, not by layer.** "Move a booking to another day" is a slice; "the database part" isn't. A slice that has to be split by part, such as an API in another repository, splits there and records the dependency.
- **Each ships on its own** and leaves the product working: a half-built feature stays behind a switch, or isn't shown yet.
- **Prerequisites are their own items:** a migration, a contract change, or a request to another repository's owners.
- **Out of scope stays out.** An idea the spec lists as out of scope, or one nobody agreed, isn't planned (REQ-04). Mention it at hand-over for the backlog.
- **Small, but not tiny.** A slice with no acceptance criterion of its own is part of another slice.

## 3. Plans

For each slice:

- **Title:** what it delivers, in words the people using the product would use.
- **Kind and track:** feature, bug, refactor, migration or chore, and the part it changes.
- **Goal:** what done means, in a sentence or two.
- **Acceptance criteria** (REQ-02): copied from the spec where it has them, word for word, and written the same way where it doesn't: given a situation, when something happens, then a result anyone can see. Include the ones that go wrong.
- **Sources:** the spec, design or requirement it implements, with the section, such as `docs/specs/move-a-booking.md#edge-cases`.
- **Depends on:** only the items that must ship first, such as the migration before the screen that reads it. Not items that merely come earlier.
- **Next:** the first action, in one line.

## 4. Create

Call the peer-ai MCP tool `create_work_item` for each new item, in dependency order, so each item's dependencies exist when it's created. Give the id the project's tracker uses when there is one. For an open item that already covers a slice, call the peer-ai MCP tool `update_work_item` with the plan instead of creating another.

**A tracker.** When `tracker.kind` in `peer-ai.config.json` is `github`, `gitlab`, `linear` or `jira`, offer to create a matching issue for each item, and use each issue's key as the item's id. Never create them without the person agreeing: that publishes the plan.

## 5. Check

You MUST finish with this step. Call the peer-ai MCP tool `next_work`: each new item must be listed, and `waiting` must show the order you meant. Then run `npx peer-ai check`: it fails on a dependency that doesn't exist, or items that wait on each other in a loop. Fix what it names and check again, until it passes.

## 6. Hand over

Tell the person, in a few lines: the items in the order they can ship, what each is waiting for, the first one to build, any ideas left for the backlog, and any question the spec didn't answer.
