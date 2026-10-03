---
"peer-ai": minor
"peer-ai-workflow": minor
"peer-ai-skills": patch
---

The MCP server's replies fit what an AI tool can take in (RFC 0012):

- **`next_work`** returns the current branch's item in full and every other open item in one line (id, title, stage, branch, part, next action and `waitingFor`), at most 50, so a project with dozens of open items no longer goes over the MCP output limit. `waitingFor` on each item replaces the separate `waiting` map.
- **A new tool, `work_item`,** returns any item in full by its id.
- **`standards_for_file`** chooses rules by what the file is (CI pipeline, build file, infrastructure, dependency manifest, migration, test, document, tool settings or source code) and the language it's in, as well as its part. So a TypeScript file no longer gets Python rules, and a CI workflow gets 38 rules instead of 189. Each rule comes as its id, title and severity, and `ruleIds` returns the full text of the ones asked for.
- **`peer-ai doctor`** warns about a part that names no stack while profiles are listed, with the stack detection finds for it.

After updating, reconnect each AI tool to Peer AI so it reads the new tools.
