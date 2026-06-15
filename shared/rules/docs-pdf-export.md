---
description: Generate PDF-ready HTML when creating or updating docs/ markdown files
globs: docs/**/*.md
alwaysApply: false
---

# PDF-Ready HTML Export

When a markdown file in `docs/` is created or substantially updated, generate a corresponding HTML file in `docs-pdf/` with the same base name.

## Rules

- Output folder: `docs-pdf/` (gitignored — not tracked in version control)
- Filename: match the markdown filename with `.html` extension (e.g. `docs/02-architecture.md` → `docs-pdf/02-architecture.html`)
- Purpose: user opens in browser and prints/saves as PDF to share with stakeholders
- If `docs-pdf/` doesn't exist, create it
- If the project's `.gitignore` doesn't include `docs-pdf/`, add it

## Styling requirements

- Font: Inter (Google Fonts import), fallback to system sans-serif
- Body: `10pt`, `line-height: 1.45`, `max-width: 800px`, centered
- Headings: h1 at `18pt` bold, h2 at `13pt` with bottom border, h3 at `11pt`
- Tables: `9pt`, collapsed borders, light grey header background `#f5f5f5`, full width
- Code: JetBrains Mono (Google Fonts import) at `8.5pt` with `#f0f0f0` background
- Spacing: tight — `6px` paragraph margin, `4px 8px` table cell padding, minimal gaps between sections
- Print media query: reduce font sizes by ~1pt, enforce `page-break-inside: avoid` on tables and `.no-break` elements
- Use `.page-break` class (`page-break-before: always`) before large sections that should start on a new page
- No external JS dependencies — pure HTML + CSS

## Brand-aware styling (optional)

If the project has a brand guide or Tailwind config with brand colors:
- Use the primary brand color for h1 headings and heading borders
- Use the brand's monospace font for code blocks if specified

If no brand guide exists, use neutral defaults:
- h1 color: `#1a1a1a` (near-black)
- h2 border color: `#e5e5e5` (light grey)

## Model recommendation

Before generating the HTML file, tell the user: "Switch to **Composer 2** for the HTML export — it's pure templating work and 86% cheaper than Opus. Let me know when you've switched." **Wait for the user to confirm before generating.** Switch back to the previous model after the export is done.

## When to trigger

This rule activates on any `docs/**/*.md` file. The workflow phases also explicitly nudge the AI to offer HTML export after saving key documents. Both mechanisms ensure no doc gets missed.
