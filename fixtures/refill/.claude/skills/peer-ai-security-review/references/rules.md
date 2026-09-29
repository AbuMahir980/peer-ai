# Rules

Generated from @peer-ai/standards. The peer-ai MCP tool `standards_for_file` returns the rules that apply to a file, filtered by the project's stage and traits, with its stack profile's and add-on's rules too. Use this list to understand a rule; use the tool to know which apply.

## Contents

- Security: SEC-01 to SEC-27
- Privacy and compliance: PRIV-01 to PRIV-06
- Mobile: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05
- Reliability: REL-03, REL-04, REL-05
- Testing: TEST-08
- Delivery: DEL-07
- AI features: AI-01, AI-03, AI-04, AI-06

## Security

Keeping people's data and the system itself safe from attack.

### SEC-01 Permission is checked per record, not per role

Being signed in, or holding a role, is not permission to use *this* record. Every request that names a record proves the caller may use that record. Review every endpoint that takes an id, not a sample.

- Why: Changing an id in a URL is the easiest attack there is, and it leaks one customer's data to another.
- Ask: Does every endpoint that takes an id check that the caller may use that record?
- From MVP. Checked by AI review. Severity: high.
- Source: OWASP ASVS 5.0, 8.2.2, level 1.

### SEC-02 Each action checks the caller's role allows it

Every action checks that the caller's role allows it, and different roles have different powers: releasing money needs the specific role for it, not just any staff role.

- Why: When every staff role can do everything, one compromised support account can do what only finance should.
- Ask: Does every action in this change check for the specific role it needs?
- From MVP. Checked by AI review. Severity: high.
- Source: OWASP ASVS 5.0, 8.2.1, level 1.

### SEC-03 Permission is decided on the server, on every request

Permission checks happen on the server on every request, never based on anything the client can change, and never carried over from an earlier request.

- Why: Anything the client decides, an attacker can change: hiding a button isn't a permission check.
- Ask: Is every permission in this change decided on the server, from data the client can't change?
- From MVP. Checked by AI review. Severity: high.
- Source: OWASP ASVS 5.0, 8.3.1, level 1.

### SEC-04 A session is for one app, and the app says which

Where one backend serves several apps or tenants, each session is issued for exactly one of them and accepted only there. The app always says which one it is signing in to; the server never guesses.

- Why: Guessing prefers the most powerful option, so a person with two roles can end up in the wrong app with the wrong powers, and the failure surfaces much later as confusing permission errors.
- Ask: Is every session in this change tied to one app or tenant, and does the app say which?
- From MVP. Checked by AI review. Severity: high.
- Only for products with: several-audiences.
- Source: OWASP ASVS 5.0, 9.2.3, level 2.
- Source: OWASP ASVS 5.0, 8.4.1, level 2.

### SEC-05 Input is validated on the server

Every request that changes something is validated on the server against what's allowed. Checks in the app or the browser are for convenience, never a control.

- Why: Anyone can send a request without using your app, so a check that only runs in the app doesn't run at all for an attacker.
- Ask: Is every input in this change validated on the server?
- From prototype. Checked by AI review. Severity: high.
- Source: OWASP ASVS 5.0, 2.2.2, level 1.
- Source: OWASP ASVS 5.0, 2.2.1, level 1.

### SEC-06 Data from outside is checked before it's trusted

Data that crosses a boundary (an API response, stored data, an imported file, a message from another service) is checked against the shape it should have, never just assumed to have it.

- Why: Code that assumes the shape of outside data breaks, or worse carries on with wrong data, the first time that data is different.
- Ask: Is every piece of outside data in this change checked before it's used?
- From MVP. Checked by AI review. Severity: medium.
- Source: OWASP ASVS 5.0, 2.2.1, level 1.

### SEC-07 Database queries are parameterised

Database queries never paste values into the query text. They use parameters or a query builder, so a value can never change what the query does.

- Why: A value pasted into a query can rewrite it: that's SQL injection, which can read or delete a whole database.
- Ask: Does any query in this change build its text from values?
- From prototype. Checked by a tool. Severity: critical.
- Source: OWASP ASVS 5.0, 1.2.4, level 1.

### SEC-08 Content from outside is never put into a page as HTML

Content from people or outside services, including text an AI model produced, is shown as text. If it truly must be HTML, it goes through a well-known sanitiser first.

