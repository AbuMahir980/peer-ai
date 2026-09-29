---
name: product-spec
description: Writes a feature's product spec before it's built (who can do what, each journey and screen with its states, acceptance criteria and edge cases). Use when a feature or work item needs a spec, or a design must become buildable detail.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: document
  peer-ai-domains: requirements
  peer-ai-rules: FE-07 FE-08 FE-09 DES-07 DES-08 DES-09 DES-10 DES-12 SEC-01 SEC-02 PRIV-03 CODE-15
  peer-ai-templates: product-spec
  peer-ai-path: docs/specs/<feature>.md
---

# Product spec

Say exactly what one feature does for the people who use it, so it can be built and tested without guessing: who can do what, each journey step by step, each screen in every state, and the acceptance criteria and edge cases that prove it works. How the system does it belongs to the system design, which comes next.

`next_work`, `project_map`, `standards_for_file` and `check_document` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-document`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: the work item, the requirements, the design, and the code around it
- [ ] 2. Inventory: every role, journey, screen and piece of data
- [ ] 3. Questions: the behaviour only a person can decide, asked together
- [ ] 4. Write: the template filled in, with every state and edge case
- [ ] 5. Check: accepted by the peer-ai MCP tool `check_document`
- [ ] 6. Hand over: what's open, and what comes next
```

## 1. Sources

- **The work item:** call the peer-ai MCP tool `next_work`. The feature, and anything already agreed, is there.
- **The requirements:** the feature's acceptance criteria and the needs around it. The spec must meet them; where it can't, say so.
- **The design,** if there is one: `design` in `peer-ai.config.json` says where. When it's marked authoritative, the spec follows it exactly and invents no layout of its own.
- **What exists:** call the peer-ai MCP tool `project_map` for existing specs and the architecture. Read the code for the area the feature touches: the spec builds on what's there.
- **Where to save it:** `docs/specs/<feature>.md`, such as `docs/specs/move-a-booking.md`, unless the project keeps its specs somewhere else.

## 2. Inventory

List before writing:

| Kind | For example |
|------|-------------|
| `role` | Each kind of person who uses the feature or is affected by it, and whether they're signed in |
| `journey` | Each path through the feature, from start to finish, including the ones that go wrong |
| `screen` | Each screen, dialog or message the feature adds or changes |
| `data` | Everything the feature shows, collects or changes, and where it comes from |
| `outside` | Anything outside the product it depends on, such as a payment or a message |

## 3. Questions

A spec is where product decisions get made: what happens when a person changes their mind, when two people act at once, or when something outside fails. Where the requirements don't say, ask the person, all at once, and wait if they're there. What stays unanswered goes under Open questions; where building can't wait, write the behaviour you recommend and mark it **proposed**.

## 4. Write

Copy the [template](assets/product-spec.md) and fill in every part. [writing.md](references/writing.md) shows each part done well. The rules are in [rules.md](references/rules.md).

- **Permissions per role and per record** (SEC-01, SEC-02): not "users can edit bookings" but "a cyclist can move their own booking; a mechanic can move any booking at their shop".
- **Every screen in every state** (FE-07, FE-08, FE-09): loading, empty, error with what to do next, and offline where the product works offline.
- **Acceptance criteria for every journey,** the ones that go wrong included: given a situation, when something happens, then a result anyone can see.
- **Edge cases** (CODE-15): midnight and time zones, daylight saving, empty and very long input, two people at once, the first and the last item, zero.
- **Only the data it needs** (PRIV-03): each personal field says why the feature needs it.
- **Usable by everyone:** keyboard, labels, colour never the only signal, and an alternative to dragging (DES-07 to DES-10, DES-12).
- **What, not how.** No tables, endpoints or code: those belong to the system design.
- **Say where each decision came from:** the requirements, the design, a person, or proposed by you.

## 5. Check

You MUST finish with this step: a document Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `check_document` with the skill `product-spec` and the spec's path. Fix what it names and call it again, until it says the document is ready. If the MCP tools aren't available to you, run `npx peer-ai check-document <path> --skill product-spec` instead.

## 6. Hand over

Tell the person, in a few lines: where the spec is, each proposed behaviour waiting for their decision, and the open questions. The usual next step is the system design, then building it.
