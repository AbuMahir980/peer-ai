---
name: system-design
description: Designs how a feature is built across the system (the flow, data changes, API changes, what happens when two people act at once or a call fails, and the tests that prove it). Use after a product spec, before building, or for a risky change.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: document
  peer-ai-domains: system-design api-design data
  peer-ai-rules: ARC-02 ARC-06 SEC-01 SEC-03 REL-01 REL-08 PERF-01 MONEY-08 MONEY-09 TEST-08 CODE-15
  peer-ai-templates: system-design
  peer-ai-path: docs/specs/<feature>-design.md
---

# System design

Decide how one feature is built across the system before anyone writes it: which parts change, what calls what, how the data and the API change, and what happens when two people act at once, when something is done twice, or when a call fails. The design follows the architecture and meets the product spec; the tests it lists prove it works.

`next_work`, `project_map`, `standards_for_file` and `check_document` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-document`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: the spec, the architecture, the contract, the data model and the code
- [ ] 2. Inventory: every part, route, table, job and outside call the feature touches
- [ ] 3. Flow: each journey, step by step, through the system
- [ ] 4. Hard cases: two at once, done twice, failed calls, lost data
- [ ] 5. Write: the template filled in, each applicable rule answered
- [ ] 6. Check: accepted by the peer-ai MCP tool `check_document`
- [ ] 7. Hand over: decisions, contract and data changes, and what to build first
```

## 1. Sources

- **The product spec** for the feature, and its acceptance criteria. The design must meet every one; where it can't, say so.
- **The architecture:** call the peer-ai MCP tool `project_map`. The design keeps to its parts, owners and dependency rules. A design that needs to break one proposes a decision record instead of breaking it quietly.
- **The API contract and the data model,** and the code the feature touches. Call the peer-ai MCP tool `standards_for_file` for those files: it returns the rules and the stack profile's numbers.
- **Where to save it:** beside the spec, as `docs/specs/<feature>-design.md`.

## 2. Inventory

List everything the feature touches, from the code, with its file:

| Kind | For example |
|------|-------------|
| `part` | Each part and module that changes, and the one that owns the feature's data (ARC-02) |
| `route` | Each endpoint or message added or changed |
| `data` | Each table, field, file or device store added or changed |
| `job` | Each background or scheduled job |
| `outside` | Each call to another service |
| `client` | Each app or screen that uses what changes |

A part in another repository is designed only as far as what this feature needs from it: write the contract change it needs, and mark it as a request to that part's owners.

## 3. Flow

For each journey in the spec, write what happens in order: who calls what, where the permission is checked (on the server, for that record: SEC-01, SEC-03), what's read, what's written, and what's returned. A numbered list is enough; a sequence diagram helps when several parts take turns.

## 4. Hard cases

These decide whether the feature holds up. [hard-cases.md](references/hard-cases.md) shows each done well.

- **Two at once** (SYS-03, SYS-04, SYS-05): what if two people, or two devices, do this to the same record together? Say what's locked or which database guarantee stops it.
- **Done twice** (SYS-01, MONEY-08): a retried request, a double tap, a job run again. Say how the second has no effect.
- **A call fails or hangs** (REL-01): each outside call's timeout, and what the person sees.
- **Nothing lost** (DATA-03, REL-08): each change to stored data keeps what's there, and a migration moves it.
- **Clients keep working** (API-06): a field changes by adding, migrating, then removing.
- **Edges** (CODE-15): time zones, empty and huge input, the first and last item, zero.
- **Slow paths** (PERF-01, API-07, SYS-02): no query per row, every list paged, slow work moved off the request.

## 5. Write

Copy the [template](assets/system-design.md) and fill in every part. For each rule in [rules.md](references/rules.md) the feature touches, say how the design meets it; a reviewer will check the code against the same rules.

- **Name what changes:** files, tables, fields and routes, not "the backend".
- **Decisions with their reasons.** Where there's a real choice, give the options and pick one. A choice that changes the architecture becomes a proposed decision record for a person to decide.
- **Tests that prove it** (TEST-08, SYS-06): name the tests for the hard cases, attacks included.
- **No code.** Signatures and schemas where they help; the building comes next.

## 6. Check

You MUST finish with this step: a document Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `check_document` with the skill `system-design` and the design's path. Fix what it names and call it again, until it says the document is ready. If the MCP tools aren't available to you, run `npx peer-ai check-document <path> --skill system-design` instead.

## 7. Hand over

Tell the person, in a few lines: where the design is; each decision waiting for them; the contract and data model changes, and any request to another part's owners; and the order to build it in.
