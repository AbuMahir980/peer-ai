# Serious problems, item by item

SEC-01, SEC-05, SEC-07, SEC-08, SEC-10, SEC-15, PRIV-01, API-02 and AI-01: the serious problems a code review checks item by item, not only in passing. Each gets a coverage line for every item it applies to, and a pass quotes the code it read.

## SEC-01: a record belongs to the caller

For each `route` that reads or changes a record by an id it's given, in the path, the query or the body:

**Pass** when the record is loaded with the caller's id too, or checked against it before it's used, such as "bookings.py:48 loads the booking by its id and the cyclist's id".

**Fail** when a signed-in person can read or change someone else's record by sending another id.

## API-02: the code matches its contract

For each `route` the `contract` describes:

**Pass** when its request and response match the contract field by field: names, types, and which fields are there. The evidence quotes the fields as the code writes them beside the contract's, such as `{"id", "status", "mechanic_name"}` at bookings.py:52 against `id, status, mechanic_name`: a match you didn't compare isn't a pass.

Names match letter for letter: `mechanicName` and `mechanic_name` are two different fields to a client built from the contract, unless the code converts every name in one place, such as a serializer setting.

**Fail** when they differ, such as a renamed field, a missing one, or a type the contract doesn't promise. Say which is wrong, the code or the contract, when you can tell.

## SEC-05: the server decides what it knows

For each `route` that changes something:

**Pass** when every value is checked on the server, and a value the server knows or must decide, such as a price, a total or an owner, is worked out there.

**Fail** when a request body is saved as it came, or a price, total or owner is taken from the request.

## SEC-07: no query or command built from input

For each query, shell command and file path the code builds:

**Pass** when input goes in only as a parameter, never pasted into the text.

**Fail** when input is pasted into a query, a command or a path, even through a helper.

## SEC-08: outside content is never HTML

For each `component` that shows text from a person, another service or an AI model:

**Pass** when it's shown as text, or cleaned by a sanitiser before it's HTML.

**Fail** when it's put into the page as HTML, such as through `dangerouslySetInnerHTML` or `innerHTML`.

## SEC-10: no secret in the code

**Fail** on a key, password, token or signing secret written in any file in scope, a default value included. **Pass** when every secret is read from the environment or a secret store.

## SEC-15: everything travels encrypted

For each address the code calls or serves on, in production settings:

**Fail** on plain HTTP, or certificate checks switched off. **Pass** when every address is HTTPS with checks on.

## PRIV-01: logs hold no personal data

For each log call in a `route`, `job` or `call`:

**Pass** when it writes named, safe fields.

**Fail** when it writes a request body, a whole record, a token, or a personal field such as a name, phone number or address.

## AI-01: a model's reply is checked before it's used

For each `call` to an AI model:

**Pass** when each value the code takes from the reply is checked against what's allowed before it's saved, shown or acted on, such as a repair slot checked against the shop's open slots.

**Fail** when a value from the reply is saved, sent to another service, put into a page or acted on as it came.
