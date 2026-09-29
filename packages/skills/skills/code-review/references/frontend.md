# Screens and their data

FE-01 to FE-09. These apply to web, mobile and desktop parts. For other parts, each is `not-applicable`.

## FE-01: server data lives in one cache

**Fail** when data from the server is copied into a screen's own state and goes stale.

**Fail** too when data loads once and never reloads when what it depends on changes, such as a list that ignores a change of account.

## FE-02: derived values are calculated, never stored

**Fail** when a total, count or status that follows from other data is kept in its own state and updated by hand.

## FE-03: global state in one store, the rest local

**Fail** when:

- app-wide state is split across several stores;
- local state is pushed into a global store.

**Fail** too when state in a store is changed in place instead of replaced, so the screen doesn't update.

## FE-04: values aren't passed through layers that don't use them

**Fail** when a value passes through more components that don't use it than the profile allows.

## FE-05: a component fetches data or shows it, not both

**Fail** when a component deep in the tree fetches its own data rather than receiving it.

## FE-06: only screens know about navigation

**Fail** when a component below a screen navigates by itself instead of calling a function it was given.

## FE-07: loading, empty and error are all handled

**Fail** when a screen that waits for data shows only the loaded state, or a spinner that never ends on failure.

## FE-08: error messages say what to do

**Fail** on a bare "Something went wrong", or a raw error shown to the person.

## FE-09: offline is a state, not an error (projects that work offline)

**Fail** when losing the connection loses what the person typed, or shows an error instead of saying they're offline.
