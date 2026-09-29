# Secrets and configuration

SEC-10, SEC-11, SEC-26, SEC-27, REL-04, REL-05 and DEL-07.

## SEC-10: no secret in code

**Fail** on a key, password, token or connection string with a password anywhere in the repository:

- in code;
- in configuration;
- in fixtures;
- in a committed `.env` file.

Placeholder values in an example file are fine.

**Pass** evidence: secrets come from the environment or a secrets manager, and no secret appears in the files in scope.

A secret removed from the code but still in the history has leaked. Report it under SEC-26: it must be replaced.

## SEC-27: secret scanning runs on every change

**Pass** evidence: the CI step that runs a secret scanner on every change and fails the build when it finds one. Name the step.

**Fail** when:

- there's no secret scanning;
- it only reports and doesn't fail the build;
- it doesn't run on every change.

Keep the two apart. A missing scanner is SEC-27, medium: a gap in the safety net. A secret actually in the repository is SEC-10, critical. Don't report a missing scanner as SEC-10.

## SEC-11: nothing secret built into what ships

Anything built into a web page or a phone app can be read. **Fail** when a secret reaches either:

- through an environment variable with a public prefix, such as `NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_` or `REACT_APP_`;
- through the app's bundled config;
- through code that calls a paid or private API straight from the device.

Keys designed to be public are not secrets: a payment provider's publishable key, or a maps key restricted to your domains. Say which in the evidence.

## SEC-26: every secret can be replaced (production)

**Pass** when:

- a list names each secret, where it lives and how to replace it;
- each can be replaced without changing code.

**Fail** when:

- a secret is fixed in code or in a built artefact;
- there's no list;
- a secret that may have leaked is still in use.

## REL-04: configuration fails closed

**Pass** when one function decides which environment is running, and an unknown or missing environment name is treated as production.

**Fail** when:

- a missing variable means development;
- several places each decide for themselves.

## REL-05: demo shortcuts can't run in production (production)

**Fail** when any of these can be switched on in production:

- demo passwords;
- a "sign in as anyone" route;
- seeding code;
- a sandbox payment provider.

**Pass** when the app refuses to start in production with any of them on. The evidence is that check.

## DEL-07: only what's needed ships (production)

**Fail** when the production build or image carries any of:

- test routes or debug endpoints;
- sample data;
- admin tools for developers;
- source maps served to the public.
