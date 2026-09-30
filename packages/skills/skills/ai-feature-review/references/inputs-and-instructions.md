# What goes into the model

AI-03, AI-04, AI-06, SEC-11, and PRIV-03 to PRIV-05.

## AI-04: content can't change what the model may do

Look at everything joined into the model's instructions. **Fail** when text the project doesn't control goes into the instructions, rather than being passed as clearly marked content. That text includes:

- what a person typed;
- a document, email or web page;
- data from another company's service;
- a review or comment.

**Fail** too when the model's permissions depend only on the instructions, with no check outside the model. Text that says "ignore previous instructions" must not change what the model may do.

## AI-06: instructions hold no secrets

**Fail** when the instructions contain any of:

- a key or password;
- an internal address;
- a rule that works only if nobody reads it.

People can get a model to repeat its instructions.

## AI-03: people know what's sent, and nothing sensitive goes without need

For each `input`, ask what the feature needs.

**Fail** when:

- personal or sensitive data goes to the model provider without the person being told first;
- more is sent than the feature needs: personal details the task doesn't use.

## SEC-11: nothing secret built into what ships

**Fail** when a model provider's key is built into a web page or a phone app, including through an environment variable with a public prefix.

**Pass** when calls go through the project's server, which holds the key.

## PRIV-03: only what's needed is collected

**Fail** when data is collected for the AI feature at a higher precision than it needs, such as an exact location where a rough area would do.

## PRIV-04: personal data goes only where people have been told

**Fail** when personal data reaches the model provider, or its analytics, without the notice or consent the law needs.

## PRIV-05: hidden details removed before files leave

**Fail** when a photo or file is sent to a model with details the person may not know it carries, such as where a photo was taken.
