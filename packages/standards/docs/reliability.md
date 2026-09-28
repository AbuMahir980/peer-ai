# Reliability

Staying up, and failing safely when something underneath fails.

## REL-01 · Every call to another service has a timeout and handles failure

Every call to another service or API has a timeout, and a failed or slow response is handled: retried when that's safe, reported when it isn't.

**Why:** A call with no timeout waits forever, and one slow provider then ties up every request that depends on it.

**Ask:** Does every call to another service in this change have a timeout and handle failure?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## REL-02 · If the cache is down, requests are slower, not failed

When a cache is unavailable, requests fall back to working without it. They get slower; they don't fail.

**Why:** A cache is there to speed things up. If losing it takes the service down, it has become a single point of failure.

**Ask:** Does everything in this change keep working if the cache is down?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | – |

## REL-03 · Rate limiting never switches off

If the rate limiter's shared store is down, it falls back to a limit on each server and raises an alert. For sign-in, password reset, two-factor and one-time codes, the fallback is at least as strict as normal. Limiting is never simply switched off.

**Why:** Refusing every request would turn a cache outage into a total outage, and allowing unlimited sign-in attempts would open a window for guessing passwords.

**Ask:** If the rate limiter's store fails, does this change still limit requests, as strictly for sign-in?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | – |

## REL-04 · Configuration fails closed

An unrecognised environment name is treated as production, and one function decides which environment is running.

**Why:** A typo in an environment name must never switch production's safeguards off.

**Ask:** Does this change decide the environment anywhere other than the one function, or treat an unknown one as safe?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |

## REL-05 · Demo shortcuts can't run in production

Demo passwords, seed shortcuts and sandbox providers are refused when the app starts in production.

**Why:** A convenience left switched on in production is a back door.

**Ask:** Could any demo or test shortcut in this change run in production?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | A tool | High | Always | – |

## REL-06 · Every process runs the same safety checks at start-up

Every process that can move money or change data, including background workers and scripts, runs the same production safety checks when it starts as the main server.

**Why:** The worker nobody thought about is the one that runs with the unsafe setting.

**Ask:** Does every process in this change run the same start-up safety checks as the server?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | – |

## REL-07 · A dropped live connection loses nothing that mattered

Anything that matters is saved, not held only in a live connection, so a dropped connection loses nothing.

**Why:** Live connections drop all the time on mobile networks. State that only existed in the stream is gone.

**Ask:** Would a dropped connection lose anything that matters in this change?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | `real-time` | – |

## REL-08 · When the device holds the only copy, it's protected

When a person's device holds the only copy of their data, the app asks the platform to keep it rather than clear it when space runs short, and offers a way to back it up.

**Why:** Browsers and phones clear stored data under pressure, and for an offline-first app that can mean everything the person ever entered.

**Ask:** Is data that exists only on the device protected from being cleared, with a way to back it up?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `offline` | – |

## REL-09 · An app that caches itself still updates

An app that caches its own code to work offline checks for new versions and applies them, so every person gets updates.

**Why:** An app that always serves its cached copy never gets fixes, including the fix for the bug that's hurting people.

**Ask:** Will people running a cached copy of this app get the next version?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `offline` | – |
