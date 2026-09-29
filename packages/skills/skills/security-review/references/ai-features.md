# Features that use AI models

AI-01, AI-03, AI-04 and AI-06, for projects with the ai-features trait. For others, each is `not-applicable`.

## AI-01: a model's output is untrusted input

**Fail** when output from a model reaches any of these unchecked or unescaped:

- a page, as HTML (SEC-08 too);
- a database query;
- a shell;
- code that runs it;
- another service's request.

## AI-03: people know what's sent to an AI service

**Fail** when:

- personal or sensitive data goes to a model provider without the person being told first;
- more is sent than the feature needs: personal details the task doesn't use.

## AI-04: content can't change what the model may do

**Fail** when:

- text the model reads, such as a document, email, web page or a user's message, is joined into its instructions;
- the model's own output decides what it's allowed to do, with no check outside it. A tool call that deletes or pays because the model said so is the classic case.

## AI-06: the model's instructions hold no secrets

**Fail** when the instructions given to a model contain any of:

- a key;
- a password;
- a private address;
- a rule that works only if nobody reads it.

People can get a model to repeat its instructions.
