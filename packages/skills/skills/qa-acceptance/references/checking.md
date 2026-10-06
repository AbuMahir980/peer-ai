# Checking a built item

Examples are from a made-up bicycle repair booking service.

## Contents

- Each criterion: REQ-05, TEST-02, TEST-03
- Its edges: CODE-15
- Refusals and whose data: TEST-08
- Tests that can't fail: TEST-04, TEST-09
- Tests that run other code: TEST-12
- Scope: REQ-04
- Criteria and bug fixes: REQ-02, TEST-01

## Each criterion: REQ-05, TEST-02, TEST-03

A criterion reads "Given…, when…, then…". Each "then" is a check.

- **In the code:** find the code that makes the "then" true, and follow it with the criterion's own values, step by step. Work the answer out yourself; don't trust a comment or a function's name.
  - **Pass:** it holds for the criterion's values, with the file and line.
  - **Fail (REQ-05):** a value the criterion names that the code gets wrong, or a case it names that the code doesn't handle.
- **In the tests:** find a test that uses the criterion's values, or values that exercise the same rule, and asserts its "then".
  - **Fail:** no such test; a test that asserts something else; a test whose values can't tell right from wrong, because a wrong answer and the right one come out the same for them.

## Its edges: CODE-15

For each criterion, try its edges against the code: zero, empty, one, the largest value, just before and just after any limit it names, ties, and time zones and daylight saving wherever a day or a time matters. A criterion that names a limit, such as a deadline, a count or a range, is checked at the limit, on both sides.

## Refusals and whose data: TEST-08

- **Each refusal a criterion lists** is refused by the code, case by case, with a clear message, and each case has a test: one check per refusal.
- **A criterion about whose data a person may see or change** holds when the code checks the record belongs to the person, and a test tries another person's.
- **A clear message** is one the code chooses, that tells the person what was wrong.

## Tests that can't fail: TEST-04, TEST-09

- It asserts nothing about its criterion, or only that no error was thrown.
- Its values would pass whatever the code does.
- It replaces the very thing the criterion is about with a stand-in, so the criterion is never exercised.
- It checks how the code works rather than what it does, so it would break on a harmless change and pass a wrong one.

## Tests that run other code: TEST-12

When the item adds or changes a compiler, a transform or a build flag, such as switching on the React Compiler, check the tests run through it too: compare the build's settings with the test runner's. A test that passes on code the app never ships proves nothing about the app. Where the runner can't apply it, an end-to-end check of the built app must cover the difference, or it's a finding. For an item that changes none of these, the line is `not-applicable`.

## Scope: REQ-04

Anything the change does that no criterion or source asks for is an `extra`, and a finding: something nobody asked for, or a behaviour changed beside the item's. It goes to the backlog as its own item, not into this one.

## Criteria and bug fixes: REQ-02, TEST-01

- **REQ-02:** an item with no acceptance criteria, or criteria too vague to check, such as "works well", can't be accepted.
- **TEST-01:** a bug fix ships with the test that would have caught the bug: a test that fails without the fix.
