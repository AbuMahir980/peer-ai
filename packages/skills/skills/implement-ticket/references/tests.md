# Tests from acceptance criteria

Examples from a made-up bicycle repair booking service. The test framework is the project's own; these are sketches.

## One criterion, one or more tests

Criterion: *Given a booking for Thursday, when the cyclist tries to move it at 5:01pm on Wednesday, shop time, then it stays on Thursday and they're told changes closed at 5pm.*

```ts
test("a move after 5pm the day before is refused, and the booking stays put", () => {
  const booking = bookingOn("2026-03-05"); // a Thursday
  const result = move(booking, "2026-03-06", at("2026-03-04T17:01", "Europe/London"));
  expect(result).toEqual({ ok: false, reason: "changes-closed" });
  expect(booking.day).toBe("2026-03-05");
});
```

- The test's name says the criterion in plain words, so the list of tests reads like the criteria.
- It checks what a person would see, not how the code gets there.

## The edges around a criterion

The criterion names 5pm. Test both sides of it, and the day the clocks change:

- 4:59pm moves; 5:00pm doesn't, if the rule is "before 5pm";
- 5pm on the day the clocks go forward is still 5pm local time.

## Before and after

Write the test, run it, and see it fail for the right reason, such as "expected ok: false, got ok: true". A test that passes before the change proves nothing about the change.

## A list for the hand-over

| Criterion | Test |
|-----------|------|
| A move before 5pm the day before is accepted | `moves a booking before 5pm the day before` |
| A move after 5pm the day before is refused | `a move after 5pm the day before is refused, and the booking stays put` |
| The shop sees the new day | `the shop's calendar shows a moved booking on its new day` |
