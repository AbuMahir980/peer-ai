# Where debt hides

Go through every area and run each check. Reading files as they come up misses whole areas. Examples are from a made-up bicycle repair booking service.

## The code

- **Duplicates that drift:** find each rule the product depends on, such as an amount, a time limit or who may do what, and search for everywhere it's worked out. The same rule in two places is debt, such as a slot's length worked out by both the shop app and the bookings service. Two places that disagree are a fix.
- **A replacement never finished:** an old way and a new way of doing the same job, both still in use, such as two ways of sending reminder texts. Say roughly how much is still on the old way.
- **Work people route around:** search for "TODO", "FIXME", "HACK", "temporary" and "don't touch", and look for code everyone copies instead of changing.
- **Tangles:** a module everything imports, or one whose change breaks others (ARC-02, ARC-03).

## The tests and checks

- **How many, and where:** count the tests in each part of the product, and compare with how often each part changes.
- **Which ones run:** read the verify command and the CI workflow, and check that every part's tests are run by them. A test that never runs proves nothing.
- **What they prove:** read a few tests in each part. Do they check results? Could the stand-ins they use, such as a fake payment service, ever fail?
- **Checks that don't stop anything:** a check that can fail without blocking a merge.

## What it's built on

- **Pinned versions:** read each manifest, and check there's a lockfile, so every install gets the same versions (DEL-01).
- **Known vulnerabilities:** versions with published advisories, from the package manager's audit where it runs. Where it can't run, go through each dependency's version against the advisories you know of, and say which you couldn't check (DEL-03).
- **Left behind:** versions several major releases old, packages no longer maintained, and packages the newer code has already replaced.
- **The platform:** a runtime or operating system version near its end of support.

## The data

- **Between versions:** how stored data moves from one version to the next, on servers and on people's devices: migrations, and upgrades of what's kept locally. Trace each kind of record through a change of version: where the old version wrote it, and where the new one reads it. Anything the new version no longer reads is lost. Loss that can happen now is a fix.
- **Copies that drift:** the same data kept in two places with nothing keeping them in step.

## Secrets and settings

- **Secrets where they shouldn't be:** in the repository, or in settings built into what's shipped to people's browsers or phones, where anyone can read them. Each is a fix (SEC-10).
- **Settings nobody can explain.**

## How it's built and run

- **Steps done by hand** that the pipeline should do.
- **Parts the pipeline skips:** no pipeline, or one that builds, tests or deploys only some of the product.

## Sizing it

| Question | Tells you |
|----------|-----------|
| How often does work touch it? | What it costs to leave |
| Has it caused a bug or an outage? | What it risks |
| Can it be fixed a piece at a time? | Whether it can start now |
| What must happen first? | What it depends on |
