# Next.js

Full-stack apps in Next.js, where screens and server code share one repository: images sized for the screen, secrets that stay on the server, and server actions and route handlers treated as the public endpoints they are. It builds on the React and Node profiles.

List it in `standards.profiles` as `next`. It applies to parts tagged `next`. It builds on [react](react.md), [node](node.md), which apply wherever it does.

## NEXT-01 · Images go through Next's image component

Images are shown with `next/image`, which sizes and compresses each for the screen that asks, not with a plain `img`.

**Why:** A plain img sends the full-size file to every phone, and the page waits for it.

**Ask:** Does this change show an image with a plain img?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Low | [PERF-07](../performance.md) | Any | `@next/next/no-img-element`, in ESLint |

## NEXT-02 · Secrets stay on the server

Nothing secret is in a `NEXT_PUBLIC_` variable, which is built into the page. Modules that hold secrets import `server-only`, so importing them from a client component fails the build.

**Why:** Anything a client component touches is sent to every browser, and one import is enough to send a secret with it.

**Ask:** Could anything secret in this change reach the browser?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | AI review | Critical | [SEC-11](../security.md) | Any | – |

## NEXT-03 · Server actions and route handlers check who's calling

Every server action and route handler checks the caller may do this, to this record, on the server, as its first step.

**Why:** A server action is a public endpoint anyone can call directly, whatever the screen that normally calls it shows.

**Ask:** Does every server action and route handler in this change check the caller's permission first?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Critical | [SEC-03](../security.md) | Any | – |

## NEXT-04 · Server actions and route handlers check their input

Every server action and route handler checks its input against a schema before using it, whatever types the calling component declares.

**Why:** Types in the client are a promise the caller doesn't have to keep. The server gets whatever is sent.

**Ask:** Does every server action and route handler in this change check its input on the server?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | AI review | High | [SEC-05](../security.md) | Any | – |

## NEXT-05 · Every response sets its security headers

The security headers, such as a content security policy, are set for every route, in `next.config` or middleware.

**Why:** Without them, a browser lets another site frame the page, and runs any script injected into it.

**Ask:** Do the app's responses set the security headers?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [SEC-17](../security.md) | Any | – |
