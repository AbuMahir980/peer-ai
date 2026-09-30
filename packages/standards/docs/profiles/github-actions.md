# GitHub Actions

The checks a pipeline on GitHub Actions runs on every change: secrets, dependencies with published vulnerabilities, workflows' own safety, and code scanning; and, where the project has environments with addresses, a TLS check and a scan of the running app in staging. `peer-ai render` writes them as one workflow, each tool pinned to a checked release.

List it in `standards.profiles` as `github-actions`. It applies to every part of the project.

## GHA-01 · Every change is scanned for secrets

Every change, and the history it adds, is scanned for secrets, such as keys and tokens, and the check fails when one is found.

**Why:** A secret pushed once stays in the history for anyone with a copy, even after the file is fixed.

**Ask:** Does the pipeline scan every change for secrets, and fail when it finds one?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [SEC-27](../security.md) | Any | `secrets job`, in Peer AI's pipeline workflow |

## GHA-02 · Dependencies are checked for published vulnerabilities

Every change, and every day, the dependencies in each lockfile and manifest are checked against the published advisories, and the check fails when one is affected.

**Why:** New advisories are published for code that hasn't changed, so a check that runs only on changes misses them.

**Ask:** Does the pipeline check dependencies on every change and every day?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [DEL-03](../delivery.md) | Any | `dependencies job`, in Peer AI's pipeline workflow |

## GHA-03 · Every action is pinned to a commit

Every action a workflow uses is pinned to a full commit, with its version in a comment, never to a tag or a branch that can move.

**Why:** A tag can be moved to other code, so a workflow that uses one runs whatever its owner, or whoever took over the account, puts there next.

**Ask:** Is every action in the workflows pinned to a commit?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [DEL-01](../delivery.md) | Any | `workflows job`, in Peer AI's pipeline workflow |

## GHA-04 · A workflow's token has only the access it needs

A workflow gives its token no permissions by default, with `permissions: {}`, and each job asks for only what it uses, such as `contents: read`.

**Why:** A token with write access lets one compromised step change the code or the releases.

**Ask:** Does every workflow start from no permissions, and every job ask for only what it uses?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [SEC-28](../security.md) | Any | `workflows job`, in Peer AI's pipeline workflow |

## GHA-05 · Code scanning is a required check

Every change is scanned for insecure code by a code scanner, such as Semgrep or CodeQL, and the check must pass before the change merges.

**Why:** A scanner finds the patterns a reviewer skims past, in every change, including the ones nobody reviews closely.

**Ask:** Does code scanning run on every change, and must it pass before a merge?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Medium | [DEL-04](../delivery.md) | Any | `code job`, in Peer AI's pipeline workflow |

## GHA-06 · Each environment's TLS is checked

On a schedule, each environment with an address is checked against modern TLS settings, such as Mozilla's intermediate profile, and a failure is fixed.

**Why:** TLS settings drift as certificates renew and servers are rebuilt, and nothing else notices until a browser refuses the site.

**Ask:** Does the pipeline check each environment's TLS on a schedule, and did the last run pass?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [SEC-23](../security.md) | Any | – |

## GHA-07 · The running app is scanned in staging

On a schedule, and before a release, the running app in staging is scanned, such as by OWASP ZAP's baseline scan, never in production. Each finding is fixed or accepted by a person.

**Why:** Some problems only show in a running app: headers, cookies and pages left open.

**Ask:** Does the pipeline scan the running app in staging, and are its findings fixed or accepted?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Production | AI review | Medium | [DEL-08](../delivery.md) | Any | – |
