# Decision records

A decision record says what was decided, why, and what else was considered, so the next person doesn't undo it by accident or keep it after its reasons are gone. The example is from a made-up bicycle repair booking service.

## When one is needed

Write one for a choice that's costly to reverse, or that someone will later ask about:

- how the product splits into parts, or merges them;
- where data lives, and which kind of store;
- how parts talk: calls, events, a shared database;
- where it runs, and how changes reach production;
- a choice a law, a contract or a need forces;
- an exception to a rule the architecture sets.

Everyday choices, such as a library for dates, don't need one.

## A good record

```markdown
# 3. Keep shops' calendars in the booking service

## Status

Proposed, 2 March. Waiting for the shop owners' lead.

## Context

Shops need to see and block time slots. Bookings are refused when a slot is taken, so
the calendar and the bookings must change together (SYS-03).

## Options

- **In the booking service's database.** One transaction for a slot and its booking;
  shops can't use their own calendar apps.
- **Synced from each shop's own calendar.** Shops keep their tools; a slot can be taken
  twice between syncs, and every provider needs its own integration.

## Decision

Recommended: in the booking service's database, because a slot taken twice is the
failure the requirements rule out. Syncing out to shops' calendars can come later.

## Consequences

Shops manage slots in our screens. Revisit if more than a few shops ask for their own
calendars.
```

## What makes it good

- **Real options,** each with a cost and a gain against the needs. A list with one serious option and two straw men isn't a choice.
- **The need that decides it,** named: here, that a slot is never taken twice.
- **Proposed until a person decides.** The record says who it's waiting for.
- **When to revisit,** so a change in the facts reopens it.
