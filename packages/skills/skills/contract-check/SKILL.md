---
name: contract-check
description: Checks that an API does what its contract says (every route, field, type, status code, error, sign-in rule and page) and that clients use the contract, proving each rule was checked. Use when an API or its contract changes.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-domains: api-design
  peer-ai-rules: SEC-02 SEC-09 PRIV-03 MONEY-12
---

# Contract check

Compare what the API really does with what its contract promises, route by route and field by field, and check it against every rule in [rules.md](references/rules.md). Record a report that proves what was checked. The contract is the one source of truth (API-02): where the code and the contract disagree, one of them is wrong, and the report says which. Don't fix anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the work item's API changes, or the whole API
- [ ] 2. Inventory: every route in the contract, and every route in the code
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: each route both ways, and every rule
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Check the routes and schemas its branch changed (`git diff --name-only <base>...HEAD`), in the code and in the contract, and every client that calls them.
- **The whole API:** `apis` in `peer-ai.config.json` names each API, the part that provides it, and where its contract lives. Check every route of each API this repository provides.

An API provided by another repository can only be checked from its clients here: check that they use the contract, and mark the provider's side `not-checked`.

List the contract in the report's `inputs`. With no contract at all, that's a finding under API-02, and the rest of the check describes what the code does, for a contract to be written from.

## 2. Inventory

List every route twice: once from the contract and once from the code. Give each an id, a kind and its file and line:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `route` | `route:POST /bookings` | Each route, with its contract entry and its handler |
| `schema` | `schema:Booking` | Each request and response shape, in the contract and in the code |
| `client` | `client:web-bookings` | Each client that calls the API, and where it gets its types |

A route in the code but not in the contract, or in the contract but not the code, is a finding.

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the handlers in scope. It returns the rules that apply.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here. The line says why.

## 4. Check

For each route, compare both ways. [comparing.md](references/comparing.md) lists what to compare and how to judge which side is wrong.

Hold every line to this bar:

- **A pass shows its evidence:** the contract entry and the handler that match, such as "openapi.yaml `POST /bookings` returns `Booking`; bookings.ts:41 returns the same fields, in the same case".
- **A mismatch is a finding:** what a client would get wrong, the file and line on both sides, and which side to change. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every route, every field.** A field named differently, such as camelCase against snake_case, is a mismatch.
- **More than the contract is a mismatch too,** and a serious one when it's personal data or card details the contract never promised.
- **Only what the code shows.** When the proof needs the running API, the line is `not-checked` with that reason.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/contract-check-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `contract-check`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `contract-check`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: the result, each mismatch and which side should change, and what wasn't checked and why. Offer to turn the findings into work items.
