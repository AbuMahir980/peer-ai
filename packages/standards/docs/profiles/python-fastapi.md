# FastAPI

APIs in FastAPI: models for what comes in and what goes out, permission checked per record, settings checked at start-up, callers from a fixed list, errors that keep internals in, and a body limit set somewhere. Its layering rules follow the architecture a part declares. It builds on the Python profile.

List it in `standards.profiles` as `python-fastapi`. It applies to parts tagged `fastapi`. It builds on [python](python.md), which apply wherever it does.

## FASTAPI-01 · Every route has models for what comes in and goes out

Every route takes its body as a Pydantic model and declares its response model, so FastAPI checks what arrives and sends only the fields the response names.

**Why:** A route that returns a database object sends every field it has, including ones the client should never see.

**Ask:** Does every route in this change declare request and response models?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | AI review | High | [SEC-05](../security.md) | Any | – |

## FASTAPI-02 · Permission is checked for the record, not only the person

A route that takes an id checks the caller may use that record, such as in a dependency that loads it for the caller, not only that they're signed in.

**Why:** A dependency that only checks sign-in lets anyone signed in change an id in the URL and read someone else's record.

**Ask:** Does every route in this change that takes an id check the caller may use that record?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Critical | [SEC-01](../security.md) | Any | – |

## FASTAPI-03 · Settings are checked when the app starts

Settings are a Pydantic settings class, loaded once at start-up, so the app refuses to start with a setting missing or wrong, and an environment name it doesn't know is treated as production.

**Why:** A setting read with os.environ where it's used fails the first request that needs it, long after the deploy looked fine.

**Ask:** Does this change read a setting outside the settings class?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [REL-04](../reliability.md) | Any | – |

## FASTAPI-04 · Cross-origin callers come from a fixed list

`CORSMiddleware` allows only a fixed list of the project's own origins, never `*` with credentials.

**Why:** An open CORS policy lets any site call the API with the visitor's credentials.

**Ask:** Does the CORS middleware allow only a fixed list of origins?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | High | [SEC-16](../security.md) | Any | – |

## FASTAPI-05 · Errors keep internals in

Exception handlers answer in the project's error shape, without tracebacks, queries or driver errors, and `debug` is off outside development.

**Why:** With debug on, or a handler that passes on an exception's text, such as `HTTPException(detail=str(error))`, a database error reaches the client with the query and the table names in it.

**Ask:** Could an error in this change reach the client with internal detail?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [SEC-09](../security.md) | Any | – |

## FASTAPI-06 · Request bodies stay under 1 MiB

Something limits request bodies to 1 MiB, such as the proxy in front or a middleware like Starlette's `RequestBodyLimitMiddleware`, since FastAPI sets no limit itself.

**Why:** With no limit, one request can fill the server's memory.

**Ask:** What limits the size of a request body, and is it 1 MiB or less?

**Default:** 1 MiB. A project changes it in `standards.overrides`, with its reason.

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [BE-02](../backend.md) | Any | – |

## FASTAPI-07 · Routes call services, never the session

In a layered API, a route reads the request, calls a service and answers. Only the data layer uses the database session.

**Why:** A route that queries the session skips the rules the service enforces, and the next change has to find every copy.

**Ask:** Does any route in this change use the database session directly?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [ARC-07](../architecture.md) | `layered` | – |

## FASTAPI-08 · Each domain keeps its router, services and models to itself

In a modular monolith, each domain's package holds its router, services and models. Another domain imports only what the package's public module exports.

**Why:** Reaching into another domain's models or services ties the two together, so neither can change alone.

**Ask:** Does this change import another domain's internal modules?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [ARC-03](../architecture.md) | `modular-monolith` | – |
