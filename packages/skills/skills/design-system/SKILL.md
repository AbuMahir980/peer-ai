---
name: design-system
description: Writes or updates the design system (tokens from one place, shared components with all their states, and the accessibility every screen keeps), from the code alone or with designs. Use when a product has none yet, or when screens drift from it.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: document
  peer-ai-domains: design-accessibility
  peer-ai-rules: FE-07 FE-08 FE-09
  peer-ai-templates: design-system
  peer-ai-path: docs/design-system.md
---

# Design system

Write down the product's design system: where its design comes from, its tokens in one place, its shared components with every state, and the accessibility every screen keeps. Design reviews and code reviews check screens against it, so each rule must be concrete enough to check.

`next_work`, `project_map`, `standards_for_file` and `check_document` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-document`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: the designs, the tokens, and the screens in the code
- [ ] 2. Inventory: every token, shared component, and value written straight into a screen
- [ ] 3. Rules: what every screen keeps, accessibility included
- [ ] 4. Write: the template filled in, with the problems found
- [ ] 5. Check: accepted by the peer-ai MCP tool `check_document`
- [ ] 6. Hand over: problems, and decisions for the designer
```

## 1. Sources

- **Where design comes from:** `design` in `peer-ai.config.json` says whether designs exist, where they are, where the tokens live, and whether the designs are authoritative. When they are, the design system records them exactly and invents nothing.
- **What exists:** call the peer-ai MCP tool `project_map`. Its `design` item lists design folders, token files and any design system document to update.
- **The screens:** the code shows what's really used, which may differ from the designs.
- **Where to save:** `docs/design-system.md`, unless the project keeps it elsewhere.

With no designs and no tokens, propose a small starting set from what the screens already use, and mark it proposed for a designer or the person to decide.

## 2. Inventory

List from the code and the designs, with the file for each:

| Kind | For example |
|------|-------------|
| `token` | Each colour, space, type size, radius and shadow, with its name and value, in each theme |
| `component` | Each shared component, and the states it has: default, hover, focus, pressed, disabled, loading, error |
| `stray` | Each colour, size or font written straight into a screen instead of coming from a token (DES-01) |
| `screen` | Each screen that builds its own version of a shared component (DES-04) |

## 3. Rules

For each rule in [rules.md](references/rules.md), say how the design system meets it, concretely. [accessibility.md](references/accessibility.md) gives the checks for each.

- **Tokens** (DES-01 to DES-03): from one place, used by every app, named for what they're for, such as `colour-danger` rather than `red-500`.
- **Components** (DES-04, DES-05): screens use the shared ones, and each comes with all its states. Screens that wait show loading, empty and error (FE-07, FE-08), and offline where the product works offline (FE-09).
- **Meaning** (DES-06, DES-07): the danger colour means one thing, and nothing is shown by colour alone.
- **Access** (DES-08 to DES-16): names, labels, keyboard, visible focus, an alternative to dragging, contrast in every theme, the person's text size, large enough touch targets, and reduced motion.

Check contrast by working it out from the token values; say which pairs fail and by how much.

## 4. Write

Copy the [template](assets/design-system.md) and fill in every part.

- **Describe what is,** and list each problem the code shows, such as a stray colour or a component missing its focus state, under Problems, most serious first. Never write a problem into the system as if it were a rule.
- **Values, not adjectives:** "`colour-link` #1a5fb4 on `colour-surface` #ffffff, 6.3 to 1", not "subtle grey".
- **Say where each fact came from:** the designs, the token file, a screen, or proposed by you. Don't stop to wait for answers: mark what you propose as proposed, put each question under Open questions, and ask the person when you hand over. Their answers update the document.

## 5. Check

You MUST finish with this step: a document Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `check_document` with the skill `design-system` and the document's path. Fix what it names and call it again, until it says the document is ready. If the MCP tools aren't available to you, run `npx peer-ai check-document <path> --skill design-system` instead.

## 6. Hand over

Tell the person, in a few lines: where the design system is, each problem found with the most serious first, and each decision waiting for a designer, such as a colour that fails contrast.
