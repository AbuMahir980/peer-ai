# Hard cases, done well

Each case from a made-up bicycle repair booking service: a cyclist pays a deposit to hold a slot.

## Two at once (SYS-03, SYS-04, SYS-05)

- **Badly:** "Check the slot is free, then book it." Two cyclists both see it free, and both are booked.
- **Well:** "A unique index on (shop, slot) makes the database refuse the second booking. The second cyclist is told the slot has just gone and shown the next free one."

Prefer a guarantee the database enforces over a check in code. When a lock is needed, say what's locked and for how long.

## Done twice (SYS-01, MONEY-08)

- **Badly:** "Charge the deposit, then create the booking." A retried request charges twice.
- **Well:** "The app sends an idempotency key with the request. The server stores it with the booking, in the same transaction, and a request with a key it has seen returns the first result. The payment provider gets the same key."

## A call fails or hangs (REL-01)

- **Badly:** "Call the payment provider."
- **Well:** "The payment call times out after 10 seconds. On a timeout the booking is held as pending, the cyclist sees 'We're checking your payment', and the provider's webhook settles it. The webhook's signature is checked first (MONEY-09)."

## Nothing lost (DATA-03)

- **Badly:** "Rename `slot` to `starts_at`."
- **Well:** "Add `starts_at`, copy `slot` into it, switch reads and writes, then drop `slot` in a later release, after checking nothing reads it."

## Clients keep working (API-06)

- **Badly:** "Change `deposit` from a number to an amount with its currency."
- **Well:** "Add `deposit_amount`, with its currency, beside `deposit`. Clients move to it. Remove `deposit` once no client version in use reads it."

## Tests that prove it (SYS-06, TEST-08)

- Two bookings for the same slot at once: exactly one succeeds.
- The same request sent twice: one charge, one booking.
- Another cyclist's booking id: refused.
- The provider timing out: the booking is pending, not lost.
