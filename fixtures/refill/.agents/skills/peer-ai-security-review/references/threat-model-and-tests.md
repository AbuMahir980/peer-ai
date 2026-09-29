# The threat model and abuse tests

SEC-25 and TEST-08.

## SEC-25: the threat model keeps up with the ways in

**For a work item:** does the change add a way in? That means:

- a route;
- an upload;
- a webhook;
- a sign-in method;
- a live channel;
- a new outside service.

If it does, **pass** only when the same change updates the threat model with what could go wrong through that way in and what stops it.

**Fail** when:

- a way in was added and the threat model wasn't touched;
- there is no threat model at all.

**For the whole project:** compare the inventory with the threat model, and fail for each way in the threat model doesn't mention. List them in the finding.

## TEST-08: security-sensitive code has abuse tests

For each item in scope that handles sign-in, permissions, money, uploads or input that reaches a database, look for tests that attack it, each checking that the attack is refused:

- another user's id;
- injection strings;
- missing, expired or tampered tokens;
- oversized input;
- going past a rate limit.

**Pass** evidence: the test file and the test's name.

**Fail** when:

- an item has only tests of well-behaved use;
- a vulnerability fixed in this change has no test that repeats the attack.

Tests must run against the project's own app. A test aimed at a live system is a finding in itself.
