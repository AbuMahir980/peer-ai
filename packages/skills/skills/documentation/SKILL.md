---
name: documentation
description: Writes or updates the README a newcomer needs (what it is, how to set it up, run and test it, how it's put together and shipped), checked against the code so every command works. Use when onboarding is hard or the README is stale.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: document
  peer-ai-templates: readme
  peer-ai-path: README.md
---

# Documentation

Write the README a newcomer needs to go from a fresh clone to a running product and a first change, without asking anyone. Every command in it is the project's own, every setting is named where it comes from, and every claim is checked against the code. What doesn't work yet is said plainly, not papered over.

`next_work`, `project_map`, `standards_for_file` and `check_document` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-document`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Sources: the code, its scripts and settings, and what's already written
- [ ] 2. Inventory: every part, command, setting, service and document
- [ ] 3. Try it: each command, run or checked against where it's defined
- [ ] 4. Write: the template filled in, from what you found
- [ ] 5. Check: accepted by the peer-ai MCP tool `check_document`
- [ ] 6. Hand over: what you changed, and what doesn't work yet
```

## 1. Sources

- **The parts:** call the peer-ai MCP tool `project_map`. Its parts, and the architecture and requirements it finds, say what the product is and how it's put together.
- **What runs it:** the dependency files and their scripts, the verify command in `peer-ai.config.json`, container and hosting files, the CI and deployment pipelines, and every place the code reads a setting, such as an environment variable.
- **What's written:** the README and the `docs` folder. Update them rather than starting again, and keep every decision and warning a person wrote, even where the code disagrees; report the disagreement instead.
- **Where to save:** `README.md`, unless the project keeps it elsewhere.

## 2. Inventory

List, with where each is defined:

| Kind | Covers |
|------|--------|
| part | Each part of the product, what it does and where it lives |
| command | Each command a newcomer needs: install, run, test, migrate, build, release |
| setting | Each setting the code reads, whether it's required, and where its value comes from |
| service | Each thing it needs running, such as a database, and each outside service it calls |
| document | Each document a newcomer should know about |

## 3. Try it

Where you're free to run commands, follow your own setup steps in a clean copy, as a newcomer would, and fix the README until they work. Where you can't, or running them would need someone's permission, don't stop to ask: check each command against where it's defined, such as a script in a dependency file or the verify command, and each setting against the code that reads it. Mark any step you couldn't confirm as not tried.

A step that can't work as the project stands is a problem to report, not to hide.

## 4. Write

Copy the [template](assets/readme.md) and fill in every part. [writing.md](references/writing.md) shows the difference between a README that works and one that doesn't.

- **The project's own words for things:** commands exactly as defined, settings by their exact names.
- **Never a real value:** name each secret and say where it comes from, such as the team's secret store. If the code holds a secret itself, don't repeat it: report it.
- **Short and in order:** the steps a newcomer takes, in the order they take them. Link to the docs for depth instead of copying them in.
- **Say where each fact came from,** and mark what you couldn't confirm. Don't stop to wait for answers: put each question in the hand-over, with who can answer it.

## 5. Check

You MUST finish with this step: a document Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `check_document` with the skill `documentation` and the README's path. Fix what it names and call it again, until it says the document is ready. If the MCP tools aren't available to you, run `npx peer-ai check-document <path> --skill documentation` instead.

## 6. Hand over

Tell the person, in a few lines: what the README now covers, each step you couldn't confirm, and each problem you found that makes setting up or working on the project harder than it should be. Offer to turn those problems into work items.
