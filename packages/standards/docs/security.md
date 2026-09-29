# Security

Keeping people's data and the system itself safe from attack.

## SEC-01 · Permission is checked per record, not per role

Being signed in, or holding a role, is not permission to use *this* record. Every request that names a record proves the caller may use that record. Review every endpoint that takes an id, not a sample.

**Why:** Changing an id in a URL is the easiest attack there is, and it leaks one customer's data to another.

**Ask:** Does every endpoint that takes an id check that the caller may use that record?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP ASVS 5.0, 8.2.2, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x17-V8-Authorization.md) |

## SEC-02 · Each action checks the caller's role allows it

Every action checks that the caller's role allows it, and different roles have different powers: releasing money needs the specific role for it, not just any staff role.

**Why:** When every staff role can do everything, one compromised support account can do what only finance should.

**Ask:** Does every action in this change check for the specific role it needs?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP ASVS 5.0, 8.2.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x17-V8-Authorization.md) |

## SEC-03 · Permission is decided on the server, on every request

Permission checks happen on the server on every request, never based on anything the client can change, and never carried over from an earlier request.

**Why:** Anything the client decides, an attacker can change: hiding a button isn't a permission check.

**Ask:** Is every permission in this change decided on the server, from data the client can't change?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP ASVS 5.0, 8.3.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x17-V8-Authorization.md) |

## SEC-04 · A session is for one app, and the app says which

Where one backend serves several apps or tenants, each session is issued for exactly one of them and accepted only there. The app always says which one it is signing in to; the server never guesses.

**Why:** Guessing prefers the most powerful option, so a person with two roles can end up in the wrong app with the wrong powers, and the failure surfaces much later as confusing permission errors.

**Ask:** Is every session in this change tied to one app or tenant, and does the app say which?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `several-audiences` | [OWASP ASVS 5.0, 9.2.3, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x18-V9-Self-contained-Tokens.md); [OWASP ASVS 5.0, 8.4.1, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x17-V8-Authorization.md) |

## SEC-05 · Input is validated on the server

Every request that changes something is validated on the server against what's allowed. Checks in the app or the browser are for convenience, never a control.

**Why:** Anyone can send a request without using your app, so a check that only runs in the app doesn't run at all for an attacker.

**Ask:** Is every input in this change validated on the server?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | High | Always | [OWASP ASVS 5.0, 2.2.2, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x11-V2-Validation-and-Business-Logic.md); [OWASP ASVS 5.0, 2.2.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x11-V2-Validation-and-Business-Logic.md) |

## SEC-06 · Data from outside is checked before it's trusted

Data that crosses a boundary (an API response, stored data, an imported file, a message from another service) is checked against the shape it should have, never just assumed to have it.

**Why:** Code that assumes the shape of outside data breaks, or worse carries on with wrong data, the first time that data is different.

**Ask:** Is every piece of outside data in this change checked before it's used?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [OWASP ASVS 5.0, 2.2.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x11-V2-Validation-and-Business-Logic.md) |

## SEC-07 · Database queries are parameterised

Database queries never paste values into the query text. They use parameters or a query builder, so a value can never change what the query does.

**Why:** A value pasted into a query can rewrite it: that's SQL injection, which can read or delete a whole database.

**Ask:** Does any query in this change build its text from values?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | Critical | Always | [OWASP ASVS 5.0, 1.2.4, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x10-V1-Encoding-and-Sanitization.md) |

## SEC-08 · Content from outside is never put into a page as HTML

Content from people or outside services, including text an AI model produced, is shown as text. If it truly must be HTML, it goes through a well-known sanitiser first.

**Why:** HTML inserted into a page can run a script in the viewer's browser, with their session.

**Ask:** Does this change put any outside content into a page as HTML without a sanitiser?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | High | Always | [OWASP ASVS 5.0, 1.3.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x10-V1-Encoding-and-Sanitization.md); [OWASP ASVS 5.0, 1.2.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x10-V1-Encoding-and-Sanitization.md) |

## SEC-09 · No internal detail reaches the client

Errors shown to the client are generic and actionable: no stack traces, file paths, queries or keys. The detail goes to the log, with an id the client can quote. Debug modes are off in production.

**Why:** Internal detail is a map for an attacker: it shows what's running, where, and how it fails.

**Ask:** Could any error in this change reveal internal detail to the client?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [OWASP ASVS 5.0, 16.5.1, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md); [OWASP ASVS 5.0, 13.4.2, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x22-V13-Configuration.md) |

## SEC-10 · No secret in code, ever

Keys, passwords and tokens never live in code or in the repository. They come from a secrets manager or the environment.

**Why:** A secret in a repository is readable by everyone who can ever read the repository, including from its history after the file is deleted.

