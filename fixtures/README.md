# Fixtures

Small, made-up projects that Peer AI is tested on end to end. Each one is set up the way `peer-ai init`, `peer-ai render` and `peer-ai assess` leave a real project, and has a backlog with work to give an AI tool.

| Fixture | What it is | Stage |
|---------|------------|-------|
| [`split-bill`](split-bill/) | A dependency-free TypeScript library that splits a bill between people, to the cent | MVP |
| [`courier`](courier/) | A parcel pickup service: a React web app and a Python API on PostgreSQL, with 18 problems planted on purpose for the [evals](../evals/) | MVP |
| [`shelf`](shelf/) | A book-lending phone app in React Native, in production and half rebuilt: older JavaScript screens beside newer TypeScript features, with its API in another repository. 16 problems planted for the [evals](../evals/). | Production |
| [`sprout`](sprout/) | A plant-care journal that works offline: a React web app with its data in the browser, a service worker, and plant identification by an AI service. Sync is planned. 14 problems planted for the [evals](../evals/). | MVP |
| [`kennel`](kennel/) | A dog-boarding service's API in NestJS, on PostgreSQL through TypeORM, in production: a modular monolith that takes deposits, stores photo uploads and checks vaccinations with another service. 22 problems planted for the [evals](../evals/), so the reviews are proven on a Node backend as well as Python. | Production |
| [`refill`](refill/) | A new product with nothing built yet: only a config and a founder's brief, which the [evals](../evals/) give to requirements-analysis | Prototype |

## Running an AI tool on a fixture

Prepare a copy first. It becomes its own git repository outside this one, so the tool doesn't also read this repository's instructions. Its MCP registrations start this checkout's `peer-ai`, because the package isn't published yet.

```bash
node scripts/fixture.ts split-bill
```

It prints the folder and how to start each tool there. Then give the tool one item from the fixture's backlog in plain words, the way a person would. Don't mention Peer AI or its tools: the test is whether the instructions `render` wrote lead the tool through the work on their own.

A run passes when:

1. The tool created a work item and moved it through the stages to `ship` with the MCP server, moving it to `build` before changing code. `done` follows once the change is merged, which is the person's call.
2. It verified with `run_verify` and recorded a review with `record_review`.
3. `peer-ai check` passes in the folder afterwards.
4. The change itself is right, and its tests cover it.

## Runs

Each run gave the tool the same backlog item, the optional tip, on a fresh copy. Newest first.

| Date | Fixture | Tool | Result | Turns | Time | Cost | What it showed |
|------|---------|------|--------|-------|------|------|----------------|
| 2026-09-28 | split-bill | Codex CLI 0.158.0 | Pass, at `ship` | 18 steps | – | ChatGPT Free | With `run_verify` pre-approved, it checked the standards for every file it touched, moved to `build` before changing code, verified, reviewed its own diff and shipped, in order. |
| 2026-09-28 | split-bill | Codex CLI 0.158.0 | Stopped at `verify` | 16 steps | – | ChatGPT Free | Codex asks before an MCP tool that reaches outside the project, and `run_verify` runs the project's verify command. With nobody to approve it, Codex recorded where it stopped instead of claiming a pass. `render` now prints the setting that pre-approves `run_verify`. |
| 2026-09-28 | split-bill | Claude Code 2.1.274 | Pass, at `ship` | 25 | 1 min 30 s | $1.20 | With the stages explained, it moved to `build` before changing code, then verified, reviewed and shipped, in order. |
| 2026-09-28 | split-bill | Claude Code 2.1.274 | Pass, at `ship` | 37 | 3 min 53 s | $2.06 | It wrote the code while the item was still at `prepare`: the instructions didn't say when to move stages, and now do. It recorded its own failed review, fixed both findings, verified again, then recorded a pass. |

The Claude Code runs reviewed with the code review skill installed in Claude Code, and Codex reviewed the diff itself, since Peer AI's own skills come in Milestone 3.

Codex ran headless with `codex exec --ephemeral --ignore-user-config`, with the server passed as `-c mcp_servers.peer-ai.command=…` for that run only, and `-c mcp_servers.peer-ai.tools.run_verify.approval_mode="approve"` on the second run.
