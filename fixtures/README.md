# Fixtures

Small, made-up projects that Peer AI is tested on end to end. Each one is set up the way `peer-ai init`, `peer-ai render` and `peer-ai assess` leave a real project, and has a backlog with work to give an AI tool.

| Fixture | What it is | Stage |
|---------|------------|-------|
| [`split-bill`](split-bill/) | A dependency-free TypeScript library that splits a bill between people, to the cent | MVP |

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
| 2026-09-28 | split-bill | Claude Code 2.1.274 | Pass, at `ship` | 25 | 1 min 30 s | $1.20 | With the stages explained, it moved to `build` before changing code, then verified, reviewed and shipped, in order. |
| 2026-09-28 | split-bill | Claude Code 2.1.274 | Pass, at `ship` | 37 | 3 min 53 s | $2.06 | It wrote the code while the item was still at `prepare`: the instructions didn't say when to move stages, and now do. It recorded its own failed review, fixed both findings, verified again, then recorded a pass. |

Both runs reviewed with the code review skill installed in Claude Code, since Peer AI's own skills come in Milestone 3.
