---
"peer-ai": minor
---

`peer-ai doctor` lists every rule the project sets aside or changes (`standards.exceptions` and `standards.overrides`), so nothing is switched off silently. It warns about an exception that has ended, a rule id that isn't one of Peer AI's rules, and a rule set aside twice. `peer-ai assess` and the `project_map` tool suggest traits the code points to, each with its evidence: a payment provider suggests `money`, a service worker `offline`, an AI SDK `ai-features`, two apps on one backend `several-audiences`, and so on. Traits the config already declares are left out.
