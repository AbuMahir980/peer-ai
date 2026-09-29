# Environments and start-up

REL-04, REL-05, REL-06 and OPS-02.

## REL-04: configuration fails closed

- **Look at:** each `startup`, and how it decides which environment it's in.
- **Pass:** one function decides, and a name it doesn't recognise is treated as production.
- **Fail:** checks such as `if env == "development"` scattered through the code, or an unknown name treated as development.

## REL-05: demo shortcuts can't run in production (production)

- **Look at:** seed data, demo passwords, sandbox providers and test switches.
- **Pass:** the app refuses to start in production when any is set.

## REL-06: every process runs the same safety checks (production)

- **Look at:** each worker, script and job runner that can move money or change data.
- **Pass:** it runs the same start-up checks as the main server.

## OPS-02: no real personal data outside production

- **Look at:** seed files, fixtures and scripts that copy data between environments.
- **Pass:** made-up data, or copies with personal data replaced.
- **Fail:** a script that copies the production database into a test environment as it is.
