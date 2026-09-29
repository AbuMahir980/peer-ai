---
"@peer-ai/skills": minor
"@peer-ai/workflow": minor
"peer-ai": patch
---

Add `@peer-ai/skills`, the package that holds Peer AI's skills in the Agent Skills format (RFC 0004). It builds a skill (generating its rules from `@peer-ai/standards`, and a review skill's severity scale and report format from one shared source) and validates the result against the Agent Skills specification, Anthropic's and OpenAI's authoring guidance and RFC 0004. `AUTHORING.md` says how to write a skill. `@peer-ai/workflow` gains each skill's kind (15 review, 10 document, 4 work), and the lists of MCP tools and CLI commands that skills may name; the CLI and MCP server are held to those lists.
