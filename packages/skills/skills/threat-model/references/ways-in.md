# Finding every way in

Where each kind of way in shows in the code. Frameworks are examples; the stack profile from `standards_for_file` names the project's own.

## Routes

- Route definitions and handlers, such as decorators, router files or controllers.
- The API contract, if there is one. A route in the code but not in the contract is a way in nobody reviewed.
- For each route: who can call it. Look for the check that runs first, such as a sign-in dependency or middleware. A route with none is open to anyone.

## Input

- Every form and screen that sends what someone typed.
- Links into an app, such as deep links or universal links: anyone can craft one.
- Query strings and headers the code reads.

## Uploads

- File inputs, multipart handlers, and storage calls.
- Note where the file goes, who can read it back, and whether the server names it.

## Webhooks

- Routes another service calls, such as a payment provider or a messaging service.
- Note whether the caller is verified, for example by a signature, before anything happens.

## Sign-in

- Sign-in, sign-up, password reset, magic links, single sign-on and tokens that last.
- Each is a way to become someone else.

## Live connections

- Sockets, streams and subscriptions. Each event is a way in, not only the connection.

## Outside services

- Every call out: payment, email, messages, maps, analytics, AI models, storage.
- Note what's sent. Personal data sent out is a way for it to leak.

## AI models

- What can reach the model's instructions: what people type, and stored text someone else wrote, such as a review of a shop.
- What the model's output can do: show HTML, call a tool, write to the database, spend money.

## On the device

- What an app or a web page keeps: tokens, personal data, the only copy of someone's work.
- A lost phone and a shared computer are ways in.

## The pipeline

- The build and deploy workflows, the secrets they hold, and who can change them.
- The dependencies they install. A compromised package runs with the app's rights.
