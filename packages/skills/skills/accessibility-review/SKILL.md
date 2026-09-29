---
name: accessibility-review
description: Reviews screens for accessibility (keyboard, screen readers, labels, colour, contrast, text size, touch targets, motion) against WCAG 2.2-based rules, proving each was checked. Use for accessibility reviews, or when a screen changes.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-rules: DES-07 DES-08 DES-09 DES-10 DES-11 DES-12 DES-13 DES-14 DES-15 DES-16 FE-08
---

# Accessibility review

Check every screen in scope against every rule in [rules.md](references/rules.md), and record a report that proves what was checked. The rules come from WCAG 2.2, level AA, and each cites its success criterion. The report is the output: don't fix anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the screens the work item changed, or every screen
- [ ] 2. Inventory: every screen, control, field, message and moving part
- [ ] 3. Rules: which apply to the files in scope
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review the screens and shared components its branch changed (`git diff --name-only <base>...HEAD`), and the shared components those screens use.
- **The whole project:** every screen in the parts on the map from the peer-ai MCP tool `project_map` that have a user interface, older screens included.

Read the design system and its tokens first where they exist, and list them in the report's `inputs`. Contrast is worked out from the token values.

## 2. Inventory

List everything a person sees or uses, from the code, with an id, a kind and its file and line:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `screen` | `screen:booking` | Each screen, page or dialog |
| `control` | `control:book-button` | Each button, link, icon button and anything clickable |
| `field` | `field:recipient-name` | Each form field |
| `message` | `message:booking-failed` | Each error, empty and status message |
| `indicator` | `indicator:parcel-status` | Anything that means something by its colour: a status, a badge, an error |
| `motion` | `motion:list-reorder` | Each animation, and anything done by dragging |
| `token` | `token:colour-muted` | Each colour used for text or controls, with its value |

A clickable element that isn't a button or a link, such as a `div` with a click handler, is a `control` too: it's the one most often missed.

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for the screens in scope. It returns the rules that apply, with the platform profile's numbers, such as the smallest touch target.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here, such as DES-10 for a phone app with no keyboard use. The line says why.

## 4. Check

| Rules | Reference |
|-------|-----------|
| DES-08 to DES-12: using every control | [controls-and-forms.md](references/controls-and-forms.md) |
| DES-07, DES-13 to DES-16, FE-08: seeing, reading and understanding | [seeing-and-reading.md](references/seeing-and-reading.md) |

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the rule holds, such as "BookingForm.tsx:31 labels the date field with a visible label element tied to it".
- **A failure is a finding:** the harm to a person in plain words, such as "someone using a keyboard can't confirm a booking", the file and line, and a fix. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every item, not a sample.** A rule about each control is checked on each control.
- **Contrast is a number.** Work out the ratio from the colour values, and say which pair fails and by how much.
- **Only what the code shows.** When the proof needs the running app, such as how a screen reader announces a custom component, the line is `not-checked` with that reason, and what to test by hand.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/accessibility-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `accessibility-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `accessibility-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: the result, each finding's severity and title, what needs testing by hand, and what wasn't checked and why. Offer to turn the findings into work items.
