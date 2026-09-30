---
"@peer-ai/standards": minor
"peer-ai": minor
---

The Python and FastAPI stack profiles. Python's ten automatic rules, such as no bare except, no error caught and ignored, queries never built from text, no shell with outside input and a timeout on every request, are enforced by Ruff. `peer-ai render` writes Ruff's settings to `.peer-ai/enforce/ruff.toml` for the project's own Ruff settings to extend, and `peer-ai doctor` checks they do. Every Ruff rule is run through Ruff on an example that must fail and one that must pass. FastAPI's rules are AI-reviewed, and its layering rules follow the architecture a part declares, layered or modular monolith.
