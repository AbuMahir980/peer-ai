# Using every control

DES-08 to DES-12. The code examples name web and React Native properties; the stack profile names the project's own.

## DES-08: every control has a name

- **Look at:** each button, link and icon button.
- **Pass:** visible text inside it, or an accessible name on it, such as `aria-label` on the web or `accessibilityLabel` in a phone app. An icon-only button needs the name; the icon's file name isn't one.
- **Fail:** an icon button with no name; a link whose only text is "click here" when several on the screen say the same.

## DES-09: every field has a visible label

- **Look at:** each form field.
- **Pass:** a label that stays visible while the person types, tied to its field, such as a `label` element with `for`, or wrapping the input.
- **Fail:** a placeholder used as the label: it disappears on typing and is often too pale to read.

## DES-10: everything works with a keyboard (web)

- **Look at:** each control, and each clickable element that isn't a button or a link.
- **Pass:** real buttons and links, which a keyboard reaches and presses. A custom control has a role, can take focus, and answers Enter and Space.
- **Fail:** a `div` or `span` with a click handler and nothing else; a menu that opens only on hover.
- **Not applicable:** a phone app with no keyboard use. Say so.

## DES-11: focus is always visible

- **Look at:** global styles and each component's focus style.
- **Pass:** a visible focus indicator on every control, such as the browser's own or a designed one.
- **Fail:** `outline: none` with nothing in its place.

## DES-12: dragging has another way

- **Look at:** each list or board that reorders or moves by dragging.
- **Pass:** buttons or a menu that do the same thing, such as "Move up" and "Move down".
- **Fail:** reordering that only works by dragging.
