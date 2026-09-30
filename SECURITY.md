# Security policy

## Reporting a vulnerability

Please do not report security problems in public issues. Use GitHub's private reporting instead: open the repository's **Security** tab and choose **Report a vulnerability**.

Include what you found, how to reproduce it, and the version or commit affected. The maintainer aims to acknowledge a report within a week and will keep you updated until it is resolved.

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0 pre-releases, from npm or the `next` branch | Yes |
| v0 playbook | No. It stays available by its tag, `v0.1.0`. |

## Scope

Peer AI will run in developers' repositories and CI. The most important reports concern anything that could:

- execute untrusted code
- leak secrets or tokens
- let a pull request tamper with checks
- make an agent following the workflow take an unsafe action
