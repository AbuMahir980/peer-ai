---
"@peer-ai/standards": minor
"@peer-ai/workflow": minor
"peer-ai": minor
---

Add `@peer-ai/standards`, Peer AI's engineering standards, written as the rules in RFC 0003. The first 39 rules cover code quality, architecture, money and safety-critical data, each with an id, the rule, why it matters, a question for the reviewer, the stage it applies from, how it's checked and how serious breaking it usually is. The config gains `project.traits`, which switch on rule sets such as money, and `standards.overrides` and `standards.exceptions`, which change a default or set a rule aside with a recorded reason. `standards_for_file` now returns the rules that apply to the file, as `peerAiRules`.
