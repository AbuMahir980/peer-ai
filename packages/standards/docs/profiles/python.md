# Python

Python in any framework, checked by Ruff: errors that are caught on purpose, types that say something, queries and commands never built from text, and calls to other services that give up. The FastAPI profile builds on it.

List it in `standards.profiles` as `python`. It applies to parts tagged `python`.

## PY-01 · An except names what it catches

An `except` names the errors it expects. A bare `except:` isn't written.

**Why:** A bare except also catches the signal to stop, and every bug in the code it wraps.

**Ask:** Does this change write a bare except?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Medium | [CODE-12](../code-quality.md) | Any | `E722`, in Ruff |

## PY-02 · Catching every error says why

`except Exception` is written only where handling every error alike is right, with a comment saying why, beside a `noqa` for the check.

**Why:** Catching everything hides the bugs along with the failures it meant to handle.

**Ask:** Does every except Exception in this change say why?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Medium | [CODE-12](../code-quality.md) | Any | `BLE001`, in Ruff |

## PY-03 · No error is caught and ignored

An `except` block never just passes. Where ignoring an error is right, it logs it and says why.

**Why:** An error that's caught and dropped turns a failure into silence.

**Ask:** Does this change catch an error and do nothing with it?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | High | [CODE-11](../code-quality.md) | Any | `S110`, in Ruff |

## PY-04 · No `Any` where a real type exists

`Any` isn't written. Data of unknown shape is `object`, and checked before use.

**Why:** `Any` turns the type checker off for everything it touches.

**Ask:** Does this change write Any?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | Medium | [CODE-14](../code-quality.md) | Any | `ANN401`, in Ruff |

## PY-05 · Every function says its argument types

Every function's arguments have type annotations, so the type checker can check the calls.

**Why:** An unannotated argument is `Any` to the type checker, and every call to it goes unchecked.

**Ask:** Does this change add a function argument without a type?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Low | [CODE-14](../code-quality.md) | Any | `ANN001`, in Ruff |

## PY-06 · Queries are never built from text

SQL is never built by joining or formatting strings. Values go to the driver as parameters.

**Why:** Text put into a query can change what the query does, and read or delete any record.

**Ask:** Does this change build a query from strings?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | Critical | [SEC-07](../security.md) | Any | `S608`, in Ruff |

## PY-07 · No code is built from strings

`eval` isn't used, so no text, least of all text from outside, is ever run as code.

**Why:** A string that reaches eval runs with everything the server can reach.

**Ask:** Does this change use eval?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [SEC-06](../security.md) | Any | `S307`, in Ruff |

## PY-08 · Commands don't go through a shell

`subprocess` runs a command as a list of arguments, never with `shell=True`, so no argument can become another command.

**Why:** With a shell, one argument holding a semicolon runs whatever follows it.

**Ask:** Does this change run a command through a shell?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [SEC-06](../security.md) | Any | `S602`, in Ruff |

## PY-09 · Every request to another service has a timeout

Every HTTP request, such as with `requests`, passes a `timeout`, and its failure is handled.

**Why:** requests waits forever by default, so one slow service holds every request that calls it.

**Ask:** Does every HTTP request in this change pass a timeout?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [REL-01](../reliability.md) | Any | `S113`, in Ruff |

## PY-10 · A function with more than 50 statements prompts a question

A function over 50 statements fails the lint, so someone asks whether it does two things. Where it doesn't, a `noqa` beside it says why.

**Why:** Long functions usually hide a second job, and the second job is what the next change breaks.

**Ask:** Has any function grown past 50 statements, and does each that stays say why?

**Default:** 50 statements. A project changes it in `standards.overrides`, with its reason.

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Low | [CODE-10](../code-quality.md) | Any | `PLR0915`, in Ruff |

## PY-11 · The type checker runs in strict mode

A type checker, such as mypy with `strict = true` or pyright in strict mode, runs on every change and fails the build.

**Why:** Annotations nobody checks drift from the code, and read as a promise nothing keeps.

**Ask:** Does a strict type checker run on every change?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [CODE-14](../code-quality.md) | Any | – |
