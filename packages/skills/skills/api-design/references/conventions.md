# Conventions, done well

Examples from a made-up bicycle repair booking service. The formats are examples: follow the project's own where it has them, and write them down where it doesn't.

## One error shape (API-04)

```json
{ "error": { "code": "slot_taken", "message": "That slot has just been booked.", "retry": false } }
```

- `code` is stable, so a client can act on it; `message` is for people.
- No stack traces, SQL or internal names (SEC-09).
- The HTTP status says what kind of failure it is; the code says which.

## Lists, always paged (API-05, API-07, API-08)

```json
{ "items": [], "next": "cursor-or-null" }
```

- Every list has the same shape, and a page size set in one place.
- Cursors hold up better than page numbers when items are added while someone pages.

## Money and dates

- `"deposit": { "amount": 1500, "currency": "GBP" }`: pence, never 15.00 (MONEY-01).
- `"starts_at": "2026-03-05T09:30:00+00:00"`: one format, with a time zone. A date with no time, such as a birthday, is a plain date.

## Safe retries (SYS-01, MONEY-08)

- `POST /deposits` takes an `Idempotency-Key` header. The same key returns the first result, and charges once.
- `GET`, `PUT` and `DELETE` are safe to repeat by design; say so for each.

## Who may call (SEC-01 to SEC-03)

- Not "signed-in users" but "the cyclist who owns the booking, or a mechanic at its shop".
- Public endpoints are marked public, with what they may show. A link anyone can guess shows nothing personal.

## Changing a field (API-06)

1. Add `deposit_pence` beside `deposit`.
2. Clients move to `deposit_pence`; the contract marks `deposit` as deprecated, with a date.
3. Remove `deposit` once no client version in use reads it.

## Nothing sensitive in a URL (SEC-22)

- `GET /bookings?email=...` puts personal data in logs and history. Use the signed-in user, or a body.
