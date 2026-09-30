# Checking each rule

Examples are from a made-up bicycle repair booking service.

## Contents

- Tokens: DES-01 to DES-03
- Components and states: DES-04, DES-05, FE-07, FE-09
- Meaning: DES-06, DES-07
- Reading: DES-13, DES-14

## Tokens

- **DES-01, values come from tokens:** search each screen and component for colours, sizes, radii and fonts written as values, such as `#2b6cb0`, `padding: 16` or `fontSize: 15`. Each is a `value` and a finding, unless it's a token's own definition.
- **DES-02, one source:** every app reads the same token file. Two copies that differ are a finding.
- **DES-03, named for purpose:** `danger`, `surface`, `accent`; not `red`, `grey300`.

## Components and states

- **DES-04, shared components:** a screen that builds its own button, card or field inline, when the shared set has one or should, is a finding.
- **DES-05, every state:** each shared component handles default, pressed, focused, disabled, loading and error, and empty where it applies.
- **FE-07, loading, empty and error:** each screen that waits for data shows all three. An endless spinner is a bug.
- **FE-09, offline (offline products):** the screen says there's no connection and keeps what the person did.

## Meaning

- **DES-06, the danger colour:** used only for the meaning the project gives it, never as decoration or a general error.
- **DES-07, never colour alone:** each `indicator` also has text, a shape or a labelled icon.

## Reading

- **DES-13, contrast:** work out the ratio from the colour values in each theme: 4.5 to 1 for normal text, 3 to 1 for large text and controls. A colour written straight into a screen is checked too.
- **DES-14, text size:** text grows with the person's setting; fixed sizes that block it, or turning scaling off, are findings.
