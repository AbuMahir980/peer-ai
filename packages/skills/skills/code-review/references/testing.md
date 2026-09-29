# Tests

TEST-01, TEST-04 and TEST-07. Whether the right things are tested at all belongs to test-strategy; these rules are about the tests a change brings.

## TEST-01: a bug fix ships with the test that would have caught it

**Fail** when a change fixes a bug and adds no test that fails without the fix. For a change that isn't a bug fix, the line is `not-applicable`.

## TEST-04: tests check behaviour, not implementation

**Fail** when a test asserts on private details: internal calls, mocks of the unit's own collaborators, or exact render trees, rather than what a caller or person sees.

## TEST-07: no test depends on another's leftovers

**Fail** when:

- a test relies on data another test created;
- tests share state that isn't reset;
- a test passes only in one order.