**Ask:** Does this change put a key, password or token in code or the repository?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | Critical | Always | [OWASP ASVS 5.0, 13.3.1, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x22-V13-Configuration.md) |

## SEC-11 · Nothing secret is built into an app or a web page

Anything shipped to a person's device (a web page's code, a mobile app) can be read by anyone, so no key or secret is ever built into it, even from an environment variable at build time. A call that needs a secret goes through your server.

**Why:** A key built into an app is extracted within hours of release, and then it's everyone's key.

**Ask:** Does this change build any key or secret into code that runs on a person's device?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Critical | Always | – |

## SEC-12 · Sign-in is protected against guessing

Sign-in, password reset, two-factor and one-time codes are rate limited, so passwords and codes can't be guessed at speed.

**Why:** With unlimited attempts, a leaked list of passwords from another site opens accounts on yours.

**Ask:** Is every sign-in, reset and code endpoint in this change rate limited?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP ASVS 5.0, 6.3.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x15-V6-Authentication.md) |

## SEC-13 · Rate limits are named policies in one place

Rate limits are defined as named policies in one place, not numbers scattered through the code.

**Why:** Scattered limits drift apart, and nobody can answer "what are our limits?" when an attack is happening.

**Ask:** Does this change add a rate limit anywhere other than the shared policies?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Low | Always | – |

## SEC-14 · Sessions end

Sessions expire after a period of inactivity and after a maximum lifetime. Signing out ends the session on the server, not just in the app, and disabling an account ends all its sessions.

**Why:** A session that never ends turns one stolen token, or one shared computer, into permanent access.

**Ask:** In this change, can a session outlive sign-out, account removal or its maximum lifetime?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [OWASP ASVS 5.0, 7.4.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x16-V7-Session-Management.md); [OWASP ASVS 5.0, 7.4.2, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x16-V7-Session-Management.md); [OWASP ASVS 5.0, 7.3.2, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x16-V7-Session-Management.md) |

## SEC-15 · Everything travels encrypted

All traffic between apps and services uses TLS, never falls back to an unencrypted connection, and no platform setting allows unencrypted traffic.

**Why:** Unencrypted traffic can be read and changed by anyone on the same network, such as public Wi-Fi.

