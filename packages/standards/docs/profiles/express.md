# Express

APIs in Express: bodies with a limit, input checked at the route, one error handler that keeps internals in, security headers, and callers from a fixed list. Its layering rules follow the architecture a part declares. It builds on the Node profile.

List it in `standards.profiles` as `express`. It applies to parts tagged `express`. It builds on [node](node.md), which apply wherever it does.

## EXPRESS-01 · Request bodies stay under 100kb

Body parsers keep a size limit, such as `express.json({ limit: "100kb" })`, raised only for a route that needs more, such as an upload.

**Why:** A body with no limit lets one request fill the server's memory.

**Ask:** Does every body parser in this change keep a size limit?

**Default:** 100kb. A project changes it in `standards.overrides`, with its reason.

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [BE-02](../backend.md) | Any | – |

## EXPRESS-02 · Input is checked at the route

Every route checks its body, parameters and query against a schema before anything else uses them.

**Why:** Express passes on whatever arrives. Unchecked input is how wrong types, extra fields and injections reach the business rules.

**Ask:** Does every route in this change check its input against a schema?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | AI review | High | [SEC-05](../security.md) | Any | – |

## EXPRESS-03 · One error handler, and no internals in its answer

Errors reach one error handler, which answers in the project's error shape, without stack traces, queries or file paths.

**Why:** Express's default answer to an error shows the stack trace outside production, and a missed setting shows it in production.

**Ask:** Could an error in this change send internal detail to the client?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [SEC-09](../security.md) | Any | – |

## EXPRESS-04 · Every response sets its security headers

The security headers are set for every response, such as with `helmet`, before any route.

**Why:** Express sets none by default, so a browser gives its pages none of the protections the headers switch on.

**Ask:** Are the security headers set before every route?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [SEC-17](../security.md) | Any | – |

## EXPRESS-05 · Cross-origin callers come from a fixed list

CORS allows only a fixed list of the project's own origins, never `*` for a route that uses cookies or tokens.

**Why:** An open CORS policy lets any site call the API with the visitor's credentials.

**Ask:** Does the CORS policy allow only a fixed list of origins?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | High | [SEC-16](../security.md) | Any | – |

## EXPRESS-06 · Routes call services, never the database

In a layered API, a route reads the request, calls a service and answers. Only the data layer queries the database.

**Why:** A route that queries the database skips the rules the service enforces, and the next change has to find every copy.

**Ask:** Does any route in this change reach the database without its service?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [ARC-07](../architecture.md) | `layered` | – |

## EXPRESS-07 · Modules use each other only through what they export

In a modular monolith, each module's routes, services and data stay inside it. Another module imports only what the module's index exports.

**Why:** Reaching into another module's files ties the two together, so neither can change alone.

**Ask:** Does this change import another module's internal files?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [ARC-03](../architecture.md) | `modular-monolith` | – |
