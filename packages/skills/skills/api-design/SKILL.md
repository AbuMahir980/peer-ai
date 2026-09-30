---
name: api-design
description: Designs, documents or updates an API (who may call each endpoint, typed requests and responses, one error shape, paging, safe retries, changes that keep clients working). Use when an API is planned, changed or undocumented, contract or not.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: document
  peer-ai-domains: api-design
  peer-ai-rules: SEC-01 SEC-02 SEC-03 SEC-05 SEC-09 SEC-16 SEC-22 REL-03 SYS-01 MONEY-01 MONEY-08 MONEY-09
  peer-ai-templates: api-contract
  peer-ai-path: docs/api-contract.md
---

# API design

Design an API so every client can rely on it: who may call each endpoint, what goes in and comes out, how errors and lists look, what's safe to retry, and how it changes without breaking anyone. The contract, such as an OpenAPI file, is the one source of truth (API-02); this document records the design and the conventions around it.

`next_work`, `project_map`, `standards_for_file` and `check_document` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-document`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: the spec, the architecture, the contract and the code
- [ ] 2. Inventory: every endpoint, who calls it, and what it takes and returns
- [ ] 3. Conventions: errors, lists, paging, money, dates, retries and versions
- [ ] 4. Endpoints: each one designed, with who may call it
- [ ] 5. Write: this document, and the contract when it's written by hand
- [ ] 6. Check: accepted by the peer-ai MCP tool `check_document`
- [ ] 7. Hand over: changes, requests to other owners, and what to build
```

## 1. Sources

- **What the API is for:** the product spec or system design for the feature, and the requirements.
- **The contract:** call the peer-ai MCP tool `project_map`. Its `api-contract` item, and `apis` in `peer-ai.config.json`, say where the contract lives and which part provides the API. Find out whether it's written by hand or generated from the code.
- **The code,** for an API that exists: the routes and their schemas show what it really does, which may differ from the contract.
- **Where to save:** `docs/api-contract.md`, unless the project keeps it elsewhere.

An API provided by another repository is designed only as a request: write what this project needs from it, and mark it for that API's owners. Don't describe its insides.

## 2. Inventory

List every endpoint or message, from the code and the contract, with its file:

| Kind | For example |
|------|-------------|
| `endpoint` | Each route: method, path, and the handler's file |
| `caller` | Each client that calls it: an app, a partner, another service, or anyone, for a public endpoint |
| `schema` | Each request and response shape, and where it's defined |
| `webhook` | Each call another service makes to this API |

Compare the code with the contract both ways. A route in the code but not in the contract, or a field that differs, is a mismatch to fix: say which is right, and never change the contract to match a bug.

## 3. Conventions

Settle these once for the whole API, and write them down. Where the API has no convention yet, or breaks one, say so and propose one, marked proposed: a design records what should be, not only what is. [conventions.md](references/conventions.md) shows each done well.

- **Types** (API-01): every request and response is a typed schema.
- **Errors** (API-04): one shape for every error, with a code a client can act on. No internal detail (SEC-09).
- **Lists** (API-05, API-07, API-08): one shape, always paged, with page sizes set in one place.
- **Money and dates:** money as a whole number in the smallest unit, with its currency (MONEY-01); dates and times in one format, with a time zone.
- **Safe retries** (SYS-01, MONEY-08): anything that moves money or can't be repeated takes an idempotency key.
- **Changes** (API-06): add, migrate, then remove. Say how a client learns a field is going.
- **Who may call** (SEC-01 to SEC-03): the check is on the server, for each record; which websites may call it is a fixed list (SEC-16).
- **Nothing sensitive in a URL** (SEC-22), and limits on every endpoint (REL-03).

## 4. Endpoints

For each endpoint: what it does, who may call it and for which records, what it takes, what it returns, each error it can give, and whether a retry is safe. Webhooks say how the caller is verified before anything happens (MONEY-09).

## 5. Write

Copy the [template](assets/api-contract.md) and fill in every part. The rules are in [rules.md](references/rules.md).

- **A contract written by hand:** update it too, in the same change, so it stays the source of truth.
- **A contract generated from the code:** design here, and let the build generate it once the code is written. Say so under "Where the contract lives".
- **Say where each decision came from,** and mark each choice nobody has made yet as proposed. Don't stop to wait for answers: write what you recommend, put the question under Open questions, and ask the person when you hand over. Their answers update the design.

## 6. Check

You MUST finish with this step: a document Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `check_document` with the skill `api-design` and the document's path. Fix what it names and call it again, until it says the document is ready. If the MCP tools aren't available to you, run `npx peer-ai check-document <path> --skill api-design` instead.

## 7. Hand over

Tell the person, in a few lines: where the design is, what changed in the contract, each mismatch between the code and the contract, any request to another API's owners, and each proposed choice waiting for them.
