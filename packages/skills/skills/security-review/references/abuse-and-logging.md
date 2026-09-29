# Guessing, abuse and security logs

SEC-12, SEC-13, SEC-24 and REL-03.

## SEC-12: sign-in can't be guessed at speed

Check every one of these routes, each as its own inventory item:

- sign-in;
- password reset;
- two-factor;
- one-time codes;
- invite acceptance.

**Pass** when a rate limit applies to each, keyed by account as well as by address, so spreading attempts across addresses doesn't help.

**Fail** on:

- a route with no limit;
- a limit only by address;
- a limit only in the app or at a layer that can be bypassed.

## SEC-13: named policies in one place (production)

**Pass** when rate limits are named policies defined in one module, such as `signIn` or `publicApi`, and routes refer to them by name.

**Fail** when numbers are scattered through route handlers.

## SEC-24: security events are logged

**Pass** when each of these is logged with who, what and when:

- a sign-in;
- a failed sign-in;
- a refused permission check;
- input refused by validation;
- a hit on a rate limit.

**Fail** when:

- a refusal is silent;
- the log line carries the password, token or personal data involved, which also fails PRIV-01.

## REL-03: rate limiting never switches off (production)

**Fail** when the limiter lets requests through if its store is unavailable. Look for:

- a caught error that calls the next handler;
- a limit of zero or `Infinity` as a fallback.

**Pass** when:

- the fallback is a limit on each server, and at least as strict for sign-in, reset, two-factor and one-time codes;
- the failure raises an alert.
