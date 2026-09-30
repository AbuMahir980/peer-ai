# What the model's output can do

AI-01, AI-02, AI-05 and SEC-08. Treat everything a model returns as input from a stranger: it can be wrong, and it can be steered.

## AI-01: a model's output is untrusted input

For each `output`, find where it lands. **Fail** when output reaches any of these without being checked against the shape and values it should have:

- a database write of anything taken from the model's output;
- a query or a shell command;
- code that runs it;
- another service's request.

**Pass** when the output is parsed and checked against the values allowed before it's used.

## SEC-08: never put into a page as HTML

**Fail** when model output reaches a page through `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, a Markdown renderer with HTML on, or a WebView given HTML, without a well-known sanitiser.

## AI-02: a guess is never shown as fact

**Fail** when a model's answer is shown as certain. The most serious case is an answer about safety, health, money or the law, such as whether a bike is safe to ride, shown without saying it's a suggestion and without telling the person to check.

## AI-05: the model does only what it needs, and a person confirms what matters

For each `tool`, and each action the model can trigger in any way:

**Fail** when:

- the model can take an action beyond what the feature needs;
- an action that changes data, moves money or acts on someone's account runs without the person confirming it;
- the model chooses which record to act on, and nothing checks the person may act on that record.

**Pass** when the app shows what the model proposes, and acts only after the person confirms.
