# API design

How services and clients agree on what they send each other.

## API-01 · Requests and responses are typed schemas

Every request and response body is a typed schema, not a loose map or dictionary. The schema is the contract.

**Why:** A loose response becomes a loose client type, in every app that uses the API, at once.

**Ask:** Is every request and response body in this change a typed schema?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## API-02 · The contract has one source of truth

The API's contract has one source of truth, whether it's generated from the code's schemas or written by hand, and every client works from it.

**Why:** Two descriptions of one API disagree, and the client finds out in production.

**Ask:** Does this change keep the API contract's one source of truth up to date?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |

## API-03 · Client types come from the contract

Client code gets its API types from the contract, never by writing them by hand, and CI fails if they fall behind it.

**Why:** Hand-written types are a copy of the contract that silently goes out of date.

**Ask:** Does this change write any API type by hand instead of generating it from the contract?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## API-04 · Errors have one shape

Every error response from the API has the same shape.

**Why:** A client that has to handle four error formats will handle three of them.

**Ask:** Does every error in this change use the API's one error shape?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## API-05 · Lists have one shape

Every list response has the same shape, everywhere in the API. The profile gives a default.

**Why:** A client can't write one list component against four conventions.

**Ask:** Does every list in this change use the API's one list shape?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |

## API-06 · Changing a field breaks clients: add, migrate, then remove

Adding a field is safe. Removing, renaming or retyping one breaks clients, so it's done in steps: add the new one, move every client across, then remove the old one.

**Why:** Clients aren't updated at the same moment as the server, and some, like installed phone apps, are never updated at all.

**Ask:** Does this change remove, rename or retype a field that clients may still use?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |

## API-07 · Every list is paged

Every endpoint that returns a list returns it a page at a time. None returns everything.

**Why:** An endpoint that returns everything passes every test on sample data, then falls over on real data.

**Ask:** Does every list endpoint in this change return pages?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## API-08 · Page sizes come from one place

The default and largest page sizes come from one shared place, not each endpoint's own numbers.

**Why:** "What's the largest page a client can ask for?" should have one answer, especially under load.

**Ask:** Does this change set a page size anywhere other than the shared place?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |
