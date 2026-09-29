---
name: design-review
description: Reviews screens for design quality (tokens, shared components and their states, meaning, contrast, text size), against the design system when there is one, proving each rule was checked. Use when a screen changes, or before a design sign-off.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-rules: DES-01 DES-02 DES-03 DES-04 DES-05 DES-06 DES-07 DES-13 DES-14 FE-07 FE-09
---

# Design review

Check every screen in scope against the design system and the designs, and against every rule in [rules.md](references/rules.md). Record a report that proves what was checked. Where the designs are authoritative, the screen matches them exactly. The report is the output: don't fix anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the screens the work item changed, or every screen
- [ ] 2. Inventory: every screen, component, value and state
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review the screens and components its branch changed (`git diff --name-only <base>...HEAD`).
- **The whole project:** every screen in the parts on the map from the peer-ai MCP tool `project_map` that have a user interface, older screens included.

Read these first, and list them in the report's `inputs`: `design` in `peer-ai.config.json` (where the designs and tokens are, and whether the designs are authoritative), the design system document, and the token file. With no design system at all, review anyway: most rules, such as colour alone, contrast and text size, need only the code. Say so at the top of the summary, and suggest the design-system skill. Don't stop to ask.

## 2. Inventory

List from the code, with an id, a kind and its file and line:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `screen` | `screen:booking` | Each screen, page or dialog |
| `component` | `component:Button` | Each shared component, and each one a screen builds for itself |
| `value` | `value:BookingCard#2b6cb0` | Each colour, size, radius or font written straight into a screen instead of a token |
| `state` | `state:booking-list-loading` | Each loading, empty, error and offline state a screen shows, or should |
| `indicator` | `indicator:booking-status` | Anything that means something by its colour |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the screens in scope. It returns the rules that apply, with the platform profile's numbers.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here. The line says why.

## 4. Check

[checking.md](references/checking.md) says how to check each rule, and the usual false alarms.

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the rule holds, such as "BookingCard.tsx:14 takes its colours from tokens.surface and tokens.text".
- **A failure is a finding:** what a person sees wrong, the file and line, and a fix. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every screen, not a sample.** Each value written straight into a screen is its own finding, or one finding listing them all for the same screen.
- **Designs that are authoritative** are matched exactly. A difference from them is a finding, even one that looks better.
- **Only what the code shows.** When the proof needs the designs themselves, such as a design file you can't open, the line is `not-checked` with that reason.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/design-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `design-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `design-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: the result, each finding's severity and title, and what wasn't checked and why. Offer to turn the findings into work items.
