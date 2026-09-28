# Peer AI

An agent-agnostic workflow for AI-assisted software development, from a stakeholder's email to a tested, documented and shipped app.

> **This is the `next` branch, where Peer AI 1.0 is being built.** It is not usable yet. The working v0 playbook is on [`main`](https://github.com/AbuMahir980/peer-ai/tree/main) and tagged [`v0.1.0`](https://github.com/AbuMahir980/peer-ai/releases/tag/v0.1.0).

1.0 turns the v0 playbook into an npm package:

- **No copied folder.** A project keeps one config file and no `peer-ai/` folder.
- **One MCP server for every tool.** Claude Code, Codex, Cursor, Copilot and Gemini CLI all reach the workflow the same way.
- **Adaptive, not waterfall.** `peer-ai assess` maps what a project already has, and each piece of work pulls in only the steps it needs.
- **Skills that prove what they checked.** Every review lists the whole surface it covered, cites evidence for each finding, and reports pass or fail for every rule.
- **Standards from the UI to the infrastructure.** 17 domains, with real linter and CI configs for each supported stack.

The full plan and milestones are in [ROADMAP.md](ROADMAP.md).

## Repository layout

| Path | What it holds |
|------|---------------|
| `packages/` | The published packages, from Milestone 1 onward |
| `scripts/` | Repository tooling, such as the forbidden-terms check |
| `rfcs/` | Proposals for significant changes, and the template |
| `legacy/v0/` | The v0 playbook, kept as source material for the rewrite and removed before 1.0 |

## Development

Requires Node 24 (see `.nvmrc`) and pnpm 12.

```bash
pnpm install
pnpm verify
```

`pnpm verify` checks formatting, lints, type-checks and runs the tests. CI runs the same command.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Until the Foundations milestone lands, the most useful contribution is a report of where v0 failed on your project, including the project's shape.

## License

[MIT](LICENSE)
