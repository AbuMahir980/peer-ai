# Delivery

Dependencies, pipelines, and how changes reach people.

## DEL-01 · Versions are pinned and the lockfile is committed

Every dependency names the exact version that was tested, never "latest", and the lockfile is committed.

**Why:** "Whatever is newest today" isn't a version. A build that pulls in different code tomorrow can break, or be compromised, without anyone changing a line.

**Ask:** Does this change add a dependency without an exact version, or leave the lockfile out?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | Medium | Always | – |

## DEL-02 · A new dependency is justified

A new dependency comes with a reason in the pull request: what it does, why nothing already there does it, and what it brings with it.

**Why:** Every dependency is code you didn't write and have to trust, update and secure for as long as you use it.

**Ask:** Does every new dependency in this change say why it's needed?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |

## DEL-03 · Known vulnerabilities in dependencies are fixed in a set time

Dependencies are checked for known vulnerabilities on every change, and each is fixed within a set time for its severity.

**Why:** Most attacks on software use vulnerabilities that were already public, in components nobody updated.

**Ask:** Does this change leave a dependency with a known vulnerability past its time to fix?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | High | Always | [OWASP ASVS 5.0, 15.2.1, level 1](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md); [OWASP MASVS 2.1.0, MASVS-CODE-3](https://github.com/OWASP/masvs/blob/master/controls/MASVS-CODE-3.md) |

## DEL-04 · Every change passes the same required checks before it merges

Every change passes the same automated checks before it merges: formatting, linting, types, tests, secret scanning, dependency checks and code scanning. The checks are required, not advisory.

**Why:** A check that can be skipped will be skipped, on the day it would have caught something.

**Ask:** Does this change merge only after passing every required check?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | High | Always | – |

## DEL-05 · No check only reports

Every check in the pipeline fails the build when it finds a problem. None is set to report and carry on.

**Why:** A check that reports without failing gives the same green as a clean pass, so nobody reads it.

**Ask:** Is any check in this change set to report without failing the build?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## DEL-06 · Changes reach production only through the pipeline

Changes reach production only through the pipeline, never by hand from someone's computer.

**Why:** A change made by hand skips every check, and nobody can say afterwards exactly what's running.

**Ask:** Could any change in this project reach production without going through the pipeline?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |

## DEL-07 · Only what's needed ships to production

Production gets only what the product needs to run: no test code, sample code, development tools or debug features.

**Why:** Every extra piece in production is something an attacker can find and use.

**Ask:** Does this change ship test, sample or development code to production?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | [OWASP ASVS 5.0, 15.2.3, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md) |
