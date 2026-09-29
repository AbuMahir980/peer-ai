# Transport, browsers and files

SEC-15 to SEC-20, and SEC-23.

## SEC-15: everything travels encrypted

**Fail** on:

- a production `http://` URL to any service;
- certificate checks switched off, such as `rejectUnauthorized: false`, `verify=False` or `InsecureSkipVerify`;
- platform settings that allow unencrypted traffic, such as Android's `cleartextTrafficPermitted` or iOS's `NSAllowsArbitraryLoads`.

Local development addresses are not findings.

## SEC-16: a fixed list of allowed origins

**Fail** when the API does either of these:

- reflects the request's `Origin` back;
- allows any origin (`*`, or `origin: true`) on requests that carry cookies or credentials.

**Pass** when a fixed list, per environment, names the allowed websites.

## SEC-17: security headers

**Pass** when responses set `Strict-Transport-Security` and a `Content-Security-Policy`. The evidence is the middleware or the hosting configuration that sets them, such as a `vercel.json` or `netlify.toml` headers block.

If a proxy or CDN outside the repository sets them, mark the line `not-checked` and say where to look.

## SEC-18: the server names stored files (projects with uploads)

**Fail** when:

- a name the client sent becomes a storage path or key;
- such a name is joined into a path.

**Pass** when the server generates the name, and the original name is kept only as data.

## SEC-19: an upload's content and size are checked (projects with uploads)

**Pass** when the file's type is read from its content, not its extension or the client's `Content-Type`, and a size limit applies before the whole file is read.

**Fail** on either check missing.

## SEC-20: private files through short-lived links (production, projects with uploads)

**Fail** when:

- private files sit in a public bucket;
- links don't expire, or last longer than they need;
- access isn't recorded.

## SEC-23: modern TLS only

**Pass** evidence: server or load balancer configuration in the repository allowing only TLS 1.2 and 1.3 with recommended ciphers, such as an `ssl_protocols` line or a load balancer's security policy in infrastructure code.

When a hosting platform manages TLS and its settings aren't in the repository, mark the line `not-checked`: its settings need checking on the platform.
