# Checking each rule

Examples are from a made-up bicycle repair booking service. Cloud providers, tools and file formats are examples; the stack profile names the project's own.

## Contents

- Environments: OPS-01, OPS-02, OPS-04
- Access: OPS-03, SEC-28
- What's reachable: SEC-29
- Traffic: SEC-15, SEC-23
- Secrets: SEC-10, SEC-26
- Keeping data safe: OPS-05, OPS-06
- How changes arrive: DEL-06

## Environments: OPS-01, OPS-02, OPS-04

- **OPS-01, kept apart:** each `environment` has its own data stores, credentials and accounts. Nothing in development or staging can reach production's data. Fail anything two environments share that holds data or grants access.
- **OPS-02, no real people's data outside production:** fail a job, script or pipeline step that copies production data into another environment as it is.
- **OPS-04 (production), staging mirrors production:** staging is built from the same infrastructure code as production, with its own settings, so a change is tried on the same shape before it's live.

## Access: OPS-03, SEC-28

- **OPS-03 (production), people:** nobody holds standing access to change production. Access is through the pipeline, or granted for a set time, logged, and removed.
- **SEC-28, services, jobs and pipelines:** each `identity` is its own, and allowed only what it needs.
  - **Pass:** the booking service's account can read and write its own tables and nothing else.
  - **Fail:** a wildcard for every action or every resource, an administrator role, one account shared by several services, or a pipeline credential that reaches every environment.

## What's reachable: SEC-29

List every `exposure` first: each public address, each open port and the network rules around it, each public link to stored files, each page or endpoint the internet can reach. Then check each is meant to be.

- **Pass:** it's open on purpose, and the configuration says so, such as a load balancer in front of the public API.
- **Fail:** storage, a database, a queue, an admin or monitoring page, internal documentation, or a debug mode that the internet can reach and has no reason to. A network rule open to every address, on a port that isn't the public front door, is a finding in itself.

## Traffic: SEC-15, SEC-23

- **SEC-15, encrypted everywhere:** public traffic arrives over TLS, and plain HTTP only redirects to it. Traffic between parts is encrypted too, including to the database.
- **SEC-23, modern TLS:** the TLS settings the files set, or the provider's policy they choose, allow only current versions and strong ciphers.

## Secrets: SEC-10, SEC-26

- **SEC-10, no secret in the files:** a password, key or token written into any file in the repository is a finding, even in a private repository. Secrets come from a secret store or the pipeline's protected settings.
- **SEC-26 (production), replaceable:** each `secret` can be changed without a redeploy by hand, and the files show where it's rotated, or a person says how.

## Keeping data safe: OPS-05, OPS-06

- **OPS-05, automatic backups:** each store of data that matters has automatic backups, kept for a set time, and protection against being deleted by mistake.
- **OPS-06 (production), restores and redundancy:** a restore is tried on a schedule, and the redundancy matches the uptime the product promises. A file rarely shows a restore; ask its owner, and mark it `not-checked` until one is recorded.

## How changes arrive: DEL-06

- **Pass:** every change to production, infrastructure included, goes through the pipeline after review, and nothing else holds the rights to change it.
- **Fail:** any way for a person to change production from their own machine, or a deploy that skips review or the required checks.
