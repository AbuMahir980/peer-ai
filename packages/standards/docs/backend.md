# Backend

How servers take requests, validate them and report what happened.

## BE-01 · A failed operation is reported as failed

An operation that didn't happen is never reported as done: a payment that didn't go through is never shown as sent.

**Why:** A false success is worse than an error. The person relies on it, and the problem surfaces much later, somewhere else.

**Ask:** Could anything in this change report success for an operation that failed?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | High | Always | – |

## BE-02 · Request bodies have a size limit

The server limits how large a request body can be, with a limit that fits what each endpoint really needs.

**Why:** Without a limit, one oversized request can use up a server's memory and take it down for everyone.

**Ask:** Does every endpoint in this change have a sensible limit on the size of what it accepts?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |
