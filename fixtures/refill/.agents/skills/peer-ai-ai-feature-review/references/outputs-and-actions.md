# What the model's output can do

AI-01, AI-02, AI-05 and SEC-08. Treat everything a model returns as input from a stranger: it can be wrong, and it can be steered.

## AI-01: a model's output is untrusted input

For each `output`, find where it lands. **Fail** when output reaches any of these without being checked against the shape and values it should have:

- a database write, such as a date, an amount or an id taken from the model;
- a query or a shell command;
- code that runs it;
- another service's request.

**Pass** when the output is parsed and validated first: the date is a real date in the allowed range, and the id is one the person is allowed to act on.

## SEC-08: never put into a page as HTML

**Fail** when model output reaches a page through `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, a Markdown renderer with HTML on, or a WebView given HTML, without a well-known sanitiser.

## AI-02: a guess is never shown as fact

**Fail** when a model's answer is shown as certain. The most serious case is an answer about safety, health, money, the law, or what suits a child, such as "safe for pets" or "suitable for ages 8+", shown without saying it's a suggestion and without telling the person to check.

## AI-05: the model does only what it needs, and a person confirms what matters

For each `tool`, including an action the app takes because the model's reply says so:

**Fail** when:

- the model can take an action beyond what the feature needs;
- an action that changes data, moves money or acts on someone's account runs without the person confirming it;
- the model chooses which record to act on, and nothing checks the person may act on that record.

**Pass** when the app shows what the model proposes, and acts only after the person confirms.
