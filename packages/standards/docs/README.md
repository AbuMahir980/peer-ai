# Peer AI standards

Generated from the rules in `src/core/`. Don't edit these pages by hand: change a rule, then run `pnpm --filter @peer-ai/standards generate`.

Every rule has an id, the rule in plain words, why it matters, a question a reviewer can answer, the stage it applies from, how it's checked and how serious breaking it usually is. The design is in [RFC 0003](../../../rfcs/0003-how-a-standard-is-written.md).

- **Checked by a tool:** a linter, the type checker, a test or a scanner fails the build.
- **Checked by AI review:** Peer AI's review checks it on every change and shows its evidence in a report.
- **Checked by a person:** a real decision, such as accepting a risk.

| Domain | Rules |
|--------|-------|
| [Requirements](requirements.md) | 5 |
| [Architecture](architecture.md) | 8 |
| [System design and scalability](system-design.md) | 6 |
| [API design](api-design.md) | 8 |
| [Frontend](frontend.md) | 9 |
| [Mobile](mobile.md) | 6 |
| [Design and accessibility](design-accessibility.md) | 16 |
| [Backend](backend.md) | 2 |
| [Data](data.md) | 5 |
| [Performance and caching](performance.md) | 7 |
| [Reliability](reliability.md) | 9 |
| [Security](security.md) | 30 |
| [Privacy and compliance](privacy-compliance.md) | 6 |
| [Testing](testing.md) | 11 |
| [Delivery](delivery.md) | 12 |
| [Infrastructure and operations](operations.md) | 15 |
| [AI features](ai-features.md) | 8 |
| [Code quality](code-quality.md) | 16 |
| [Money](money.md) | 12 |
| [Safety-critical data](safety-critical.md) | 6 |

## Stack profiles

A stack profile says how to follow the core rules in one stack, and which tool enforces each automatic rule. The design is in [RFC 0006](../../../rfcs/0006-stack-profiles-and-their-enforcers.md).

| Profile | Id | Builds on | Rules |
|---------|----|-----------|-------|
| [TypeScript](profiles/typescript.md) | `typescript` | – | 10 |
| [Node](profiles/node.md) | `node` | typescript | 5 |
| [React](profiles/react.md) | `react` | typescript | 10 |
| [React Native](profiles/react-native.md) | `react-native` | react | 9 |
| [Next.js](profiles/next.md) | `next` | react, node | 5 |
| [Express](profiles/express.md) | `express` | node | 7 |
| [NestJS](profiles/nestjs.md) | `nestjs` | node | 6 |
| [Fastify](profiles/fastify.md) | `fastify` | node | 4 |
| [Python](profiles/python.md) | `python` | – | 13 |
| [FastAPI](profiles/python-fastapi.md) | `python-fastapi` | python | 8 |
