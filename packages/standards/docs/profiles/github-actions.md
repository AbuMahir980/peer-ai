# GitHub Actions

The checks a pipeline on GitHub Actions runs on every change: secrets, dependencies with published vulnerabilities, workflows' own safety, and code scanning; and, where the project has environments with addresses, a TLS check and a scan of the running app in staging. `peer-ai render` writes them as one workflow, each tool pinned to a checked release.

List it in `standards.profiles` as `github-actions`. It applies to the project as a whole: its rules go with the pipeline's files in `.github/`, and with files outside every part.

## GHA-01 · Every change is scanned for secrets

Every pull request's commits are scanned for secrets, such as keys and tokens, and the whole history is scanned every day; the check fails when one is found. A secret found in old history that has already been replaced is recorded in `.gitleaksignore`, with why.

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

Every action a workflow or an action in the repository uses is pinned to a full commit, never to a tag or a branch that can move. A comment with its version helps a reviewer, and isn't checked.

**Why:** A tag can be moved to other code, so a workflow that uses one runs whatever its owner, or whoever took over the account, puts there next.

**Ask:** Is every action in the workflows pinned to a commit?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | High | [DEL-01](../delivery.md) | Any | `workflows job`, in Peer AI's pipeline workflow |

## GHA-04 · No job asks for a token that can write everything

No job asks for `write-all`, the token that can change the code, the releases and the settings.

**Why:** With write-all, one compromised step, such as a hijacked action, can change anything the repository holds.

**Ask:** Does any job in the workflows ask for write-all?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [SEC-28](../security.md) | Any | `workflows job`, in Peer AI's pipeline workflow |

## GHA-05 · Code scanning is a required check

Every change is scanned for insecure code by a code scanner, such as Semgrep with a pinned set of rules, or CodeQL, and the check must pass before the change merges.

**Why:** A scanner finds the patterns a reviewer skims past, in every change, including the ones nobody reviews closely.

**Ask:** Does code scanning run on every change, and must it pass before a merge?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | High | [DEL-04](../delivery.md) | Any | `code job`, in Peer AI's pipeline workflow |

## GHA-06 · Each environment's TLS is checked

On a schedule, each environment with an address is checked against modern TLS settings, such as Mozilla's intermediate profile, and a failure is fixed.

**Why:** TLS settings drift as certificates renew and servers are rebuilt, and nothing else notices until a browser refuses the site.

**Ask:** Does the pipeline check each environment's TLS on a schedule, and did the last run pass?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [SEC-23](../security.md) | Any | – |

## GHA-07 · The running app is scanned in staging

On a schedule, and before a release, the running app is scanned, such as by OWASP ZAP's baseline scan, in each environment the config marks as not production, never in production. Each finding is fixed, or accepted by a person in `.github/zap-rules.tsv`, with the reason.

**Why:** Some problems only show in a running app: headers, cookies and pages left open.

**Ask:** Does the pipeline scan the running app in staging, and are its findings fixed or accepted?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Production | AI review | Medium | [DEL-08](../delivery.md) | Any | – |

## GHA-08 · A workflow starts from no permissions, and each job asks for what it uses

A workflow gives its token no permissions by default, with `permissions: {}`, and each job asks for only what it uses, such as `contents: read`.

**Why:** The default token can often write, so a workflow that doesn't say otherwise gives every step more than it needs.

**Ask:** Does every workflow start from no permissions, and does each job ask for only what it uses?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [SEC-28](../security.md) | Any | – |
