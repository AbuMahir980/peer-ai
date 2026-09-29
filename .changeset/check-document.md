---
"peer-ai": minor
"@peer-ai/workflow": minor
"@peer-ai/skills": minor
---

Add the document check (RFC 0004): the `check_document` MCP tool and `peer-ai check-document <path> --skill <id>`. They compare a document a Peer AI skill wrote with the skill's template, and name each missing or empty part, each piece of template text left in, and each rule id that doesn't exist, so the skill can fix them and check again. The instructions `render` writes now tell agents to check every document a skill writes. Document skills declare their templates and where their document is saved, and the build checks both.
