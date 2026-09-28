# Design and accessibility

Design tokens, shared components, and making the product work for everyone.

## DES-01 · Design values come from tokens

Colours, spacing, corner radii and font sizes come from design tokens. None is written directly into a screen or component.

**Why:** A hard-coded value is missed by every rebrand, dark theme and accessibility fix that changes the tokens.

**Ask:** Does this change write a colour, spacing, radius or font size directly?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## DES-02 · Tokens come from one place, used by every app

Design tokens have one source, independent of any framework, and every app reads from it: light and dark palettes, type scale, spacing, radii and elevation.

**Why:** Two copies of the tokens drift, and the web and mobile apps stop looking like one product.

**Ask:** Does this change define design values anywhere other than the one token source?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## DES-03 · Token names say what they're for

Tokens are named for their purpose, such as `surface`, `accent` or `danger`, never for how they look, such as `blue500`.

**Why:** Names that describe purpose survive a rebrand and a dark theme. Names that describe a colour are wrong the day the colour changes.

**Ask:** Does any token in this change describe how it looks rather than what it's for?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Low | Always | – |

## DES-04 · Screens are built from the shared components

Screens are built only from the shared set of interface components. A screen that needs a new one adds it to the set, rather than building it inline.

**Why:** Inline one-offs are where inconsistency, missing states and accessibility gaps collect.

**Ask:** Does any screen in this change build an interface element instead of using a shared component?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |

## DES-05 · Every shared component comes with all its states

Every shared component has all its states: default, pressed, focused, disabled, loading, error and, where it applies, empty. One without them isn't finished.

**Why:** A missing state is found by a person at the worst moment: a button that looks tappable while it's still saving.

**Ask:** Does every shared component in this change have all its states?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## DES-06 · The danger colour means one thing

The danger colour is kept for the one meaning the project gives it, such as money going wrong or a safety warning. It's never decoration, and never a general error.

**Why:** A signal used for everything teaches people to ignore it, including the time it matters.

**Ask:** Is the danger colour in this change used for anything but its one meaning?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## DES-07 · Information is never shown by colour alone

Anything shown with colour, such as a status or an error, is also shown with text, a shape or an icon with a label.

**Why:** About one man in twelve has some colour blindness, and screen readers don't read colours at all.

**Ask:** Is any information in this change shown by colour alone?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [WCAG 2.2, 1.4.1, level A](https://www.w3.org/TR/WCAG22/#use-of-color) |

## DES-08 · Every control has an accessible name

Every button, link and control has a name a screen reader can announce, including buttons that show only an icon.

**Why:** An unlabelled control is announced as "button", and the person has no way to know what it does.

**Ask:** Does every control in this change have an accessible name?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | Medium | Always | [WCAG 2.2, 4.1.2, level A](https://www.w3.org/TR/WCAG22/#name-role-value) |

## DES-09 · Form fields have labels

Every form field has a visible label that stays visible while the person types. A placeholder isn't a label.

**Why:** A placeholder disappears as soon as someone types, and many screen readers don't announce it.

**Ask:** Does every form field in this change have a label, not just a placeholder?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Medium | Always | [WCAG 2.2, 3.3.2, level A](https://www.w3.org/TR/WCAG22/#labels-or-instructions); [WCAG 2.2, 1.3.1, level A](https://www.w3.org/TR/WCAG22/#info-and-relationships) |

## DES-10 · Everything works with a keyboard

On the web, everything a person can do with a mouse or a tap, they can do with a keyboard alone.

**Why:** Many people can't use a mouse, and a control a keyboard can't reach locks them out of the whole task.

**Ask:** Can everything in this change be done with a keyboard alone?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [WCAG 2.2, 2.1.1, level A](https://www.w3.org/TR/WCAG22/#keyboard) |

## DES-11 · Focus is always visible

The element that has keyboard focus is always clearly visible.

**Why:** Someone using a keyboard can't act on what they can't see is selected.

**Ask:** Is keyboard focus visible on everything in this change?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | [WCAG 2.2, 2.4.7, level AA](https://www.w3.org/TR/WCAG22/#focus-visible) |

## DES-12 · Dragging always has an alternative

Anything done by dragging can also be done without dragging, such as with buttons to move an item up or down.

**Why:** Dragging needs a steady hand and a pointer, which many people don't have.

**Ask:** Can everything this change does by dragging also be done another way?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [WCAG 2.2, 2.5.7, level AA](https://www.w3.org/TR/WCAG22/#dragging-movements) |

## DES-13 · Contrast meets WCAG AA in every theme

Text, icons and control borders have enough contrast against their background in every theme: at least 4.5 to 1 for normal text.

**Why:** Low contrast is unreadable in sunlight, on cheap screens, and for many people with low vision.

**Ask:** Does every colour pair in this change meet WCAG AA contrast, in every theme?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | [WCAG 2.2, 1.4.3, level AA](https://www.w3.org/TR/WCAG22/#contrast-minimum); [WCAG 2.2, 1.4.11, level AA](https://www.w3.org/TR/WCAG22/#non-text-contrast) |

## DES-14 · Text follows the person's text size

Text grows with the person's text size setting, and the layout still works when it does.

**Why:** People who need larger text set it once, and an app that ignores it is one they can't read.

**Ask:** Does all text in this change follow the person's text size setting?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [WCAG 2.2, 1.4.4, level AA](https://www.w3.org/TR/WCAG22/#resize-text) |

## DES-15 · Touch targets are large enough

Everything a person taps or clicks is large enough to hit reliably. Each platform's profile sets the size.

**Why:** Small targets cause mis-taps for everyone, and for people with tremors they make an app unusable.

**Ask:** Is every tap or click target in this change at least its platform's minimum size?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | [WCAG 2.2, 2.5.8, level AA](https://www.w3.org/TR/WCAG22/#target-size-minimum) |

## DES-16 · Animation respects the reduced-motion setting

Every animation that isn't essential stops or softens when the person has asked for reduced motion.

**Why:** Movement on screen can cause dizziness and nausea for people with vestibular disorders.

**Ask:** Does every animation in this change respect the reduced-motion setting?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Low | Always | [WCAG 2.2, 2.3.3, level AAA](https://www.w3.org/TR/WCAG22/#animation-from-interactions) |
