# Packages

The packages Peer AI publishes to npm. They go out with Peer AI's first release. Until then, `pnpm build` compiles each one to `dist/`, and `scripts/package-proof.ts` packs and installs them the way npm will.

| Package | Holds |
|---------|-------|
| `peer-ai` | The CLI (`init`, `assess`, `render`, `doctor`, `check`, `check-report`, `check-document`, `mcp`) and the MCP server |
| `peer-ai-workflow` | The fixed lists of activities, skills and AI tools, and the schemas for the config, project state and review reports |
| `peer-ai-skills` | The skills in Agent Skills format, with each document skill's templates |
| `peer-ai-standards` | Core principles for 18 domains, and the sets that switch on for money and safety-critical data, written as the rules in [RFC 0003](../rfcs/0003-how-a-standard-is-written.md); and the stack profiles that carry them out in each stack ([RFC 0006](../rfcs/0006-stack-profiles-and-their-enforcers.md)) |
| `peer-ai-eslint-config` | The ESLint settings for the stack profiles a project lists, read from its `peer-ai.config.json` |
