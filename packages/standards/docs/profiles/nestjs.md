# NestJS

APIs in NestJS: a validation pipe that refuses unknown fields, guards on every controller, thin controllers, an exception filter that keeps internals in, and settings checked at start-up. It builds on the Node profile.

List it in `standards.profiles` as `nestjs`. It applies to parts tagged `nest`. It builds on [node](node.md), which apply wherever it does.

## NEST-01 · A global validation pipe refuses unknown fields

A global `ValidationPipe` runs with `whitelist` and `forbidNonWhitelisted`, and every request body is a DTO class with validation decorators.

**Why:** Without the pipe, a DTO's decorators do nothing, and a body with extra fields, such as a role, reaches the service as it came.

**Ask:** Does the app run a global ValidationPipe that refuses unknown fields, and does every body have a validated DTO?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | AI review | High | [SEC-05](../security.md) | Any | – |

## NEST-02 · Every route is guarded unless it says it's public

An authentication guard is global, and a route open to everyone says so with a decorator, such as `@Public()`, which a reviewer can see.

**Why:** A guard added controller by controller is missed on the one controller that needed it.

**Ask:** Is every route in this change behind the guard, or marked public on purpose?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Critical | [SEC-03](../security.md) | Any | – |

## NEST-03 · Controllers call services, which hold the rules

A controller maps the request to a service call and the result to a response. The business rules live in the service, which knows nothing of HTTP.

**Why:** Rules in a controller can't be reused by a queue consumer or a scheduled job, and are tested only through HTTP.

**Ask:** Does any controller in this change hold a business rule?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [ARC-05](../architecture.md) | Any | – |

## NEST-04 · An exception filter keeps internals in

A global exception filter answers every error in the project's error shape, without stack traces, queries or database errors.

**Why:** An error the filter doesn't know about, such as a database error, otherwise reaches the client with its detail.

**Ask:** Could an error in this change reach the client with internal detail?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [SEC-09](../security.md) | Any | – |

## NEST-05 · Settings are checked when the app starts

`ConfigModule` loads settings with a validation schema, so the app refuses to start with a setting missing or wrong.

**Why:** A setting read unchecked fails on the first request that needs it, long after the deploy looked fine.

**Ask:** Does the app check its settings with a schema at start-up?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [REL-04](../reliability.md) | Any | – |

## NEST-06 · Modules share only the providers they export

A module uses another only through the providers that module exports, never by importing its internal files.

**Why:** Reaching past a module's exports ties the two together, so neither can change alone.

**Ask:** Does this change reach into another module past its exports?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [ARC-03](../architecture.md) | Any | – |