- Why: HTML inserted into a page can run a script in the viewer's browser, with their session.
- Ask: Does this change put any outside content into a page as HTML without a sanitiser?
- From prototype. Checked by a tool. Severity: high.
- Source: OWASP ASVS 5.0, 1.3.1, level 1.
- Source: OWASP ASVS 5.0, 1.2.1, level 1.

### SEC-09 No internal detail reaches the client

Errors shown to the client are generic and actionable: no stack traces, file paths, queries or keys. The detail goes to the log, with an id the client can quote. Debug modes are off in production.

- Why: Internal detail is a map for an attacker: it shows what's running, where, and how it fails.
- Ask: Could any error in this change reveal internal detail to the client?
- From MVP. Checked by AI review. Severity: medium.
- Source: OWASP ASVS 5.0, 16.5.1, level 2.
- Source: OWASP ASVS 5.0, 13.4.2, level 2.

### SEC-10 No secret in code, ever

Keys, passwords and tokens never live in code or in the repository. They come from a secrets manager or the environment.

- Why: A secret in a repository is readable by everyone who can ever read the repository, including from its history after the file is deleted.
- Ask: Does this change put a key, password or token in code or the repository?
- From prototype. Checked by a tool. Severity: critical.
- Source: OWASP ASVS 5.0, 13.3.1, level 2.

### SEC-11 Nothing secret is built into an app or a web page

Anything shipped to a person's device (a web page's code, a mobile app) can be read by anyone, so no key or secret is ever built into it, even from an environment variable at build time. A call that needs a secret goes through your server.

- Why: A key built into an app is extracted within hours of release, and then it's everyone's key.
- Ask: Does this change build any key or secret into code that runs on a person's device?
- From prototype. Checked by AI review. Severity: critical.

### SEC-12 Sign-in is protected against guessing

Sign-in, password reset, two-factor and one-time codes are rate limited, so passwords and codes can't be guessed at speed.

- Why: With unlimited attempts, a leaked list of passwords from another site opens accounts on yours.
- Ask: Is every sign-in, reset and code endpoint in this change rate limited?
- From MVP. Checked by AI review. Severity: high.
- Source: OWASP ASVS 5.0, 6.3.1, level 1.

### SEC-13 Rate limits are named policies in one place

Rate limits are defined as named policies in one place, not numbers scattered through the code.

- Why: Scattered limits drift apart, and nobody can answer "what are our limits?" when an attack is happening.
- Ask: Does this change add a rate limit anywhere other than the shared policies?
- From production. Checked by AI review. Severity: low.

### SEC-14 Sessions end

Sessions expire after a period of inactivity and after a maximum lifetime. Signing out ends the session on the server, not just in the app, and disabling an account ends all its sessions.

- Why: A session that never ends turns one stolen token, or one shared computer, into permanent access.
- Ask: In this change, can a session outlive sign-out, account removal or its maximum lifetime?
- From MVP. Checked by AI review. Severity: medium.
- Source: OWASP ASVS 5.0, 7.4.1, level 1.
- Source: OWASP ASVS 5.0, 7.4.2, level 1.
- Source: OWASP ASVS 5.0, 7.3.2, level 2.

### SEC-15 Everything travels encrypted

All traffic between apps and services uses TLS, never falls back to an unencrypted connection, and no platform setting allows unencrypted traffic.

- Why: Unencrypted traffic can be read and changed by anyone on the same network, such as public Wi-Fi.
- Ask: Does anything in this change send or allow traffic without TLS?
- From MVP. Checked by AI review. Severity: high.
- Source: OWASP ASVS 5.0, 12.2.1, level 1.
- Source: OWASP MASVS 2.1.0, MASVS-NETWORK-1.

### SEC-16 Which websites may call the API is a fixed list

The websites allowed to call the API from a browser are a fixed list. The API never echoes back whatever origin asked, least of all when requests carry credentials.

- Why: An API that allows any origin with credentials lets any website act as a signed-in visitor.
- Ask: Is every allowed origin in this change on a fixed list?
- From MVP. Checked by AI review. Severity: medium.
- Source: OWASP ASVS 5.0, 3.4.2, level 1.

### SEC-17 Web responses set their security headers

Web responses set Strict-Transport-Security, so browsers always use HTTPS, and a Content-Security-Policy, so the browser runs only trusted scripts.

- Why: These headers stop whole classes of attack in the browser, for the cost of a line of configuration.
- Ask: Do the web responses in this change set Strict-Transport-Security and a Content-Security-Policy?
- From MVP. Checked by a tool. Severity: medium.
- Source: OWASP ASVS 5.0, 3.4.1, level 1.
- Source: OWASP ASVS 5.0, 3.4.3, level 2.

### SEC-18 The server names stored files

Stored files get names and paths the server makes. A name supplied by the client is never used as a path.

- Why: A client-supplied name like `../../config` can read or overwrite files it should never reach.
- Ask: Does this change use any client-supplied name as a storage path?
- From MVP. Checked by AI review. Severity: high.
- Only for products with: uploads.
- Source: OWASP ASVS 5.0, 5.3.2, level 1.

### SEC-19 An upload's content and size are checked

An uploaded file's content is checked to be the type it claims, not just its extension, and its size is limited.

- Why: A renamed file slips past an extension check, and an unlimited upload is an easy way to take a service down.
- Ask: Does this change check an upload's content and size, not just its extension?
- From MVP. Checked by AI review. Severity: medium.
- Only for products with: uploads.
- Source: OWASP ASVS 5.0, 5.2.2, level 1.
- Source: OWASP ASVS 5.0, 5.2.1, level 1.

### SEC-20 Private files are shared through short-lived links

Private files are served through signed links that expire soon, and every access is recorded.

- Why: A permanent link to a private file stays valid after it's forwarded, leaked or no longer allowed.
- Ask: Are the private files in this change served through expiring links, with access recorded?
- From production. Checked by AI review. Severity: medium.
- Only for products with: uploads.

### SEC-21 Every live event is authorised, not just the connection

A live subscription checks permission for every event it sends, not once when it connects, and events go only to the people they're for.

- Why: Permissions change while a connection stays open, and a connection authorised once keeps receiving what it's no longer allowed to see.
- Ask: Does every event in this change check permission, and reach only the people it's for?
- From MVP. Checked by AI review. Severity: high.
- Only for products with: real-time.

### SEC-22 Nothing sensitive goes in a URL

Tokens, keys and personal data never go in a URL or its query string. They travel in the request body or headers.

- Why: URLs are kept in server logs, browser history and the referrer sent to other sites, long after the request.
- Ask: Does this change put a token, key or personal data in a URL?
- From prototype. Checked by AI review. Severity: medium.
- Source: OWASP ASVS 5.0, 14.2.1, level 1.

### SEC-23 Only modern TLS, with strong ciphers

Only current TLS versions are switched on (TLS 1.2 and 1.3, with 1.3 preferred), only recommended cipher suites are allowed, strongest first, and public services use publicly trusted certificates. On a hosting platform that manages TLS, its settings are checked rather than assumed.

- Why: Old TLS versions and weak ciphers have known breaks, so traffic that uses them can be read or changed even though it's encrypted.
- Ask: Does this change switch on an old TLS version, a weak cipher or a certificate that isn't publicly trusted?
- From MVP. Checked by a tool. Severity: medium.
- Source: OWASP ASVS 5.0, 12.1.1, level 1.
- Source: OWASP ASVS 5.0, 12.1.2, level 2.
- Source: OWASP ASVS 5.0, 12.2.2, level 1.

### SEC-24 Security events are logged

Sign-ins, failed sign-ins, refused permission checks and attempts to get past a security control, such as input that fails validation or a hit on a rate limit, are logged with who, what and when, but never the password, token or personal data involved.

- Why: You can't stop or recover from an attack you can't see. These logs are how an attack gets noticed, and how anyone works out afterwards what it reached.
- Ask: Does this change add a sign-in, permission check or security control that refuses someone without logging it?
- From MVP. Checked by AI review. Severity: medium.
- Source: OWASP ASVS 5.0, 16.3.1, level 2.
- Source: OWASP ASVS 5.0, 16.3.2, level 2.
- Source: OWASP ASVS 5.0, 16.3.3, level 2.

### SEC-25 The threat model changes when the ways in change

When a change adds a new way into the system, such as an endpoint, an upload, a webhook, a sign-in method or an outside service, the same change updates the threat model: what could go wrong through it, and what stops it.

- Why: A threat model written once describes the system as it was. Attacks come through the parts added since.
- Ask: Does this change add a way into the system that the threat model doesn't cover yet?
- From MVP. Checked by AI review. Severity: medium.

