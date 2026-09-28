# Security policy

## Reporting a vulnerability

Please do not report security problems in public issues. Use GitHub's private reporting instead: open the repository's **Security** tab and choose **Report a vulnerability**.

Include what you found, how to reproduce it, and the version or commit affected. The maintainer aims to acknowledge a report within a week and will keep you updated until it is resolved.

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0 pre-releases (`next` branch) | Yes, once published to npm |
| v0 playbook (`main`, `v0.1.0`) | Best effort. v0 is Markdown only, but reports about the CI and workflow examples it tells agents to generate are welcome. |

## Scope

Peer AI will run in developers' repositories and CI. The most important reports concern anything that could:

- execute untrusted code
- leak secrets or tokens
- let a pull request tamper with checks
- make an agent following the workflow take an unsafe action
