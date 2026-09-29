# Where debt hides

Examples are from a made-up bicycle repair booking service.

## In the code

- **A replacement never finished:** an old way and a new way of doing the same job, both still in use, such as two ways of sending reminder texts.
- **Duplicates that drift:** the same rule written in two places, such as a slot's length worked out by both the shop app and the bookings service.
- **Work people route around:** comments saying "don't touch", "temporary", "TODO", "FIXME" or "HACK", and code everyone copies instead of changing.
- **Tangles:** a module everything imports, or one whose change breaks others (ARC-02, ARC-03).

## In the tests and checks

- **Missing where change happens:** the parts that change most, with the fewest tests.
- **Tests that don't prove much:** ones that assert nothing useful, or never run.
- **Checks that don't stop anything:** a check that can fail without blocking a merge.

## In what it's built on

- **Versions left behind:** dependencies several major versions old, or no longer maintained.
- **A platform version near its end of support.**

## In how it runs

- **Steps done by hand** that the pipeline should do.
- **Settings nobody can explain.**

## Sizing it

| Question | Tells you |
|----------|-----------|
| How often does work touch it? | What it costs to leave |
| Has it caused a bug or an outage? | What it risks |
| Can it be fixed a piece at a time? | Whether it can start now |
| What must happen first? | What it depends on |