### SEC-26 Every secret can be replaced quickly

A list names each of the project's secrets, where it lives and how to replace it. Each can be replaced without changing code, and each is replaced on a schedule and at once if it may have leaked.

- Why: A leaked key keeps working until it's replaced. Deleting it from wherever it leaked doesn't stop anyone who already copied it.
- Ask: Can every secret this change adds be replaced without changing code, and is it on the list?
- From production. Checked by AI review. Severity: medium.
- Source: OWASP ASVS 5.0, 13.1.4, level 3.
- Source: OWASP ASVS 5.0, 13.3.4, level 3.

### SEC-27 Secret scanning runs on every change

A secret scanner checks every change before it merges, and the repository's history once, and fails the build when it finds a secret. It's confirmed to have actually run.

- Why: Secrets slip in by accident: a key pasted in to test something, an .env file added by mistake. A scanner catches them before they spread, and a crashed scanner reports the same "nothing found" as a clean one. A missing scanner is a gap in the safety net, not a leak, so it ranks below a secret actually in the code (SEC-10).
- Ask: Does every change pass a secret scan that fails the build when it finds a secret?
- From MVP. Checked by a tool. Severity: medium.

## Privacy and compliance

Personal data, and the laws and rules a product must follow.

### PRIV-01 Logs never hold secrets, tokens or personal data

Passwords, tokens, keys, payment details and personal data are never written to logs. A redaction filter in the logging layer removes them, and it can't be bypassed.

- Why: Logs are copied, shipped and kept far more widely than the data they came from, and a password in a log is a password everyone with log access has.
- Ask: Could anything in this change write a secret or personal data to a log?
- From prototype. Checked by a tool. Severity: high.
- Source: OWASP ASVS 5.0, 16.2.5, level 2.

### PRIV-02 No real personal data in the repository

Fixtures, seed data, screenshots, tests and examples use invented data. No real person's data goes into the repository.

- Why: Everything in a repository is copied to every machine that clones it, forever.
- Ask: Does this change add any real person's data to the repository?
- From prototype. Checked by AI review. Severity: high.

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

### PRIV-06 Personal data is kept only as long as it's needed

Each kind of personal data has a set time it's kept, such as location from a live stream, and a scheduled job deletes it when that time is up.

- Why: Data kept forever is data that can leak forever, and "we'll delete it later" never happens without a job that does it.
- Ask: Does the personal data in this change have a set time it's kept, and a job that deletes it?
- From production. Checked by AI review. Severity: medium.
- Source: OWASP ASVS 5.0, 14.2.7, level 3.

## Mobile

What phone apps need beyond the frontend rules.

### MOB-01 Sensitive data on the phone is kept in secure storage

Session tokens, keys and other sensitive data on the phone are kept in the platform's secure storage, such as the iOS Keychain or the Android Keystore, never in ordinary app storage.

- Why: Ordinary app storage can be read from a backup, a rooted phone or another app's exploit. Secure storage is encrypted and tied to the device.
- Ask: Does this change keep any token, key or sensitive data in ordinary storage on the phone?
- From MVP. Checked by AI review. Severity: high.
- Source: OWASP MASVS 2.1.0, MASVS-STORAGE-1.

### MOB-02 Sensitive data doesn't leak from the phone

Sensitive data doesn't leak through the device's logs, backups, clipboard, keyboard suggestions or the screenshot shown in the app switcher.

- Why: Each of these is read by something other than your app, and some of them are copied off the phone.
- Ask: Could sensitive data in this change leak through logs, backups, the clipboard, the keyboard or the app switcher?
- From MVP. Checked by AI review. Severity: medium.
- Source: OWASP MASVS 2.1.0, MASVS-STORAGE-2.

### MOB-03 An in-app browser opens only pages you trust

An in-app browser (a WebView) loads only the app's own pages or ones on an allow-list. JavaScript and bridges to the app's code are switched on only where needed, and a link from outside, such as a QR code or a deep link, is checked before it's opened.

- Why: A WebView that opens any page runs an attacker's page inside your app, with whatever access the app gives it.
- Ask: Can any in-app browser in this change open a page that isn't trusted?
- From MVP. Checked by AI review. Severity: high.
- Source: OWASP MASVS 2.1.0, MASVS-PLATFORM-2.

### MOB-04 Links into the app are untrusted input

