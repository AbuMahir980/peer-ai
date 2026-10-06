---
"peer-ai": patch
---

In the report stage, `peer-ai doctor` says what reporting means for each tool: how many ESLint rules are warnings, how many Ruff rules are left out of Peer AI's Ruff file (Ruff has no warnings), and how many security checks report without failing (#204). It also names the staged route for making some checks block while others keep reporting: `enforce`, with the rules that aren't ready in `standards.deferred`, each until the work item that fixes them.
