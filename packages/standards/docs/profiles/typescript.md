# TypeScript

TypeScript in any runtime: the compiler at its strictest, no escape hatches from the types, and errors that can't disappear. The React, Node and backend profiles build on it.

List it in `standards.profiles` as `typescript`. It applies to parts tagged `typescript`.

## TS-01 · The compiler is strict

Every tsconfig says `"strict": true`, so nothing is typed `any` without saying so, `null` is checked, and a caught error is `unknown` until it's narrowed. TypeScript 6 turns it on by default; saying so keeps it on with older compilers, and for anyone reading the file.

**Why:** Each check strict mode turns off is a class of bug the compiler would have caught.

**Ask:** Does every part's tsconfig say strict is on?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | Medium | [CODE-14](../code-quality.md) | Any | `strict`, in the TypeScript compiler |

## TS-02 · No `any` where a real type exists

`any` isn't written. Data of unknown shape, such as a response from another service, is `unknown` and checked before use.

**Why:** `any` turns the type checker off for everything it touches, and the error surfaces far from its cause.

**Ask:** Does this change write `any`?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | Medium | [CODE-14](../code-quality.md) | Any | `@typescript-eslint/no-explicit-any`, in ESLint |

## TS-03 · No `!` to tell the compiler a value is there

A value that may be missing is checked, not asserted with `!`. Where it truly can't be missing, the types say so.

**Why:** `!` is a promise the compiler can't check. When it's wrong, the crash comes at run time instead of a compile error.

**Ask:** Does this change assert a value is present with `!`?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Low | [CODE-14](../code-quality.md) | Any | `@typescript-eslint/no-non-null-assertion`, in ESLint |

## TS-04 · No empty catch

A `catch` block is never empty. Where ignoring an error is right, the block logs it and says why.

**Why:** An empty catch turns a failure into silence, and the bug report says only that something didn't happen.

**Ask:** Does this change leave a catch block empty?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | High | [CODE-11](../code-quality.md) | Any | `no-empty`, in ESLint |

## TS-05 · Every promise is awaited or handled

A promise is awaited, returned, or given a handler for its failure. One that's started and forgotten is marked with `void` and a comment saying why.

**Why:** A forgotten promise's failure goes nowhere: the work silently doesn't happen, or crashes the process later.

**Ask:** Does this change start a promise and not handle its failure?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [CODE-11](../code-quality.md) | Any | `@typescript-eslint/no-floating-promises`, in ESLint |

## TS-06 · Nesting stays 3 levels deep or less

Blocks nest at most 3 levels deep in a function. Deeper code handles the simple cases first and returns.

**Why:** Each level is one more condition to hold in mind while reading the line inside it.

**Ask:** Does any function in this change nest blocks more than 3 deep?

**Default:** 3 levels. A project changes it in `standards.overrides`, with its reason.

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Low | [CODE-09](../code-quality.md) | Any | `max-depth`, in ESLint |

## TS-07 · A function longer than 60 lines prompts a question

A function over 60 lines, not counting blank lines and comments, fails the lint, so someone asks whether it does two things. Where it doesn't, a disable comment beside it says why.

**Why:** Long functions usually hide a second job, and the second job is what the next change breaks.

**Ask:** Has any function grown past 60 lines, and does each that stays say why?

**Default:** 60 lines. A project changes it in `standards.overrides`, with its reason.

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Low | [CODE-10](../code-quality.md) | Any | `max-lines-per-function`, in ESLint |

## TS-08 · A file longer than 400 lines prompts a question

A file over 400 lines, not counting blank lines and comments, fails the lint, so someone asks what could move out. Where nothing should, a disable comment at the top says why.

**Why:** A file that keeps growing is usually several modules sharing a name.

**Ask:** Has any file grown past 400 lines, and does each that stays say why?

**Default:** 400 lines. A project changes it in `standards.overrides`, with its reason.

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Low | [CODE-10](../code-quality.md) | Any | `max-lines`, in ESLint |

## TS-09 · A switch over a union handles every case

A `switch` over a union of values handles each one, so adding a value to the union is a compile-time list of every place to change.

**Why:** A new status that falls through to a default does whatever the default does, which is rarely right for it.

**Ask:** Does every switch over a union in this change handle each of its values?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Medium | [CODE-15](../code-quality.md) | Any | `@typescript-eslint/switch-exhaustiveness-check`, in ESLint |

## TS-10 · A catch checks what it caught

A `catch` that handles an error checks what it is, such as with `instanceof`, before using it. One that handles every kind alike says why that's safe.

**Why:** In TypeScript every catch catches everything, so handling a network failure can also hide a bug in the code around it.

**Ask:** Does every catch in this change check what it caught, or say why it handles all errors alike?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [CODE-12](../code-quality.md) | Any | – |
