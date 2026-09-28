# Testing

What's tested, and how tests stay trustworthy.

## TEST-01 · A bug fix ships with the test that would have caught it

Every bug fix comes with a test that fails without the fix and passes with it.

**Why:** A bug fixed without a test comes back, usually during the next refactor.

**Ask:** Does this bug fix come with a test that would have caught the bug?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## TEST-02 · The main journeys are the acceptance tests

The main journeys through the product are written as end-to-end tests, and an area isn't done until they pass. A rebuild must pass the old product's journeys.

**Why:** Unit tests can all pass while the one thing people came to do is broken.

**Ask:** Do the product's main journeys still pass with this change?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## TEST-03 · Business rules are tested thoroughly with plain values

Business rules are tested with plain values, case by case, including the edges, with a name for each case.

**Why:** Plain rules are cheap to test exhaustively, and the edges are where the bugs are.

**Ask:** Are the business rules in this change tested case by case, including the edges?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## TEST-04 · Tests check behaviour, not implementation

Tests check what the code does, the way a person or caller would see it, not how it does it internally.

**Why:** Tests tied to the implementation break on every refactor and still miss the behaviour that matters.

**Ask:** Do the tests in this change check behaviour rather than internal details?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |

## TEST-05 · Tests state what they need

A test that needs something, such as seeded data, a port or a clock, checks for it and skips with a reason when it's missing, rather than failing for want of it.

**Why:** A test that fails for the wrong reason teaches people to ignore failing tests.

**Ask:** Does every test in this change state what it needs?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |

## TEST-06 · Test databases are built by the migrations

The database a test runs against is built by the same migrations as production.

**Why:** A test database built any other way passes tests that production would fail.

**Ask:** Is the test database in this change built by the migrations?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## TEST-07 · No test depends on another's leftovers

Every test sets up what it needs and cleans up after itself. None depends on what another test left behind.

**Why:** Tests that share leftovers pass or fail depending on the order they run in.

**Ask:** Could any test in this change pass or fail depending on another test?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## TEST-08 · Security-sensitive code has abuse tests

Code that handles sign-in, permissions, money, uploads or input that reaches a database has tests that attack it: injection attempts, other people's ids, missing, expired or tampered tokens, oversized input and going past rate limits. Each test checks the attack is refused. A fixed vulnerability gets a test that repeats the attack. The tests run against the project's own app, never a live system.

**Why:** Security holes don't show up in tests that only send what a well-behaved client would send, and a fixed hole with no test can quietly open again.

**Ask:** Does the security-sensitive code in this change have tests that attack it and check the attack is refused?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## TEST-09 · A check is seen failing before it's trusted

A new test, lint rule or gate is made to fail once on purpose, to prove it can, before anyone relies on it passing.

**Why:** A check that can't fail reports the same green as one that passed. A green run proves nothing until you've seen it go red.

**Ask:** Has each new check in this change been seen to fail?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |

## TEST-10 · A skilled attacker tests the product before launch and every year

Before the product first reaches production, after big changes to who uses it or how it's reached, and at least once a year, someone skilled who didn't build it tests it as an attacker would: a penetration test, within agreed limits and only against the project's own systems. Every finding is fixed or accepted as a risk by a named person.

**Why:** Automated tests and scanners find the known kinds of problem. A skilled person finds the ones particular to your product, such as two small flaws that together open a big one.

**Ask:** When was the last penetration test, and is every finding fixed or accepted?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | A person | Medium | Always | – |

## TEST-11 · A parser you write is fuzz-tested

Code the project writes itself to read files or formats from outside, such as an import, a file format or a message protocol, is fuzz-tested: fed large amounts of random and broken input to check it never crashes, hangs or runs out of memory.

**Why:** Broken files are a classic way in, and nobody writes by hand the millions of strange inputs a fuzzer tries. Well-known parsing libraries are fuzzed by their makers; your own code isn't.

**Ask:** Does this change add code that reads an outside format, and is it fuzz-tested?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | – |
