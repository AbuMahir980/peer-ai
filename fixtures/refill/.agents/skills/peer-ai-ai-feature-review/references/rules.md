# Rules

Generated from @peer-ai/standards. The peer-ai MCP tool `standards_for_file` returns the rules that apply to a file, filtered by the project's stage and traits, with its stack profile's and add-on's rules too. Use this list to understand a rule; use the tool to know which apply.

## Contents

- AI features: AI-01 to AI-08
- Reliability: REL-01
- Security: SEC-08, SEC-11
- Privacy and compliance: PRIV-03, PRIV-04, PRIV-05

## AI features

Features that use AI models.

### AI-01 An AI's output is untrusted input

Output from an AI model is checked and escaped like any outside input before it's shown, stored, or passed to code, a database, a shell or another service.

- Why: What a model says can be steered by what it was given, so its output can carry an attack as easily as a user's input can.
- Ask: Is every AI output in this change checked and escaped before it's used?
- From prototype. Checked by AI review. Severity: high.
- Only for products with: ai-features.
- Source: OWASP Top 10 for LLM Applications 2025, LLM05, Improper Output Handling.

### AI-02 An AI's guess is never shown as fact

An AI's answer is shown as a suggestion, never as fact. Anything about safety, health, money or the law also tells the person to check with someone qualified.

- Why: Models state wrong answers as confidently as right ones, and a wrong answer about whether a plant is safe for a pet can hurt someone.
- Ask: Does this change show any AI answer as fact, or give safety advice without telling the person to check?
- From prototype. Checked by AI review. Severity: high.
- Only for products with: ai-features.
- Source: OWASP Top 10 for LLM Applications 2025, LLM09, Misinformation.

### AI-03 People know what's sent to an AI service, and nothing sensitive goes without need

People are told what's sent to an AI service before it's sent. Personal or sensitive data is sent only when the feature needs it, and removed when it doesn't.

- Why: Data sent to a model provider can be logged, kept or used for training, and people didn't agree to that just by using a feature.
- Ask: Does this change send an AI service anything people haven't been told about, or don't need to send?
- From MVP. Checked by AI review. Severity: high.
- Only for products with: ai-features.
- Source: OWASP Top 10 for LLM Applications 2025, LLM02, Sensitive Information Disclosure.

### AI-04 Content can't change what the model is allowed to do

Instructions to the model and the content it works on are kept apart, and the model's permissions are enforced outside it, so text in a document, email or web page can't change what it's allowed to do.

- Why: A line hidden in a web page can tell a model to ignore its instructions, and the model can't reliably tell instructions from content.
- Ask: Could content the model reads in this change make it do something it shouldn't?
- From MVP. Checked by AI review. Severity: high.
- Only for products with: ai-features.
- Source: OWASP Top 10 for LLM Applications 2025, LLM01, Prompt Injection.

### AI-05 An AI does only what it needs to, and a person confirms what matters

An AI can call only the tools and data its task needs, with the least permission they allow, and anything that moves money, changes data or acts on someone's account needs a person's confirmation.

- Why: A model given broad powers will eventually use them wrongly, whether by mistake or because someone tricked it.
- Ask: Does the AI in this change have more access than its task needs, or act on anything important without confirmation?
- From MVP. Checked by AI review. Severity: high.
- Only for products with: ai-features.
- Source: OWASP Top 10 for LLM Applications 2025, LLM06, Excessive Agency.

### AI-06 Instructions to the model hold no secrets

The instructions given to a model hold no secrets, credentials or rules that only work if nobody sees them.

- Why: People can get a model to repeat its instructions, so anything in them should be safe to read.
- Ask: Do the model's instructions in this change hold anything that would matter if someone read them?
- From prototype. Checked by AI review. Severity: medium.
- Only for products with: ai-features.
- Source: OWASP Top 10 for LLM Applications 2025, LLM07, System Prompt Leakage.

### AI-07 AI calls have limits

Every call to an AI service has a timeout and a size limit, and each person has a spending or usage limit.

- Why: AI calls are slow and paid per use, so one runaway loop or one abusive user can take the feature down or run up a large bill.
- Ask: Does every AI call in this change have a timeout, a size limit and a per-person limit?
- From MVP. Checked by AI review. Severity: medium.
- Only for products with: ai-features.
- Source: OWASP Top 10 for LLM Applications 2025, LLM10, Unbounded Consumption.

### AI-08 An AI feature is tested on fixed examples, attacks included

An AI feature has a set of example inputs with the behaviour expected for each, including attacks such as prompt injection and attempts to make it leak data or go beyond its permissions. They're run before every change to its instructions or its model.

- Why: A small change to a prompt or a model version can quietly break answers that used to be right, and a model that resisted an attack last month may not after an update.
- Ask: Were the AI feature's examples, attacks included, run for this change to its instructions or model?
- From MVP. Checked by AI review. Severity: medium.
- Only for products with: ai-features.
- Source: OWASP Top 10 for LLM Applications 2025, LLM01, Prompt Injection.

## Reliability

Staying up, and failing safely when something underneath fails.

### REL-01 Every call to another service has a timeout and handles failure

Every call to another service or API has a timeout, and a failed or slow response is handled: retried when that's safe, reported when it isn't.

- Why: A call with no timeout waits forever, and one slow provider then ties up every request that depends on it.
- Ask: Does every call to another service in this change have a timeout and handle failure?
- From MVP. Checked by AI review. Severity: medium.

## Security

Keeping people's data and the system itself safe from attack.

### SEC-08 Content from outside is never put into a page as HTML

Content from people or outside services, including text an AI model produced, is shown as text. If it truly must be HTML, it goes through a well-known sanitiser first.

- Why: HTML inserted into a page can run a script in the viewer's browser, with their session.
- Ask: Does this change put any outside content into a page as HTML without a sanitiser?
- From prototype. Checked by a tool. Severity: high.
- Source: OWASP ASVS 5.0, 1.3.1, level 1.
- Source: OWASP ASVS 5.0, 1.2.1, level 1.

### SEC-11 Nothing secret is built into an app or a web page

Anything shipped to a person's device (a web page's code, a mobile app) can be read by anyone, so no key or secret is ever built into it, even from an environment variable at build time. A call that needs a secret goes through your server.

- Why: A key built into an app is extracted within hours of release, and then it's everyone's key.
- Ask: Does this change build any key or secret into code that runs on a person's device?
- From prototype. Checked by AI review. Severity: critical.

## Privacy and compliance

Personal data, and the laws and rules a product must follow.

### PRIV-03 Only what's needed is collected

A feature collects only the personal data it needs, at the precision it needs, and only while it needs it: a rough area rather than an exact location, and location only while searching rather than all the time.

- Why: Data you don't collect can't leak, can't be misused and doesn't need protecting. Collecting only what's needed is also what data protection laws require.
- Ask: Does this change collect more personal data, or more precise data, than it needs?
- From MVP. Checked by AI review. Severity: high.

### PRIV-04 Personal data goes only where people have been told

Personal data is sent only to the services people have been told about, with their consent where the law requires it. Analytics and telemetry are off until the person opts in.

- Why: Sending data to a third party people didn't know about breaks their trust, and in most countries it breaks the law too.
- Ask: Does this change send personal data anywhere people haven't been told about?
- From MVP. Checked by AI review. Severity: high.
- Source: OWASP ASVS 5.0, 14.2.3, level 2.

### PRIV-05 Hidden details are removed from files before they leave

Before a photo or file is shared or sent to another service, details the person may not know it carries, such as where a photo was taken, are removed, unless the person chose to keep them.

- Why: A photo's location can reveal where someone lives, and most people have no idea it's there.
- Ask: Does this change send or share files with hidden details, such as location, still in them?
- From MVP. Checked by AI review. Severity: high.
- Source: OWASP ASVS 5.0, 14.2.8, level 3.