Anything that arrives from outside the app, through a deep link, a notification or another app, is validated like any other untrusted input before it's used.

- Why: Anyone can craft a link that opens your app, so a deep link is a door anyone can knock on.
- Ask: Is everything that reaches this change through a link, notification or another app validated?
- From MVP. Checked by AI review. Severity: medium.
- Source: OWASP MASVS 2.1.0, MASVS-CODE-4.

### MOB-05 Permissions are asked for when needed, at the least level

The app asks for each permission when the feature that needs it is used, says why, and asks for the least it can, such as location while the app is in use rather than all the time.

- Why: A permission asked for up front, or at a higher level than needed, is refused by careful people, rejected by app stores, and a privacy risk when granted.
- Ask: Does this change ask for a permission earlier, or at a higher level, than the feature needs?
- From MVP. Checked by AI review. Severity: high.
- Source: OWASP MASVS 2.1.0, MASVS-PRIVACY-1.
- Source: OWASP MASVS 2.1.0, MASVS-PRIVACY-3.

## Reliability

Staying up, and failing safely when something underneath fails.

### REL-03 Rate limiting never switches off

If the rate limiter's shared store is down, it falls back to a limit on each server and raises an alert. For sign-in, password reset, two-factor and one-time codes, the fallback is at least as strict as normal. Limiting is never simply switched off.

- Why: Refusing every request would turn a cache outage into a total outage, and allowing unlimited sign-in attempts would open a window for guessing passwords.
- Ask: If the rate limiter's store fails, does this change still limit requests, as strictly for sign-in?
- From production. Checked by AI review. Severity: medium.

### REL-04 Configuration fails closed

An unrecognised environment name is treated as production, and one function decides which environment is running.

- Why: A typo in an environment name must never switch production's safeguards off.
- Ask: Does this change decide the environment anywhere other than the one function, or treat an unknown one as safe?
- From MVP. Checked by AI review. Severity: high.

### REL-05 Demo shortcuts can't run in production

Demo passwords, seed shortcuts and sandbox providers are refused when the app starts in production.

- Why: A convenience left switched on in production is a back door.
- Ask: Could any demo or test shortcut in this change run in production?
- From production. Checked by a tool. Severity: high.

## Testing

What's tested, and how tests stay trustworthy.

### TEST-08 Security-sensitive code has abuse tests

Code that handles sign-in, permissions, money, uploads or input that reaches a database has tests that attack it: injection attempts, other people's ids, missing, expired or tampered tokens, oversized input and going past rate limits. Each test checks the attack is refused. A fixed vulnerability gets a test that repeats the attack. The tests run against the project's own app, never a live system.

- Why: Security holes don't show up in tests that only send what a well-behaved client would send, and a fixed hole with no test can quietly open again.
- Ask: Does the security-sensitive code in this change have tests that attack it and check the attack is refused?
- From MVP. Checked by AI review. Severity: medium.

## Delivery

Dependencies, pipelines, and how changes reach people.

### DEL-07 Only what's needed ships to production

Production gets only what the product needs to run: no test code, sample code, development tools or debug features.

- Why: Every extra piece in production is something an attacker can find and use.
- Ask: Does this change ship test, sample or development code to production?
- From production. Checked by AI review. Severity: medium.
- Source: OWASP ASVS 5.0, 15.2.3, level 2.

## AI features

Features that use AI models.

### AI-01 An AI's output is untrusted input

Output from an AI model is checked and escaped like any outside input before it's shown, stored, or passed to code, a database, a shell or another service.

- Why: What a model says can be steered by what it was given, so its output can carry an attack as easily as a user's input can.
- Ask: Is every AI output in this change checked and escaped before it's used?
- From prototype. Checked by AI review. Severity: high.
- Only for products with: ai-features.
- Source: OWASP Top 10 for LLM Applications 2025, LLM05, Improper Output Handling.

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

### AI-06 Instructions to the model hold no secrets

The instructions given to a model hold no secrets, credentials or rules that only work if nobody sees them.

- Why: People can get a model to repeat its instructions, so anything in them should be safe to read.
- Ask: Do the model's instructions in this change hold anything that would matter if someone read them?
- From prototype. Checked by AI review. Severity: medium.
- Only for products with: ai-features.
- Source: OWASP Top 10 for LLM Applications 2025, LLM07, System Prompt Leakage.
