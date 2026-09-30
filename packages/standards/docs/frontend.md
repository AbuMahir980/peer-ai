# Frontend

How screens get, hold and show data.

## FE-01 · Data from the server lives in one cache, not in screen state

Data that came from a server or a stored source is read from one shared cache, never copied into a screen's own state.

**Why:** A copy goes stale, sends duplicate requests, and races with the original when someone moves quickly between screens.

**Ask:** Does this change copy server data into a screen's own state?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## FE-02 · Values that follow from other data are calculated, never stored

Totals, counts and statuses that follow from other data are calculated when they're read, never stored alongside it.

**Why:** A stored copy of a calculated value is how two screens come to disagree.

**Ask:** Does this change store a value that could be calculated from other data?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Medium | Always | – |

## FE-03 · Truly global state lives in one store; everything else stays local

State that the whole app shares lives in one store. Everything else stays in the component or feature that uses it.

**Why:** Global state is shared by everything, so every piece of it is a way for one part of the app to break another.

**Ask:** Is any state in this change made global when only one part of the app uses it?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |

## FE-04 · Values aren't passed down through layers that don't use them

A value is passed through only a few components that don't use it; the profile sets how many. Past that, it's fixed with composition first, then shared context, then a store.

**Why:** "No prop drilling" can't be enforced because nobody agrees where it starts. A number can be counted in review.

**Ask:** Does any value in this change pass through more components that don't use it than the profile allows?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |

## FE-05 · A component fetches data or shows it, not both

Data is fetched where a screen begins. Everything below it receives what it needs and only shows it.

**Why:** A component that only shows what it's given can be tested and reused without a network.

**Ask:** Does any component in this change both fetch data and show it?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## FE-06 · Only screens know about navigation

Only a screen knows how to move to another screen. Components below it receive what to do as a function.

**Why:** A component that navigates on its own can't be reused anywhere the route is different.

**Ask:** Does any component in this change, other than a screen, navigate?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Low | Always | – |

## FE-07 · Every screen that waits handles loading, empty and error

Every screen or component that waits for data shows loading, empty and error states explicitly. An endless spinner is a bug.

**Why:** The happy path is the only one that gets built by default, and people meet the others first on a bad connection.

**Ask:** Does everything in this change that waits for data handle loading, empty and error?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## FE-08 · An error message says what happened and what to do next

An error message tells the person what went wrong and what they can do about it. A bare "Something went wrong" isn't enough.

**Why:** A message that explains nothing leaves the person stuck, and turns into a support request.

**Ask:** Does every error message in this change say what happened and what to do next?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [WCAG 2.2, 3.3.1, level A](https://www.w3.org/TR/WCAG22/#error-identification); [WCAG 2.2, 3.3.3, level AA](https://www.w3.org/TR/WCAG22/#error-suggestion) |

## FE-09 · Offline is a state, not an error

With no connection, the app says so, keeps what the person did, and catches up when it's back online. Nothing typed is lost.

**Why:** People lose connection in lifts, on trains and in basements, and losing their work there teaches them not to trust the app.

**Ask:** Does this change keep working, and keep what the person did, with no connection?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `offline` | – |
