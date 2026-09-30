# Fastify

APIs in Fastify: a schema on every route, for what comes in and what goes out, a body limit chosen on purpose, one error handler, and plugins that keep to themselves. It builds on the Node profile.

List it in `standards.profiles` as `fastify`. It applies to parts tagged `fastify`. It builds on [node](node.md), which apply wherever it does.

## FASTIFY-01 · Every route has a schema, in and out

Every route declares schemas for its body, parameters, query and responses, so Fastify checks what comes in and sends only the fields the response schema names.

**Why:** Without a response schema, Fastify sends whatever the handler returns, including fields the client should never see.

**Ask:** Does every route in this change declare its request and response schemas?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | AI review | High | [SEC-05](../security.md) | Any | – |

## FASTIFY-02 · Request bodies stay under 1 MiB

`bodyLimit` stays at 1 MiB or below, raised only for a route that needs more, such as an upload.

**Why:** Raising the limit for everything lets one request fill the server's memory.

**Ask:** Does this change raise the body limit beyond 1 MiB, or for more than the routes that need it?

**Default:** 1 MiB. A project changes it in `standards.overrides`, with its reason.

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [BE-02](../backend.md) | Any | – |

## FASTIFY-03 · One error handler answers every error the same way

`setErrorHandler` answers every error in the project's error shape, without stack traces or internal detail.

**Why:** Errors answered route by route drift apart, and the client can't handle them one way.

**Ask:** Does every error in this change go through the one error handler?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [API-04](../api-design.md) | Any | – |

## FASTIFY-04 · Plugins keep what they add to themselves

A plugin's decorators and hooks stay inside it. One is shared with `fastify-plugin` only when the whole app needs it, and says so.

**Why:** Sharing everything by default makes each plugin depend on the others' insides, so none can change alone.

**Ask:** Does this change share a plugin's decorators or hooks beyond the code that needs them?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Low | [ARC-03](../architecture.md) | Any | – |
