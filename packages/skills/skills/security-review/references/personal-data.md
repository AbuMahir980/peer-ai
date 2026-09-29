# Personal data

PRIV-01 to PRIV-06. Compare every `service` and `store` item with what the code sends to it and keeps in it.

## PRIV-01: no secrets or personal data in logs

**Fail** when a log call writes any of:

- a request body or headers;
- a whole user object;
- a token, a password or payment details;
- personal fields.

**Pass** evidence: a redaction filter in the logging layer that every logger goes through, and log calls that pass specific safe fields.

## PRIV-02: no real personal data in the repository

**Fail** on fixtures, seeds, screenshots or tests holding data that is evidently real, such as addresses at real companies' domains or real phone numbers.

When you can't tell whether data is real, mark the line `not-checked` and say so. Don't guess.

## PRIV-03: only what's needed is collected

**Fail** when a feature collects more than it needs, keeps collecting after it's done, or collects at a higher precision than it needs. For example:

- an exact location where a rough area would do;
- location all the time when it's needed only while searching;
- a full date of birth when only an age check is needed.

## PRIV-04: personal data goes only where people have been told

**Fail** when:

- personal data goes to a service people weren't told about;
- analytics or telemetry run before the person opts in;
- data goes to a service without the consent the law needs.

Check the service where it's set up, not only where one call sends data: whether it starts collecting before the person opts in, and what every event it sends carries. A missing consent check is one finding at the setup, however many calls send data through it. A call that sends extra personal data, such as a location, is a finding of its own.

The evidence is the code that sets up or sends to the service, and the consent check before it, or its absence.

## PRIV-05: hidden details removed before files leave

**Fail** when a photo or file is uploaded, shared or sent to another service with details the person may not know it carries, such as where a photo was taken, its camera details or a document's author.

**Pass** when the metadata is stripped before sending, or the person chose to keep it.

## PRIV-06: kept only as long as needed (production)

**Pass** when each kind of personal data has a set time it's kept, and a scheduled job deletes it.

**Fail** when personal data is kept for ever by default, or a deletion job exists but never runs.
