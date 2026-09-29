---
name: compliance-review
description: Reviews how a product handles personal data and card payments (what is collected, where it goes, consent, logs, retention, card details) against Peer AI's privacy rules, proving each was checked. Use when reviewing data protection or payments.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-domains: privacy-compliance
  peer-ai-rules: MONEY-12 SEC-15 SEC-22 AI-03 MOB-02 MOB-05
---

# Compliance review

Follow every piece of personal data and every card payment through the code, from where it's collected to everywhere it goes, and check each against every rule in [rules.md](references/rules.md). Record a report that proves what was checked, and that a payment provider or a regulator could read. The report is the output: don't fix anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the work item's change, or the whole product
- [ ] 2. Inventory: every personal field, and every place it goes
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review what its branch changed (`git diff --name-only <base>...HEAD`), and follow any personal data it touches to everywhere it goes, changed or not.
- **The whole product:** every part on the map from the peer-ai MCP tool `project_map`, except external and dormant ones. Its `signals` list the personal-data fields and payment providers it found.

Read these first where they exist, and list them in the report's `inputs`: `compliance` in `peer-ai.config.json` (where the product operates, its industries and rule packs), the data inventory, the privacy notice, and the requirements' "What it handles".

## 2. Inventory

List every piece of personal data and everywhere it goes, from the code, with an id, a kind and its file and line:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `field` | `field:cyclists.phone` | Each personal field stored or collected: names, contact details, location, photos, health, money |
| `collection` | `collection:location-permission` | Each place data is collected: a form, a device permission, a sensor, a photo |
| `destination` | `destination:analytics` | Each place it goes: a log, an outside service, an AI model, a URL, another app |
| `payment` | `payment:deposit` | Each place card details or payments are handled |
| `retention` | `retention:bookings` | Each store, and how long its data is kept |

This inventory is the product's data inventory. When the project has none, offer to save it (`compliance.dataInventory` in the config says where).

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the files in scope. It returns the rules that apply at the project's stage and traits.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here, such as MONEY-12 for a product that takes no payments. The line says why.

## 4. Check

[checking.md](references/checking.md) says how to check each rule, and what laws and standards they come from.

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the rule holds, such as "deposits.ts:20 sends only the provider's token; the card form is the provider's own".
- **A failure is a finding:** whose data goes where, the file and line, and a fix. Its severity is its rule's, from [severity.md](references/severity.md). Card numbers or security codes on your own servers are critical on sight (MONEY-12).
- **Every field, every destination.** Follow each field to each place it goes; one missed call to an outside service is one missed finding.
- **Where it operates.** Say which of the product's jurisdictions a finding matters in, such as the UK or Nigeria, and name the law as a pointer, such as the UK GDPR or Nigeria's NDPA.
- **No legal conclusions.** What only a lawyer, a data protection officer or a payment provider can settle, such as whether a lawful basis applies, is `not-checked` with the question to ask them.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/compliance-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `compliance-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `compliance-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: the result, each finding's severity and title, the questions for a lawyer or payment provider, and what wasn't checked and why. Offer to turn the findings into work items, and to save the data inventory.
