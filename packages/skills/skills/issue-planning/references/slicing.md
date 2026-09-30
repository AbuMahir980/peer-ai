# Slicing, done well

Examples from a made-up bicycle repair booking service: letting a cyclist move a booking to another day.

## By layer, badly

1. Add a `moved_from` column.
2. Add `PATCH /bookings/{id}`.
3. Add the Move button.

None of these ships anything a person can use, and each needs the others before it can be tested from the outside.

## Through the layers, well

| Id | Title | Depends on |
|----|-------|------------|
| BK-12 | Keep a booking's original day when it moves | – |
| BK-13 | Move a booking to another day | BK-12 |
| BK-14 | Refuse a move after 5pm the day before | BK-13 |
| BK-15 | Tell the shop when a booking moves | BK-13 |

- **BK-12** is a prerequisite with its own criterion: existing bookings keep their day, and the migration loses nothing.
- **BK-13** is the first slice a cyclist can use. It works end to end for the ordinary case.
- **BK-14** and **BK-15** each add one rule, with its own criteria. Both depend on BK-13, not on each other, so they can be built side by side.

## A good item

```json
{
  "title": "Refuse a move after 5pm the day before",
  "kind": "feature",
  "track": "api",
  "goal": "A booking can't be moved once changes have closed for its day.",
  "acceptance": [
    "Given a booking for Thursday, when the cyclist moves it at 4:59pm on Wednesday, shop time, then it moves.",
    "Given a booking for Thursday, when the cyclist tries to move it at 5:01pm on Wednesday, then it stays on Thursday and they're told changes closed at 5pm."
  ],
  "sources": ["docs/specs/move-a-booking.md#edge-cases"],
  "dependsOn": ["BK-13"],
  "next": "Write the two criteria as tests against the move endpoint."
}
```

## Dependencies that are real

- **Real:** the screen reads a field the migration adds. It can't ship first.
- **Not real:** the email and the refusal both come after the move, but neither needs the other. Recording a dependency between them would hold one back for nothing.

## Another repository

When the change needs something from an API in another repository, the request to its owners is its own item, and the app's slice depends on it. The request states what the API must guarantee, not how to build it.
