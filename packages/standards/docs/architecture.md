# Architecture

How a system is divided, and which way its parts depend on each other. These hold for any architecture: a modular monolith, microservices, a mobile app or a library. A folder layout is a stack profile's default, never a core rule.

## ARC-01 · Code is judged against the project's own architecture

Code is judged against the architecture the project has declared (its tracks, each track's architecture and its decision records), never against a structure from somewhere else.

**Why:** A review that expects a layout the project never chose buries the real problems under false ones.

**Ask:** Does this review check the code against the architecture the project declared?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Medium | Always | – |

## ARC-02 · One module owns each area

Each area of the business is owned by one module. Another area that needs its logic calls it; it never copies it.

**Why:** Two implementations of one business rule will disagree, and nobody will know which is right.

**Ask:** Does this change put its logic in the module that owns that area?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## ARC-03 · Modules don't reach into each other's internals

A module has a deliberate public surface, and nothing uses its internals. Something several modules need is moved somewhere shared and named honestly.

**Why:** Marking something internal tells the next person they may change it freely. Using it from elsewhere breaks that promise, and the break shows up later as someone else's bug.

**Ask:** Does anything in this change use another module's internals?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## ARC-04 · Business rules are plain code

Business rules, calculations and validation live in plain code, with no database, network, framework or user interface in it, so they can be tested with plain values.

**Why:** Rules tangled with a framework can only be tested slowly and partly. Plain rules can be tested exhaustively, which is where the hardest rules need it most.

**Ask:** Could the business logic in this change be tested without a database, a network or a user interface?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## ARC-05 · Business logic doesn't know how it's called

Business logic never deals in HTTP: no status codes, no request objects, no HTTP errors. It raises its own errors, and the layer that received the request translates them.

**Why:** Logic that knows about HTTP can't be reused by a background job, a script or a different interface.

**Ask:** Does any business logic in this change refer to HTTP?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## ARC-06 · Dependencies point inward

Code depends toward the business rules, never away from them, and features don't depend on each other.

**Why:** Without a direction, every part ends up coupled to every other, and nothing can change on its own.

**Ask:** Does any dependency in this change point outward, or from one feature to another?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## ARC-07 · Data is reached through an interface

Screens and business logic reach data through an interface, never a storage engine or the network directly.

**Why:** Then changing where data lives, from local storage to an API or from one API to another, touches one place.

**Ask:** Does anything outside the data layer talk to storage or the network directly?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## ARC-08 · There is one managed way to reach the database

The database is reached one managed way, so transactions and connection pooling can't be bypassed.

**Why:** Code that opens its own connection escapes the transaction it should be part of, and exhausts the connection pool under load.

**Ask:** Does anything in this change open its own database connection?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |
