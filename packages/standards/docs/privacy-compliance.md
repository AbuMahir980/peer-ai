# Privacy and compliance

Personal data, and the laws and rules a product must follow.

## PRIV-01 · Logs never hold secrets, tokens or personal data

Passwords, tokens, keys, payment details and personal data are never written to logs. A redaction filter in the logging layer removes them, and it can't be bypassed.

**Why:** Logs are copied, shipped and kept far more widely than the data they came from, and a password in a log is a password everyone with log access has.

**Ask:** Could anything in this change write a secret or personal data to a log?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | High | Always | [OWASP ASVS 5.0, 16.2.5, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md) |

## PRIV-02 · No real personal data in the repository

Fixtures, seed data, screenshots, tests and examples use invented data. No real person's data goes into the repository.

**Why:** Everything in a repository is copied to every machine that clones it, forever.

**Ask:** Does this change add any real person's data to the repository?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | High | Always | – |

## PRIV-03 · Only what's needed is collected

A feature collects only the personal data it needs, at the precision it needs, and only while it needs it: a rough area rather than an exact location, and location only while searching rather than all the time.

**Why:** Data you don't collect can't leak, can't be misused and doesn't need protecting. Collecting only what's needed is also what data protection laws require.

**Ask:** Does this change collect more personal data, or more precise data, than it needs?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |

## PRIV-04 · Personal data goes only where people have been told

Personal data is sent only to the services people have been told about, with their consent where the law requires it. Analytics and telemetry are off until the person opts in.

**Why:** Sending data to a third party people didn't know about breaks their trust, and in most countries it breaks the law too.

**Ask:** Does this change send personal data anywhere people haven't been told about?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP ASVS 5.0, 14.2.3, level 2](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x23-V14-Data-Protection.md) |

## PRIV-05 · Hidden details are removed from files before they leave

Before a photo or file is shared or sent to another service, details the person may not know it carries, such as where a photo was taken, are removed, unless the person chose to keep them.

**Why:** A photo's location can reveal where someone lives, and most people have no idea it's there.

**Ask:** Does this change send or share files with hidden details, such as location, still in them?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP ASVS 5.0, 14.2.8, level 3](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x23-V14-Data-Protection.md) |

## PRIV-06 · Personal data is kept only as long as it's needed

Each kind of personal data has a set time it's kept, such as location from a live stream, and a scheduled job deletes it when that time is up.

**Why:** Data kept forever is data that can leak forever, and "we'll delete it later" never happens without a job that does it.

**Ask:** Does the personal data in this change have a set time it's kept, and a job that deletes it?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | [OWASP ASVS 5.0, 14.2.7, level 3](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x23-V14-Data-Protection.md) |
