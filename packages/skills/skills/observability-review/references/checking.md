# Checking each rule

Examples are from a made-up bicycle repair booking service. Logging, tracing and alerting tools are examples; the stack profile names the project's own.

## Contents

- Logs: OPS-07, PRIV-01
- Following a request: OPS-08
- Health checks: OPS-10
- Alerts: OPS-09
- Security events: SEC-24, OPS-12, OPS-13
- Service targets: OPS-15

## Logs: OPS-07, PRIV-01

- **OPS-07, structured:** each `log` writes named fields, such as `booking_id` and `status`, that a search can filter on. Fail a line built by pasting values into a sentence.
- **PRIV-01, nothing personal or secret:** no log line, error report or crash report holds a password, token, key, payment detail or personal data.
  - **Look at:** each call that logs a whole object, a request or response body, or an exception with the data that caused it; and each error or crash reporting setup, and everything it sends.
  - **Pass:** a redaction step in the logging layer removes those fields before anything is written, and can't be skipped.

## Following a request: OPS-08

Applies from production.

- **Pass:** each request gets one id, set where it arrives or taken from the caller, passed on to every service and job it calls, written on every log line, and shown in the error a person sees, so support can find it.
- **Fail:** no id; an id that's lost at the next service or job; or logs with no way to tie them to one request.

## Health checks: OPS-10

Applies from production.

- **Pass:** the readiness check answers "can this serve requests now?", by checking what serving needs, such as its database connection, cheaply. The liveness check answers "is this process stuck?" and nothing else.
- **Fail:** a check that says healthy whatever happens; one that does real work each time it's called, such as a query over a whole table; or one that fails whenever a dependency blinks, restarting healthy processes.

## Alerts: OPS-09

Applies from production.

- **Pass:** each `alert` is about something people would notice or that would soon hurt them, fires only when a person must act, reaches someone, and says what to do or where the runbook is.
- **Fail:** an alert that fires when nobody needs to act, so people learn to ignore it; one that reaches nobody; one with no next step.

## Security events: SEC-24, OPS-12, OPS-13

- **SEC-24, recorded:** each `event` is logged with who, what and when, and never the password or token itself: sign-ins, failed sign-ins, refused permission checks, and each security control that stops something, such as a rate limit or rejected input.
- **OPS-12, kept safe from the app:** security logs are sent to a separate system as they're written, where the app can add to them but not change or delete them, and only the people who need them can read them.
- **OPS-13 (production), noticed:** signs of attack in those logs, such as a burst of failed sign-ins, raise an alert that reaches a person and says what to do.

## Service targets: OPS-15

Applies from production.

- **Pass:** each main journey has a written `target`, such as how many of its requests succeed and how fast, it's measured from real traffic, and an alert fires before the target is missed.
- **Fail:** no written targets; targets nobody measures; or measures with no alert before the target is broken.
