# Records, contracts and AI replies

SEC-01, API-02 and AI-01: serious problems a code review checks item by item, not only in passing. Each gets a coverage line for every item it applies to.

## SEC-01: a record belongs to the caller

For each `route` that reads or changes a record by an id it's given, in the path, the query or the body:

**Pass** when the record is loaded with the caller's id too, or checked against it before it's used, such as "bookings.py:48 loads the booking by its id and the cyclist's id".

**Fail** when a signed-in person can read or change someone else's record by sending another id.

## API-02: the code matches its contract

For each `route` the `contract` describes:

**Pass** when its request and response match the contract field by field: names, types, and which fields are there.

**Fail** when they differ, such as a renamed field, a missing one, or a type the contract doesn't promise. Say which is wrong, the code or the contract, when you can tell.

## AI-01: a model's reply is checked before it's used

For each `call` to an AI model:

**Pass** when each value the code takes from the reply is checked against what's allowed before it's saved, shown or acted on, such as a repair slot checked against the shop's open slots.

**Fail** when a value from the reply is saved, sent to another service, put into a page or acted on as it came.
