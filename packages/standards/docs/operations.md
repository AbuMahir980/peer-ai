# Infrastructure and operations

Environments, logs, metrics, alerts, and running the system.

## OPS-01 · Development and production are kept apart

Development and test never share production's servers, databases or secrets: each environment has its own, so a mistake while building can't touch real customers.

**Why:** A test run against the production database, or a development machine holding production's secrets, is how real data gets deleted or leaked. Audits such as PCI DSS and ISO 27001 check for this separation.

**Ask:** Does anything in this change share a server, database or secret between development and production?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |

## OPS-02 · Real people's data never goes into development or test

Development and test use made-up data, or copies of production where personal data has been anonymised or replaced. A plain copy of production is never used for testing.

**Why:** A copy of production puts real people's data somewhere less protected, where more people can see it. Data protection laws treat that as a breach waiting to happen, and PCI DSS forbids real card numbers in test outright.

**Ask:** Does this change put real people's data into development or test?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | High | Always | – |

## OPS-03 · Nobody has everyday access to production

Developers have no standing access to production. When someone truly needs it, such as during an outage, it's approved, time-limited and recorded.

**Why:** Standing access means one stolen laptop or one mistyped command reaches production. Access that's approved and recorded can be explained afterwards.

**Ask:** Who has access to production today, and is every use approved, time-limited and recorded?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | A person | High | Always | – |

## OPS-04 · A staging environment mirrors production

A staging environment is set up like production, with anonymised data, and every change passes through it before it reaches production.

**Why:** "It worked on my machine" is what staging exists to catch, before real customers find it instead.

**Ask:** Does this change pass through a staging environment that mirrors production?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | – |

## OPS-05 · Backups are automatic

Data is backed up automatically, at least daily, to somewhere separate from where it lives.

**Why:** The backup you meant to set up is the one you need on the day the database is lost.

**Ask:** Is the data in this change backed up automatically, somewhere separate?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |

## OPS-06 · Restores are tested, and redundancy matches the uptime target

Restoring from backup is tested on a schedule, and the system has enough redundancy to meet the uptime it promises.

**Why:** A backup that has never been restored is a hope, not a backup.

**Ask:** When was a restore from backup last tested, and does the redundancy match the uptime target?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | A person | Medium | Always | – |

## OPS-07 · Logs are structured

Logs are written as structured fields, not sentences built by pasting values together.

**Why:** Structured logs can be searched and counted during an incident. Pasted-together text can't, and it's where secrets slip in.

**Ask:** Does this change write any log line by pasting values into text?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Low | Always | – |

## OPS-08 · Every request can be traced end to end

Each request carries one id, which appears in its log lines, its trace and the error the client sees.

**Why:** When a customer reports an error, the id takes you straight to what happened instead of hours of searching.

**Ask:** Can every request in this change be traced by one id from the client's error to the logs?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | – |

## OPS-09 · An alert fires only on something a person would act on

Every alert is about something a person needs to act on, and says what to do.

**Why:** Alerts that don't need action teach people to ignore alerts, including the one that matters.

**Ask:** Does every alert in this change need a person to act?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | – |

## OPS-10 · Health checks are cheap and honest

Health and readiness checks are cheap to run and tell the truth: ready means able to serve requests, not just that the process started.

**Why:** A readiness check that always says yes sends traffic to a server that can't handle it.

**Ask:** Do the health checks in this change say whether the service can really serve requests?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | – |

## OPS-11 · There's a plan for a security incident

A short written plan says what happens in a security incident: who leads, how an attacker's access is cut off, which secrets are replaced, how the system gets back to a known good state, and who tells affected people and regulators within the law's deadline. Afterwards, a review records what happened and what will stop it happening again.

**Why:** Under pressure, people make worse decisions and lose hours working out who does what. Data protection laws such as the GDPR give as little as 72 hours to tell the regulator.

**Ask:** Is there a written incident plan, and does this change add something it should cover, such as a new secret or a new store of personal data?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |
