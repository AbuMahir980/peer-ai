# What comes in and what goes out

SEC-05 to SEC-09, and SEC-22.

## SEC-05: validated on the server

**Pass** when every request that changes something is checked on the server against a schema or explicit rules: types, required fields, lengths, ranges and allowed values.

**Fail** on:

- a request with no server-side check, even when the app or browser checks it;
- a whole request body bound straight onto a model, which lets a caller set fields such as `role`, `ownerId` or `price`;
- a check that runs after the data has been used.
- a value the server already knows, or must decide, taken from the request instead, such as the price of a repair or the total to charge.

Shell commands, file paths and URLs built from input also fail SEC-05 unless the input is checked against an allow-list. These are command injection, path traversal, and a server made to fetch a URL an attacker chose.

## SEC-06: outside data checked before it's trusted

Data crossing a boundary is parsed against the shape it should have before it's used. That includes:

- an API's response;
- a webhook's payload, after verifying its signature;
- a queued message;
- an imported file;
- data read back from storage the app doesn't solely control.

**Fail** when:

- such data is used as-is;
- a type is asserted without checking, such as a cast instead of a parse;
- a webhook is accepted without verifying its signature.

## SEC-07: parameterised queries

**Fail** when a value reaches a query by pasting it into the text. That includes:

- string concatenation;
- template literals;
- format strings;
- raw-query methods fed with interpolated text.

**Fail** too on a document database query built from a request body without checking its operators, such as a client sending `{ "$ne": null }` as a password.

**Pass** evidence: the query uses parameters or a query builder, and CI runs a tool that catches pasted queries. Name the tool's step.

## SEC-08: outside content never inserted as HTML

**Fail** when text from people, from outside services or from an AI model reaches the page as HTML, through any of:

- `innerHTML` or `dangerouslySetInnerHTML`;
- `v-html`;
- an unescaped template, such as `|safe` or `{!! !!}`;
- a Markdown renderer with HTML switched on;
- a WebView given HTML.

The one exception is HTML that first goes through a well-known sanitiser, configured to allow only what's needed.

## SEC-09: no internal detail reaches the client

**Fail** when a client can see any of:

- a stack trace;
- a file path;
- a query or database error;
- a key;
- a framework's debug page.

**Fail** too when a debug mode is on in the production configuration.

**Pass** when errors are generic and actionable, the detail goes to the log, and the client gets an id to quote.

## SEC-22: nothing sensitive in a URL

**Fail** when tokens, keys or personal data travel in a path or query string. That includes redirects that carry a token onwards.

The accepted exception is a one-time link sent by email, such as a password reset, when its token is single-use and expires soon. Say so in the evidence.
