# Calls, jobs, caches and connections

REL-01, REL-02, REL-03, SYS-01 and REL-07. Examples are from a made-up bicycle repair booking service.

## REL-01: every call out has a timeout, and failures are handled

- **Look at:** each `outside` call, and any shared helper it goes through.
- **Pass:** a timeout on the call or the helper; a failed response checked, such as the status code, before the body is used; and what the person sees when it fails, such as a message with a retry.
- **Fail:** a request with no timeout; a response used without checking it succeeded; a failure that leaves a screen spinning forever.
- A shared helper with no timeout is one finding at the helper, naming the calls that go through it.

## REL-02: a cache that's down slows things, it doesn't break them (production)

- **Look at:** each server-side `cache`.
- **Pass:** a read that falls back to the source when the cache fails.

## REL-03: rate limiting never switches off (production)

- **Look at:** the rate limiter's store, and what happens when it's unreachable.
- **Pass:** a limit on each server instead, at least as strict for sign-in and codes, and an alert.

## SYS-01: jobs are safe to run twice

- **Look at:** each `job`.
- **Pass:** running it twice gives the same result, such as by checking a "sent" flag in the same transaction, or a unique key.
- **Fail:** a reminder job that sends the reminder again each time the queue redelivers it.

## REL-07: a dropped connection loses nothing that matters (production)

- **Look at:** each `live` connection.
- **Pass:** anything that matters is saved before it's sent, and the client catches up on reconnecting.
