# Node

Node on the server: no code built from strings, calls to other services that give up, settings checked once at start-up, and failures that stop the process instead of hiding. Express, NestJS, Fastify and Next.js build on it.

List it in `standards.profiles` as `node`. It applies to parts tagged `node`. It builds on [typescript](typescript.md), which apply wherever it does.

## NODE-01 · No code is built from strings

`eval` isn't used, so no text, least of all text from outside, is ever run as code.

**Why:** A string that reaches eval runs with everything the server can reach: its secrets, its database and its files.

**Ask:** Does this change use eval?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [SEC-06](../security.md) | Any | `no-eval`, in ESLint |

## NODE-02 · Every call to another service gives up in time

A call to another service, such as with `fetch`, has a timeout, such as `AbortSignal.timeout`, and its failure is handled, not left to hang or crash the request.

**Why:** Node's fetch waits as long as the other side does. One slow service then holds every request that calls it.

**Ask:** Does every call to another service in this change have a timeout and handle failure?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | High | [REL-01](../reliability.md) | Any | – |

## NODE-03 · Settings are read and checked once, at start-up

`process.env` is read in one module that checks every setting at start-up, such as with a schema, and the process stops when one is missing or wrong. The rest of the code imports the checked values.

**Why:** A setting read where it's used fails the first request that needs it, in production, long after the deploy looked fine.

**Ask:** Does this change read process.env outside the settings module?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [REL-04](../reliability.md) | Any | – |

## NODE-04 · A promise that fails where nothing catches it stops the process

Nothing swallows unhandled rejections: no `process.on('unhandledRejection')` handler that carries on. The process stops, and the platform restarts it.

**Why:** A process that carries on after an unexpected failure runs in a state nobody designed, and fails in stranger ways later.

**Ask:** Does this change let the process carry on after an unhandled rejection?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [BE-01](../backend.md) | Any | – |
