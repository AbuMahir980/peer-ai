# Code quality

What makes code good in any language: naming, size, duplication, errors and types.

## CODE-01 · Names say what things are

A name says what the thing is, in the language's own style: `amountMinor` or `amount_minor`, not `amt`; `profileId` or `profile_id`, not `pid`.

**Why:** Code is read far more often than it's written. An abbreviation saves the writer a second and costs every reader a guess.

**Ask:** Could someone new to the code understand every name in this change without asking?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Low | Always | – |

## CODE-02 · True-or-false values read as statements

A true-or-false value is named as a statement, such as `isPublished`, `hasError` or `canBook` (or `is_published` where the language uses snake_case).

**Why:** `published` could mean a date, a flag or a count; `isPublished` can only mean one thing.

**Ask:** Does every true-or-false value in this change read as a statement?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Low | Always | – |

## CODE-03 · Things are named the way the people using the product name them

Code, screens and design tokens use the words the people using the product use: a person manages notifications, not webhook config.

**Why:** When the code and the product use different words, every conversation needs a translator, and mistakes hide in the translation.

**Ask:** Do the names in this change match the words on the screen and in the requirements?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Low | Always | – |

## CODE-04 · Rule of three

Copy code freely once, note it the second time, and move it into one shared place the third time.

**Why:** A shared piece built too early is harder to remove than three similar ones, because everything comes to depend on it.

**Ask:** Is anything in this change repeated for the third time, or shared before it was needed?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |

## CODE-05 · Rules that must never disagree are shared on the first repeat

Money maths, validation, permission checks and safety-critical logic are moved into one shared place the first time they're repeated, not the third.

**Why:** Two copies of a rule eventually disagree. When the rule is money, safety or who may see what, the disagreement is a wrong charge, a harmed person or a data leak.

**Ask:** Is any money, validation, permission or safety logic written more than once?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | High | Always | – |

## CODE-06 · A deliberate copy names its twin

If a rule truly has to live in two places, each copy says where the other one is.

**Why:** Copies drift apart silently when nobody knows the other exists.

**Ask:** Does every deliberate copy of logic point to its twin?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## CODE-07 · A function does one thing

A function has one reason to change.

**Why:** A function that does two things can't change one of them without risking the other, and its tests have to cover both.

**Ask:** Does each function this change touches do one thing?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## CODE-08 · Comments explain why; the code explains what

If code needs a comment to explain what it does, it's too long or badly named. Comments that explain why are welcome.

**Why:** Comments about what code does go out of date when the code changes. The reasons behind it last.

**Ask:** Does any comment in this change explain what the code does, rather than why?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |

## CODE-09 · Deep nesting becomes early returns

When conditions nest deeply, handle the simple cases first and return, so the main path reads straight down. Each profile sets how deep is too deep.

**Why:** Every level of nesting is one more thing a reader has to hold in mind.

**Ask:** Is any code nested more deeply than its profile allows?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Low | Always | – |

## CODE-10 · Size prompts a question

A function, component or module that grows past its profile's size limit prompts a question: is it doing two things, and what could move out? Size alone isn't a defect.

**Why:** Large units usually hide a second job, and the limit is the reminder to look for it.

**Ask:** Has anything grown past its size limit, and has someone asked whether it's doing two things?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Low | Always | – |

## CODE-11 · No swallowed errors

An error is never caught and ignored. Where ignoring one is genuinely right, such as cleanup that mustn't fail the work it cleans up after, it's logged, and the reason is written beside it.

**Why:** A swallowed error turns a loud, fixable failure into silent wrong behaviour that surfaces weeks later.

**Ask:** Is any error caught and dropped without being logged and explained?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | High | Always | – |

## CODE-12 · Catching every kind of error needs a reason

Catching every kind of error at once needs a comment saying what's expected and why it's safe to handle them all the same way.

**Why:** A catch-all also catches the bugs nobody expected, and hides them.

**Ask:** Does every catch-all in this change say what it expects and why?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## CODE-13 · Impossible states can't be written down

When something has distinct states, such as loading, failed and ready, it's one status value, not several true-or-false flags that can contradict each other.

**Why:** Three flags allow eight combinations, and most of them make no sense. One status allows only the real ones.

**Ask:** Could any combination of flags in this change describe a state that can't really happen?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## CODE-14 · Types are strict

Where the language has types, they're strict. No escape-hatch type, such as TypeScript's `any` or Python's `Any`, where a real type exists: data of unknown shape is checked and narrowed.

**Why:** An escape-hatch type switches the checks off exactly where the data is least trusted.

**Ask:** Does this change use an escape-hatch type where a real type exists?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | Medium | Always | – |

## CODE-15 · Edge cases are handled

Code gives the right answer at the edges of what it can receive: time zones and daylight saving, empty and very long input, ties and equal values, the first and last item, and zero.

**Why:** Most bugs live at the edges. The ordinary path is the one everyone tries, so it's rarely where things break.

**Ask:** Does this change give the right answer at its edges: time zones, empty or huge input, ties, first and last, and zero?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## CODE-16 · The framework's own rules are kept

Where a framework needs code written a certain way to work, such as React's rules for hooks, that way is followed, and checked by a tool where one exists.

**Why:** A framework's rules protect assumptions the types can't see. Breaking one gives bugs that appear far from their cause, often only sometimes.

**Ask:** Does this change break a rule its framework depends on?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Medium | Always | – |