**Ask:** Does anything in this change send or allow traffic without TLS?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP ASVS 5.0, 12.2.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x21-V12-Secure-Communication.md); [OWASP MASVS 2.1.0, MASVS-NETWORK-1](https://github.com/OWASP/masvs/blob/master/controls/MASVS-NETWORK-1.md) |

## SEC-16 · Which websites may call the API is a fixed list

The websites allowed to call the API from a browser are a fixed list. The API never echoes back whatever origin asked, least of all when requests carry credentials.

**Why:** An API that allows any origin with credentials lets any website act as a signed-in visitor.

**Ask:** Is every allowed origin in this change on a fixed list?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [OWASP ASVS 5.0, 3.4.2, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x12-V3-Web-Frontend-Security.md) |

## SEC-17 · Web responses set their security headers

Web responses set Strict-Transport-Security, so browsers always use HTTPS, and a Content-Security-Policy, so the browser runs only trusted scripts.

**Why:** These headers stop whole classes of attack in the browser, for the cost of a line of configuration.

**Ask:** Do the web responses in this change set Strict-Transport-Security and a Content-Security-Policy?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | [OWASP ASVS 5.0, 3.4.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x12-V3-Web-Frontend-Security.md); [OWASP ASVS 5.0, 3.4.3, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x12-V3-Web-Frontend-Security.md) |

## SEC-18 · The server names stored files

Stored files get names and paths the server makes. A name supplied by the client is never used as a path.

**Why:** A client-supplied name like `../../config` can read or overwrite files it should never reach.

**Ask:** Does this change use any client-supplied name as a storage path?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `uploads` | [OWASP ASVS 5.0, 5.3.2, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x14-V5-File-Handling.md) |

## SEC-19 · An upload's content and size are checked

An uploaded file's content is checked to be the type it claims, not just its extension, and its size is limited.

**Why:** A renamed file slips past an extension check, and an unlimited upload is an easy way to take a service down.

**Ask:** Does this change check an upload's content and size, not just its extension?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | `uploads` | [OWASP ASVS 5.0, 5.2.2, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x14-V5-File-Handling.md); [OWASP ASVS 5.0, 5.2.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x14-V5-File-Handling.md) |

## SEC-20 · Private files are shared through short-lived links

Private files are served through signed links that expire soon, and every access is recorded.

**Why:** A permanent link to a private file stays valid after it's forwarded, leaked or no longer allowed.

**Ask:** Are the private files in this change served through expiring links, with access recorded?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | `uploads` | – |

## SEC-21 · Every live event is authorised, not just the connection

A live subscription checks permission for every event it sends, not once when it connects, and events go only to the people they're for.

**Why:** Permissions change while a connection stays open, and a connection authorised once keeps receiving what it's no longer allowed to see.

**Ask:** Does every event in this change check permission, and reach only the people it's for?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `real-time` | – |

## SEC-22 · Nothing sensitive goes in a URL

Tokens, keys and personal data never go in a URL or its query string. They travel in the request body or headers.

**Why:** URLs are kept in server logs, browser history and the referrer sent to other sites, long after the request.

**Ask:** Does this change put a token, key or personal data in a URL?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Medium | Always | [OWASP ASVS 5.0, 14.2.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x23-V14-Data-Protection.md) |

## SEC-23 · Only modern TLS, with strong ciphers

Only current TLS versions are switched on (TLS 1.2 and 1.3, with 1.3 preferred), only recommended cipher suites are allowed, strongest first, and public services use publicly trusted certificates. On a hosting platform that manages TLS, its settings are checked rather than assumed.

**Why:** Old TLS versions and weak ciphers have known breaks, so traffic that uses them can be read or changed even though it's encrypted.

**Ask:** Does this change switch on an old TLS version, a weak cipher or a certificate that isn't publicly trusted?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | [OWASP ASVS 5.0, 12.1.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x21-V12-Secure-Communication.md); [OWASP ASVS 5.0, 12.1.2, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x21-V12-Secure-Communication.md); [OWASP ASVS 5.0, 12.2.2, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x21-V12-Secure-Communication.md) |

## SEC-24 · Security events are logged

Sign-ins, failed sign-ins, refused permission checks and attempts to get past a security control, such as input that fails validation or a hit on a rate limit, are logged with who, what and when, but never the password, token or personal data involved.

**Why:** You can't stop or recover from an attack you can't see. These logs are how an attack gets noticed, and how anyone works out afterwards what it reached.

**Ask:** Does this change add a sign-in, permission check or security control that refuses someone without logging it?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [OWASP ASVS 5.0, 16.3.1, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md); [OWASP ASVS 5.0, 16.3.2, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md); [OWASP ASVS 5.0, 16.3.3, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md) |

## SEC-25 · The threat model changes when the ways in change

When a change adds a new way into the system, such as an endpoint, an upload, a webhook, a sign-in method or an outside service, the same change updates the threat model: what could go wrong through it, and what stops it.

**Why:** A threat model written once describes the system as it was. Attacks come through the parts added since.

**Ask:** Does this change add a way into the system that the threat model doesn't cover yet?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## SEC-26 · Every secret can be replaced quickly

A list names each of the project's secrets, where it lives and how to replace it. Each can be replaced without changing code, and each is replaced on a schedule and at once if it may have leaked.

**Why:** A leaked key keeps working until it's replaced. Deleting it from wherever it leaked doesn't stop anyone who already copied it.

**Ask:** Can every secret this change adds be replaced without changing code, and is it on the list?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | [OWASP ASVS 5.0, 13.1.4, level 3](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x22-V13-Configuration.md); [OWASP ASVS 5.0, 13.3.4, level 3](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x22-V13-Configuration.md) |

## SEC-27 · Secret scanning runs on every change

A secret scanner checks every change before it merges, and the repository's history once, and fails the build when it finds a secret. It's confirmed to have actually run.

**Why:** Secrets slip in by accident: a key pasted in to test something, an .env file added by mistake. A scanner catches them before they spread, and a crashed scanner reports the same "nothing found" as a clean one. A missing scanner is a gap in the safety net, not a leak, so it ranks below a secret actually in the code (SEC-10).

**Ask:** Does every change pass a secret scan that fails the build when it finds a secret?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## SEC-28 · Each service has only the access it needs

Each service, job and part of the product reaches the others with an account of its own, allowed only what it needs: a service that reads one table can't drop the database, and none shares an administrator's account.

**Why:** When one part is broken into, its account decides how far the attacker gets. An account that can do everything turns one weak part into the whole system.

**Ask:** Does this change give a service, job or part more access than it needs, or a shared or administrator account?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP ASVS 5.0, 13.2.1, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x22-V13-Configuration.md); [OWASP ASVS 5.0, 13.2.2, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x22-V13-Configuration.md) |

## SEC-29 · Nothing is public unless it's meant to be

Storage, databases, queues, admin and monitoring pages, internal documentation and debug modes are reachable only by who needs them. Each thing open to the internet is open on purpose, and says so in the configuration.

**Why:** A storage bucket or database left open to the internet is found by automated scanners within hours, and everything in it is exposed at once.

**Ask:** Does this change make anything reachable from the internet that isn't meant to be, or switch on a debug mode in production?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Critical | Always | [OWASP ASVS 5.0, 13.4.5, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x22-V13-Configuration.md); [OWASP ASVS 5.0, 13.4.2, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x22-V13-Configuration.md) |
