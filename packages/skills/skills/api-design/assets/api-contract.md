# API: {{name}}

## Summary

{{What the API is for, which part provides it, and who calls it.}}

## Where the contract lives

{{The one source of truth, such as an OpenAPI file, whether it's written by hand or generated from the code, and how clients get their types from it.}}

## Who calls it

{{Each client, how it signs in, and which websites may call the API.}}

## Conventions

{{Types, the one error shape, the list shape and paging, money and dates, idempotency keys for anything that can't be repeated, limits, and how a change reaches clients without breaking them.}}

## Endpoints

| Endpoint | What it does | Who may call it | Takes | Returns | Errors | Safe to retry |
|----------|--------------|-----------------|-------|---------|--------|---------------|
| {{POST /bookings}} | {{What it does}} | {{Who, and for which records}} | {{The request}} | {{The response}} | {{Each error}} | {{Yes, or with an idempotency key}} |

## Webhooks (optional)

{{Each call another service makes to this API, and how it's verified before anything happens.}}

## Changes (optional)

{{What this change adds, changes or removes, and how each client moves across: add, migrate, then remove.}}

## Mismatches (optional)

{{Where the code and the contract disagree today, and which is right.}}

## Open questions

{{Each decision only a person can make, what's proposed until they do, and who can decide.}}

## Sources

{{What this was written from: the spec, the contract, the code at a commit, and the people asked.}}
