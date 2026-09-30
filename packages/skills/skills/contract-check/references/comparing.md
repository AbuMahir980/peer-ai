# Comparing the code with the contract

What to compare for each route, and how to judge which side is wrong. Examples are from a made-up bicycle repair booking service; contract formats such as OpenAPI, GraphQL and protocol buffers are examples.

## For each route

| Compare | The contract says | The code does |
|---------|-------------------|---------------|
| Path and method | `POST /bookings` | The route registered on the handler |
| Who may call it (SEC-02) | Its security scheme, or none for a public route | The sign-in check on the handler, or its absence |
| Request | Each field, its type, its limits, such as a range or a length, and whether it's required | What the handler reads, and every limit it enforces |
| Response | Each field, its name and case, and its type, or no body | What the handler returns, field by field |
| Status codes | Each code, such as 201, 404 and 409 | Each code the handler can return |
| Errors (API-04) | The one error shape | What an error really looks like |
| Lists (API-05, API-07) | The list shape and its paging | Whether the handler pages, and how |

## Which side is wrong

- **The contract is the source of truth** (API-02). By default, the code changes to match it.
- **Unless the code is right and the contract is stale,** such as a route added with its own review and never written into the contract. Then the contract changes, in the same change.
- **Never change the contract to match a bug,** such as a route returning details it shouldn't.
- **When you can't tell,** say so, and name who decides.

## More than promised

A response with fields the contract doesn't list is a mismatch. Judge it by what the fields are:

- **Personal data** a public or narrow route shouldn't return, such as an address on a public status page: PRIV-03, and the route's sign-in rule.
- **Card details** received or returned anywhere: MONEY-12, critical.
- **Internal detail,** such as a stack trace or a database id meant to stay private: SEC-09.

## Clients (API-03)

- **Pass:** clients get their types from the contract, such as generated types, so a mismatch fails the build.
- **Fail:** hand-written types in a client, which drift from the contract silently.
