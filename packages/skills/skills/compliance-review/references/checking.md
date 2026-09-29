# Checking each rule

Examples are from a made-up bicycle repair booking service. The laws named are pointers for the reader, not legal advice.

## Contents

- What's collected: PRIV-03, MOB-05
- Where it goes: PRIV-04, PRIV-05, AI-03, SEC-22, SEC-15
- Logs and leaks: PRIV-01, MOB-02
- Keeping it: PRIV-06, PRIV-02
- Card payments: MONEY-12
- Where the rules come from

## What's collected

- **PRIV-03, only what's needed:** each `field` and `collection` has a reason in the feature. Fail an exact location where a town would do, or location collected all the time for a feature used now and then.
- **MOB-05, permissions:** each device permission is asked for when its feature is used, says why, and at the least level, such as location while in use rather than always.

## Where it goes

- **PRIV-04, only where people were told:** each `destination` that's an outside service is one the privacy notice names, and analytics stays off until the person opts in. Check where the service is set up, not only where it's called.
- **PRIV-05, hidden details removed:** photos and files sent anywhere have their hidden details, such as where a photo was taken, removed first.
- **AI-03, AI services:** people are told what goes to an AI model before it goes, and personal data is sent only when the feature needs it.
- **SEC-22, never in a URL:** personal data and tokens travel in the body or headers.
- **SEC-15, always encrypted:** every destination is reached over TLS, with no platform setting allowing plain HTTP.

## Logs and leaks

- **PRIV-01, never logged:** no log line holds a password, token, card detail or personal field. Look at each log call near a `field`, and at request logging that prints whole bodies.
- **MOB-02, phones:** sensitive data stays out of the device log, backups, the clipboard and the app switcher's screenshot.

## Keeping it

- **PRIV-06 (production):** each `retention` has a set time and a job that deletes it.
- **PRIV-02:** seed data and fixtures are invented.

## Card payments

- **MONEY-12:** card details go straight from the person to the payment provider, such as its hosted form or its own client library. Your servers see only the provider's token and at most the last four digits. A card number or security code received, stored or logged is critical, and puts the whole product in scope for the card industry's standard, PCI DSS.

## Where the rules come from

The privacy rules reflect what data protection laws commonly require: collect little, say where it goes, get consent where needed, keep it no longer than needed, keep it safe. The UK GDPR, the EU GDPR and Nigeria's NDPA are examples. A project's rule packs, in `compliance.packs`, add a law's specific duties when they're installed. What a specific law requires of this product, such as its lawful basis or a data protection impact assessment, is a question for someone qualified.
