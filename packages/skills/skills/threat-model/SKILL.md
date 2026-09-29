---
name: threat-model
description: Writes or updates a threat model (the ways in, what can go wrong through each, and what stops it, with evidence from the code). Use when starting a product, before a launch, or when a change adds a route, upload, webhook, sign-in or outside service.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: document
  peer-ai-domains: security privacy-compliance
  peer-ai-rules: MOB-01 MOB-03 MOB-04 REL-03 REL-04 REL-05 DEL-03 DEL-06 AI-01 AI-04 AI-05 MONEY-05 MONEY-08 MONEY-09 MONEY-12 SAFE-01
  peer-ai-templates: threat-model
  peer-ai-path: docs/threat-model.md
---

# Threat model

Answer four questions for the product, in writing: what are we working on, what can go wrong, what are we going to do about it, and did we do a good job. Every way in is listed from the code, every threat names what stops it, and "in place" is proven with a file and line.

`next_work`, `project_map`, `standards_for_file` and `check_document` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-document`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the whole product, or the ways in a change adds
- [ ] 2. Inventory: every way in, and what's worth protecting
- [ ] 3. Assumptions: the few answers that change the model most
- [ ] 4. Threats: what can go wrong through each way in
- [ ] 5. Defences: what stops each threat, with evidence
- [ ] 6. Write and check: accepted by the peer-ai MCP tool `check_document`
- [ ] 7. Hand over: what's missing, most serious first
```

## 1. Scope

- **The whole product:** call the peer-ai MCP tool `project_map`. If its `threat-model` item lists a file, that's the document to update; otherwise write to `docs/threat-model.md`. Read the requirements, the architecture and `peer-ai.config.json` first: they say what's worth protecting, where the product runs and which traits it has.
- **A change (SEC-25):** call the peer-ai MCP tool `next_work`, and find the ways in the branch adds (`git diff --name-only <base>...HEAD`). Add each to the existing threat model with its threats and defences. Keep everything else that's still true.
- **A product with no code yet:** work from the requirements and the architecture, and mark every defence `planned`.

## 2. Inventory

List every way in from the code, not from memory or the docs alone, and give each its file. [ways-in.md](references/ways-in.md) says where to look for each kind.

| Kind | For example |
|------|-------------|
| `route` | Each endpoint, and who can call it: anyone, a signed-in user, an admin |
| `input` | Each screen or form that takes input, and each link into an app |
| `upload` | Each place that accepts a file |
| `webhook` | Each call another service makes to the product, such as a payment provider's |
| `sign-in` | Each way to sign in or recover an account |
| `live` | Each live connection, such as a socket or a stream |
| `outside` | Each outside service the product calls, and what it sends |
| `model` | Each AI model call: what can reach its instructions, and what its output can do |
| `device` | What an app keeps on the phone or in the browser |
| `pipeline` | The build and deploy pipeline, its secrets, and the dependencies it pulls in |

Then list what's worth protecting: personal data, money, accounts, secrets, and the service staying up. Mark what's especially sensitive, such as health data, children's data, precise location or card details.

## 3. Assumptions

A threat model depends on a few facts the code can't show: who can reach the product (the internet, or only a private network), where it runs, who has admin access, and who the likely attackers are. Pick the three questions that would change the model most. Don't stop to wait for answers: write each as an assumption, with what changes if it's wrong, and ask the person when you hand over. Their answers update the model.

## 4. Threats

For each way in, ask what an attacker, or a mistake, could do through it. Walk the six kinds in [threats.md](references/threats.md): spoofing, tampering, repudiation, information disclosure, denial of service and elevation of privilege. Think about this product's own attackers too: a product with money attracts fraud, and one with health data attracts leaks.

- Each threat names its way in, what happens, and who is harmed.
- Its impact is critical, high, medium or low: critical when money, data or safety is lost for many people at once; high for one person's; medium when it takes other mistakes to matter; low for little harm.
- Skip threats that can't happen here, and say why in one line, so a reader knows they were considered.

## 5. Defences

For each threat, find what stops it. Call the peer-ai MCP tool `standards_for_file` for the way in's file: the rule that answers the threat usually comes back, such as SEC-01 for another user's record. [rules.md](references/rules.md) has the rules.

- **In place:** the file and line where the defence holds, such as "bookings.py:48 loads the booking with the caller's id". Read the code; a rule's name is not evidence.
- **Missing:** say what's missing and where. It becomes work to do.
- **Planned:** for a product with no code yet.
- **Accepted:** only when a person has decided to live with the risk. Write who, why, and until when. Never accept a risk yourself.
- **Not checked:** when the proof lives where you can't see it, such as a firewall rule or a provider's setting. Say where it would be.

## 6. Write and check

Copy the [template](assets/threat-model.md) and fill in every part. Keep it short enough to read: a table row per threat, not an essay.

You MUST finish with the check: a document Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `check_document` with the skill `threat-model` and the document's path. Fix what it names and call it again, until it says the document is ready. If the MCP tools aren't available to you, run `npx peer-ai check-document <path> --skill threat-model` instead.

## 7. Hand over

Tell the person, in a few lines:

- where the threat model is, and what changed;
- each missing defence, most serious first, with its rule, and an offer to turn them into work items;
- the assumptions and questions only they can settle;
- that the model changes whenever a way in is added (SEC-25), and a security review should follow for anything missing.
