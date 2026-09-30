# Packages

The published packages land here, starting with Milestone 1. The planned layout, from [ROADMAP.md](../ROADMAP.md):

| Package | Holds |
|---------|-------|
| `peer-ai` | The CLI (`init`, `assess`, `render`, `doctor`, `check`, `migrate`, `update`) and the MCP server |
| `@peer-ai/workflow` | Activities, templates, and the config and state schemas |
| `@peer-ai/skills` | The skills in Agent Skills format, with their helper scripts |
| `@peer-ai/standards` | Core principles for 18 domains, and the sets that switch on for money and safety-critical data, written as the rules in [RFC 0003](../rfcs/0003-how-a-standard-is-written.md); and the stack profiles that carry them out in each stack ([RFC 0006](../rfcs/0006-stack-profiles-and-their-enforcers.md)) |
| `@peer-ai/eslint-config` | The ESLint settings for the stack profiles a project lists, read from its `peer-ai.config.json` |
