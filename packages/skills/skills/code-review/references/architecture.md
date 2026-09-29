# Where code lives

ARC-01 to ARC-08. Judge the code against the architecture the project declares, from its architecture document and decision records, never against a structure you'd have chosen.

## ARC-01: judged against the project's own architecture

**Pass** when the change follows the declared architecture. When the project declares none, the line is `not-checked`, and the summary suggests writing one.

## ARC-02: one module owns each area

**Fail** when logic for one area of the business is copied into another instead of called.

## ARC-03: modules don't reach into each other's internals

**Fail** when code imports another module's internal files instead of its public surface.

## ARC-04: business rules are plain code

**Fail** when a calculation or validation is mixed with database, network, framework or UI code, so it can't be tested with plain values.

## ARC-05: business logic doesn't know how it's called

**Fail** when business logic returns status codes, reads request objects or raises HTTP errors.

## ARC-06: dependencies point inward

**Fail** when business rules import from features or infrastructure, or one feature imports another.

## ARC-07: data is reached through an interface

**Fail** when a screen or business rule talks to a storage engine or the network directly.

## ARC-08: one managed way to reach the database

**Fail** when code opens its own connection or bypasses the shared database access, and with it transactions and pooling.
