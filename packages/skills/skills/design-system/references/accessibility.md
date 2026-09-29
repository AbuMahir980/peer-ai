# Checking each rule

How to check each design and accessibility rule, from the tokens and the code. The rules' thresholds come from WCAG 2.2, level AA.

## Contents

- Tokens
- Components and states
- Meaning
- Access

## Tokens (DES-01 to DES-03)

- Search the screens for colours, sizes and fonts written as values, such as `#1a73e8`, `16px` or `fontSize: 18`, instead of tokens. Each is a stray value (DES-01).
- Find every token file. More than one source of the same tokens, such as a web copy and an app copy that differ, breaks DES-02.
- A token named for its look, such as `blue` or `grey-300`, breaks DES-03 when a screen uses it for a purpose. Name it for the purpose.

## Components and states (DES-04, DES-05, FE-07 to FE-09)

- For each shared component, list the states it handles. A button needs default, hover, focus, pressed, disabled and loading; an input needs error and disabled.
- A screen that builds its own button or card instead of the shared one breaks DES-04.
- A screen that fetches data needs loading, empty and error, and offline where the product works offline.

## Meaning (DES-06, DES-07)

- The danger colour is used only for danger: errors and destructive actions, never decoration.
- A status, a required field or an error shown only by colour also needs words or an icon with a name.

## Access (DES-08 to DES-16)

- **Names and labels:** every button and icon has an accessible name; every field has a visible label, not only a placeholder.
- **Keyboard:** everything clickable is a real button or link, reachable and usable by keyboard; focus is always visible.
- **Dragging:** anything done by dragging has another way, such as buttons.
- **Contrast:** work out the ratio from the token values. Normal text needs 4.5 to 1, large text and parts of controls 3 to 1, in every theme.
- **Text size:** text follows the person's text size setting rather than fixed sizes that block it.
- **Touch targets:** at least 24 by 24 points; 44 by 44 is the common aim on phones.
- **Motion:** animation respects the reduced-motion setting.
