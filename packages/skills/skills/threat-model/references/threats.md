# What can go wrong

Six kinds of threat, often called STRIDE. Walk each for every way in; most ways in have two or three that matter. The examples are from a made-up bicycle repair booking service.

## Contents

- Spoofing
- Tampering
- Repudiation
- Information disclosure
- Denial of service
- Elevation of privilege
- Threats that come with the product

## Spoofing: pretending to be someone else

- Guessing or reusing a password; a reset link that goes to the wrong person; a token that never expires.
- A webhook anyone can call, pretending to be the payment provider.
- Rules that answer it: SEC-12, SEC-14, SEC-04, MONEY-09.

## Tampering: changing what shouldn't change

- Changing a price or an amount the client sends, and the server trusting it.
- A query built by pasting in input.
- Stored text, such as a note someone else wrote, steering an AI model.
- Rules: MONEY-05, SEC-05, SEC-07, AI-04.

## Repudiation: denying you did it

- A refund or a cancellation with no record of who asked for it.
- Rules: SEC-24, MONEY-11.

## Information disclosure: seeing what you shouldn't

- Reading another cyclist's booking by changing an id in the address.
- Personal data in logs, in a URL, in an error, or sent to a service nobody was told about.
- A secret built into the app, where anyone can read it.
- Rules: SEC-01, PRIV-01, SEC-22, SEC-09, PRIV-04, SEC-11.

## Denial of service: stopping it working

- Endless sign-in attempts, huge uploads, or a slow outside service that holds every request.
- An AI feature anyone can call without limit, running up the bill.
- Rules: REL-03, SEC-19, REL-01, AI-07.

## Elevation of privilege: doing what you're not allowed to

- A customer reaching a mechanic's or an admin's action.
- An AI model's output calling a tool that changes someone else's booking.
- A permission checked only in the app, not on the server.
- Rules: SEC-02, SEC-03, AI-05, AI-01.

## Threats that come with the product

Each trait brings its own attackers:

- **Money:** fraud, double payments, refunds to the wrong account. MONEY-08, MONEY-09.
- **Safety-critical data:** a check that warns instead of blocking. SAFE-01.
- **Several audiences:** one organisation reading another's data. SEC-01, SEC-04.
- **Uploads:** a file that isn't what it claims, or runs when opened. SEC-18, SEC-19.
- **Offline:** a lost device holding the only copy. REL-08.
- **AI features:** instructions hidden in content, and output treated as fact or as a command. AI-01, AI-02, AI-04.
