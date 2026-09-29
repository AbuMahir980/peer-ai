---
name: data-modelling
description: Writes or updates the data model (each entity and field, what the database guarantees, personal and sensitive data, how long it is kept, and changes that lose nothing). Use when designing storage, adding fields or tables, or before a migration.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: document
  peer-ai-domains: data
  peer-ai-rules: ARC-02 ARC-08 SYS-04 SYS-05 PERF-01 PRIV-03 PRIV-06 REL-08 MONEY-01 MONEY-02 MONEY-06 MONEY-12 SAFE-02 SAFE-03
  peer-ai-templates: data-model
  peer-ai-path: docs/data-model.md
---

# Data modelling

Write down what the product stores: each entity and field, who owns it, what the database itself guarantees, which data is personal or sensitive, how long it's kept, and how each change keeps what's already there. Migrations stay the one source of the database's structure (DATA-01); this document says what they mean and why.

`next_work`, `project_map`, `standards_for_file` and `check_document` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-document`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: the requirements, the architecture, and the migrations or schema
- [ ] 2. Inventory: every store, entity and field, from the code
- [ ] 3. Guarantees: what the database enforces, and what it should
- [ ] 4. Sensitive data: every personal or sensitive field, why it's kept, and for how long
- [ ] 5. Write: the template filled in, with each change's migration
- [ ] 6. Check: accepted by the peer-ai MCP tool `check_document`
- [ ] 7. Hand over: problems found, and migrations to write
```

## 1. Sources

- **What must be stored:** the requirements and the feature's spec or system design.
- **What exists:** call the peer-ai MCP tool `project_map`. Its `data-model` item lists the migrations, schema files or on-device database, and any data model document to update. Its signals list the personal-data fields it found. The architecture says which part owns which data.
- **The code:** migrations, schema files and models, read in order. The migrations are the truth; a model that disagrees with them is a finding.
- **Where to save:** `docs/data-model.md`, unless the project keeps it elsewhere.

## 2. Inventory

List every store, entity and field, from the code, with its file:

| Kind | For example |
|------|-------------|
| `store` | Each database, file store, cache or on-device database, and the part that owns it |
| `entity` | Each table, collection or record type |
| `field` | Each field: its type, whether it's required, and whether it's personal, sensitive, money or safety-critical |
| `relationship` | Each link between entities, and what happens to one when the other is deleted |
| `migration` | Each migration, in order, and what it changed |

Read every migration, not only the latest schema: a column dropped or renamed on the way can mean data was lost (DATA-03).

## 3. Guarantees

For each rule the data must keep, say whether the database enforces it (SYS-05): unique values, required fields, links that must exist, allowed values and amounts that can't be negative. A rule only the code checks is weaker, and two people at once can break it (SYS-04). [modelling.md](references/modelling.md) shows each done well.

Hold the fields to the rules in [rules.md](references/rules.md):

- **Money** as a whole number in the smallest unit, with one authoritative field for each amount and its direction as a type (MONEY-01, MONEY-02, MONEY-06). Full card numbers and security codes are never stored (MONEY-12): that's critical on sight.
- **Safety-critical data** as structured values, with "present", "may be present" and "absent" kept apart (SAFE-02, SAFE-03).
- **Reads the product needs** have their index, and no screen needs one query per row (PERF-01).

## 4. Sensitive data

For each personal or sensitive field: why the product needs it (PRIV-03), who can see it, where it's sent, and how long it's kept before it's deleted (PRIV-06). Deleting a record deletes its files too (DATA-04). Data on a device that holds the only copy is protected (REL-08). This list is the data inventory privacy reviews check against.

## 5. Write

Copy the [template](assets/data-model.md) and fill in every part.

- **Describe what is,** from the migrations, and mark each problem the code shows, such as card data stored or a migration that lost data, under Problems, most serious first. Never describe a problem as the intended design.
- **Changes:** for each field or table to add or change, write the migration's steps and how existing data is kept: add, copy, switch, then remove (DATA-03). A model change ships with its migration (DATA-02).
- **Say where each fact came from,** and mark each choice nobody has made as proposed.

## 6. Check

You MUST finish with this step: a document Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `check_document` with the skill `data-modelling` and the document's path. Fix what it names and call it again, until it says the document is ready. If the MCP tools aren't available to you, run `npx peer-ai check-document <path> --skill data-modelling` instead.

## 7. Hand over

Tell the person, in a few lines: where the data model is, each problem found with the most serious first, the migrations to write, and the retention decisions waiting for them.
