---
"peer-ai": minor
"peer-ai-workflow": minor
---

`init` and `migrate` take up the stack profiles and traits `assess` suggests (RFC 0011). They show each one with why it was suggested, all ticked, and ask why about any you untick; `--yes` takes them all. A new top-level `declined` records a suggestion the project decided against, with why, so it isn't suggested again.

`peer-ai doctor` now warns about a suggestion the config has neither taken up nor declined. On a project set up before this release, run `npx peer-ai doctor` after updating: for each one, add it to `standards.profiles` or `project.traits`, or list it in `declined` with the reason. If the project's enforcement isn't staged yet, set `standards.enforcement` to `report` first, so a new profile reports before it blocks.
