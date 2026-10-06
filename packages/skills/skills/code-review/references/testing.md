# Tests

TEST-01, TEST-04, TEST-07 and TEST-12. Whether the right things are tested at all belongs to test-strategy; these rules are about the tests a change brings.

## TEST-01: a bug fix ships with the test that would have caught it

**Fail** when a change fixes a bug and adds no test that fails without the fix. For a change that isn't a bug fix, the line is `not-applicable`.

## TEST-04: tests check behaviour, not implementation

**Fail** when a test asserts on private details: internal calls, mocks of the unit's own collaborators, or exact render trees, rather than what a caller or person sees.

## TEST-07: no test depends on another's leftovers

**Fail** when:

- a test relies on data another test created;
- tests share state that isn't reset;
- a test passes only in one order.

## TEST-12: tests run the code the build ships

Check it when the change touches the build's or the tests' settings, such as a bundler, Babel or compiler config, or the test runner's.

**Fail** when the build applies a compiler, transform or flag that the tests don't, such as the React Compiler in the app's Babel config but not in the test runner's, and nothing else covers the difference, such as an end-to-end check of the built app named in the test strategy. For a change that touches neither, the line is `not-applicable`.
