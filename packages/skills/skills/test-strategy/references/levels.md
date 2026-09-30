# Which level each check belongs at

Examples are from a made-up bicycle repair booking service. Test tools are examples; the stack profile names the project's own.

## Contents

- The levels
- What each rule asks
- Signs a test isn't doing its job

## The levels

| Level | What it proves | For example |
|-------|----------------|-------------|
| Unit | One rule or calculation, with plain values in and out | A repair's finish date from the parts on order and the mechanic's free days |
| Integration | One part working with something real: a database built by the migrations, a file, a queue | Saving a booking and reading it back |
| Contract | Two parts agree on what passes between them, without running both | The shop app and the bookings API agree on a booking's fields |
| End to end | A main journey, the way a person takes it | A cyclist books a slot, pays the deposit, and sees the booking |
| Abuse | The product refuses what it should | A cyclist asking for another cyclist's booking gets nothing |

Put each check at the lowest level that can prove it: a finish date is a unit test, not an end-to-end one. A few end-to-end tests cover the main journeys; everything else sits lower, where it's fast and says exactly what broke.

A stand-in for an outside service is fine for testing your own code's handling, including its failures and slow replies. It proves nothing about the service itself: pair it with a contract, or a check against the real thing where that's safe.

## What each rule asks

- **TEST-01:** each bug fix comes with the test that would have caught it.
- **TEST-02:** each main journey has an acceptance test, end to end.
- **TEST-03 and CODE-15:** each business rule is tested with plain values, at its edges: zero, empty, the largest value, time zones and daylight saving, ties, the first and last item.
- **TEST-04:** tests check what the code does, not how it does it, so a refactor doesn't break them.
- **TEST-05 and TEST-07:** each test creates what it needs, and doesn't rely on another test's leftovers or on running in order.
- **TEST-06:** integration tests use a database built by the migrations, never a schema made by hand. A change to stored data is tested from the shape it had before, and nothing is lost.
- **TEST-08:** code that handles sign-in, permissions, money, uploads or input reaching a database has abuse tests: another person's id, bad input, a repeat.
- **TEST-09:** a new check is seen failing before it's trusted.
- **TEST-10 (production):** a skilled attacker tests the product before launch and every year. Plan it even when nobody is named yet, such as "planned: before launch, then every year, by an outside security tester", and ask who books it under Open questions.
- **TEST-11 (production):** a parser the project writes itself is fuzz-tested.
- **PRIV-02:** test data is invented; no real person's details.
- **DEL-04:** the tests run on every change, as required checks that block a merge.

## Signs a test isn't doing its job

- It asserts nothing about the rule it's named after, or only that no error was thrown.
- It passes whatever the code does, such as one that compares a value with itself.
- No command runs it: it's in a folder the verify command and CI never reach.
- It's skipped, or marked as expected to fail, with no date to remove the mark.
- It fails now and then without a change, and people re-run it until it passes.
