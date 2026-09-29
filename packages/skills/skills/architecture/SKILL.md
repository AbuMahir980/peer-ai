---
name: architecture
description: Writes or updates the architecture (parts, what each owns, how they depend on each other, where data lives) and records each decision with its options. Use when starting a product, when the code has outgrown the document, or before a big change.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: document
  peer-ai-domains: architecture system-design
  peer-ai-rules: REQ-03 API-02 DATA-01 DEL-06
  peer-ai-templates: architecture decision
  peer-ai-path: docs/architecture.md
---

# Architecture

Write down how the product is built: its parts, what each owns, how they depend on each other and where data lives. Code review judges every change against this document (ARC-01), so each rule in it must be concrete enough to check. Every significant choice gets a decision record, with the options that were weighed.

`next_work`, `project_map`, `standards_for_file` and `check_document` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-document`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: the needs, what the project has, and the code
- [ ] 2. Inventory: every part, what it depends on, and where data lives
- [ ] 3. Decisions: options and trade-offs for each open choice, decided by a person
- [ ] 4. Write: the template filled in, concrete enough to check code against
- [ ] 5. Check: accepted by the peer-ai MCP tool `check_document`, for each document
- [ ] 6. Hand over: what's decided, what's proposed, and what the code breaks
```

## 1. Sources

- **The needs:** the requirements, especially REQ-03's: who uses the product, how many people and how much data, where it operates and which laws apply, and how available it must be. They decide the architecture. Where they're missing, say so and ask; don't design for needs nobody stated.
- **What the project has:** call the peer-ai MCP tool `project_map`. If its `architecture` item lists files, they're the documents to update, decision records included. Otherwise write to `docs/architecture.md`, and decision records to `docs/decisions/`. `peer-ai.config.json` lists the parts (`tracks`), the APIs between them and the stage.
- **The code,** when the product exists: it shows what the architecture is, which may not be what the document says.

## 2. Inventory

List what the code shows, with the file or folder for each. [reading-the-code.md](references/reading-the-code.md) says where to look.

| Kind | For example |
|------|-------------|
| `part` | Each app, service, library or job, and what it owns: its area of the business and its data |
| `dependency` | Each part or module that calls or imports another, and the direction |
| `data` | Each store: a database, files, a cache, the device. Which part owns it, and the one way code reaches it |
| `contract` | Each agreed interface between parts: an API contract, events, a shared library |
| `outside` | Each outside service: payments, email, maps, AI models, analytics |
| `runs-on` | Where each part runs, and how changes reach it |

Mark each **stated**, when a document or a person says it, or **inferred**, from the code. Compare the code with the existing document both ways: a part or a dependency the document doesn't mention gets added as inferred; a rule the code breaks stays a rule, and the break is reported under Risks. Never change a rule to match the code without a person's say.

## 3. Decisions

A decision is significant when it's costly to reverse: how the product splits into parts, where data lives, which kind of database, how parts talk, where it runs, and anything a law or a need forces. For each one still open:

- write two or three real options, with what each costs and gives against the needs;
- recommend one, and say why;
- ask the person to decide. Until they do, the decision record's status is **proposed**. Never mark a decision accepted yourself.

For decisions the code has already made but nobody recorded, write a decision record with status **accepted**, from the code, and say it was inferred. [decisions.md](references/decisions.md) shows a good record.

## 4. Write

Copy the [architecture template](assets/architecture.md) for the main document, and the [decision template](assets/decision.md) for each record, numbered in order, such as `docs/decisions/0003-payments-provider.md`. The rules are in [rules.md](references/rules.md).

Hold every part to this bar:

- **Checkable rules.** "The shop screens reach the API only through the contract in `api/contract.yaml`" can be checked; "clean separation" can't. Name folders, files and directions.
- **Say what depends on what,** and the direction it may never go (ARC-06): features don't depend on each other, and business rules depend on nothing.
- **One owner for each area and each store** (ARC-02, ARC-08), and one source of truth for each contract (API-02) and for the database's structure (DATA-01).
- **Tie choices to needs.** Each part of the design that exists because of a need, such as a law or a scale, says which.
- **When updating, keep every rule and decision the document already states,** even where the code breaks it; the break goes under Risks. Change or drop one only when a person asks you to, and say under Sources what changed and why.
- **Say where each statement came from:** a document, a person, or the code.
- **No invented facts.** Hosting, vendors and scale that nobody decided are options or questions, never settled.

## 5. Check

You MUST finish with this step: a document Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `check_document` with the skill `architecture` and the main document's path. For each decision record, call it with the template `decision` too. Fix what it names and call it again, until each is ready. If the MCP tools aren't available to you, run `npx peer-ai check-document <path> --skill architecture`, adding `--template decision` for a decision record.

## 6. Hand over

Tell the person, in a few lines:

- where the architecture is, and what changed;
- each proposed decision waiting for them, with your recommendation;
- each place the code breaks the architecture, as work to do;
- what the usual next steps are: the API design, the data model and a threat model.
