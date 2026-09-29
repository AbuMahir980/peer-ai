# Code people can change safely

CODE-01 to CODE-15. Size and nesting limits come from the stack profile, through `standards_for_file`.

## Names

- **CODE-01:** a name says what the thing is. Fail abbreviations such as `amt` and `pid`, and vague names such as `data` and `info` where something specific is meant.
- **CODE-02:** a true-or-false value reads as a statement, such as `isPublished`. Fail `published` or `flag`.
- **CODE-03:** code uses the words the people using the product use. Fail internal jargon in names people see.

## Repetition

- **CODE-04:** the third copy of the same logic moves to one shared place.
- **CODE-05:** money maths, validation, permission checks and safety-critical logic move to one place on the first repeat. A second copy of any of these is a finding.
- **CODE-06:** a deliberate copy says where its twin is.

## Shape

- **CODE-07:** a function does one thing. Fail a function that changes for two unrelated reasons.
- **CODE-08:** comments say why, not what. Fail comments that restate the code.
- **CODE-09:** deep nesting becomes early returns, past the profile's depth.
- **CODE-10:** a unit past the profile's size limit prompts the question of whether it does two things. It's a finding only when it does.

## Errors and states

- **CODE-11:** no swallowed errors. Fail an empty `catch`, or one that only returns a default, unless it logs the error and says why.
- **CODE-12:** catching every kind of error needs a comment saying why that's safe.
- **CODE-13:** impossible states can't be written down. Fail several true-or-false flags, such as `isLoading` and `hasError`, where one status value would do.
- **CODE-14:** types are strict. Fail `any`, `Any` or a cast used to skip checking data of unknown shape.

## Edges

- **CODE-15:** edge cases give the right answer. For every unit, try the edges of what it can receive:
  - dates near midnight, in another time zone, and across a change to daylight saving;
  - an empty list, and a very long one;
  - two equal values competing for one place, such as two bookings for the same slot;
  - the first and the last item;
  - zero and negative numbers.
