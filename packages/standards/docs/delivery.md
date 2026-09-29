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

## DEL-03 · Dependencies are watched for vulnerabilities, and each is fixed in a set time

Dependencies are checked for known vulnerabilities on every change and at least daily, and each vulnerability is fixed within a set time for its severity.

**Why:** Most attacks on software use vulnerabilities that were already public, in components nobody updated. New ones are published every day about code that's already running, so checking only when something changes misses them.

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

## DEL-08 · The running app is scanned before it's released

Before a release reaches production, a scanner tests the running app in staging from the outside, the way an attacker would. Every finding is fixed or recorded as an accepted risk. The scan runs only against the project's own staging, never production or anyone else's system.

**Why:** Code scanning reads the code. It can't see a server that's set up wrongly, a debug page left switched on or a missing security header. Only testing the running app finds those.

**Ask:** Was the running app scanned in staging before this release, and is every finding fixed or accepted?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | A tool | Medium | Always | – |

## DEL-09 · Packages come only from the registry you expect

Every dependency, and everything it depends on, is installed from the registry the project expects. A name the project uses for its own private packages can't be served from a public registry instead.

**Why:** If a private package's name is free on a public registry, anyone can publish a package under it with a higher version, and a build that looks in both places installs theirs. This is called dependency confusion.

**Ask:** Could any dependency in this change be installed from a registry the project doesn't expect?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP ASVS 5.0, 15.2.4, level 3](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md); [OWASP ASVS 5.0, 15.1.2, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md) |

## DEL-10 · There's a current list of every dependency

The project keeps a list of every dependency it ships, direct and indirect, with its version and where it comes from, such as a software bill of materials, and updates it with every release.

**Why:** When a vulnerability is announced, the first question is whether you use the affected package. Without a list, answering takes days; with one, it's a search.

**Ask:** Is the list of dependencies up to date for this release?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | A tool | Medium | Always | [OWASP ASVS 5.0, 15.1.2, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md) |

## DEL-11 · Every dependency's licence allows how the product uses it

Each dependency's licence is known and allows how the product is used and distributed. A licence that would require publishing the product's own code, or that forbids commercial use, needs a person's decision before the dependency is added.

**Why:** A licence is a legal agreement. One that doesn't fit can force a product to publish its code or stop selling it, and it's cheapest to catch before the code depends on it.

**Ask:** Does this change add a dependency whose licence doesn't fit how the product is used?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## DEL-12 · Risky dependencies are chosen on purpose

A dependency that runs code when it's installed, is no longer maintained, or has a name one slip away from a better-known package is checked before it's added, and kept only with a written reason.

**Why:** Attackers take over abandoned packages and publish look-alike names, and a package that runs code when it's installed runs it on every developer's machine and every build.

**Ask:** Does this change add a dependency that runs code when installed, is no longer maintained, or looks like another package's name?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | High | Always | [OWASP ASVS 5.0, 15.1.4, level 3](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x24-V15-Secure-Coding-and-Architecture.md) |
