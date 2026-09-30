# React

React components on the web: hooks that behave, state that isn't copied, components that stay small, no HTML from outside, and the accessibility checks a linter can make. React Native and Next.js build on it.

List it in `standards.profiles` as `react`. It applies to parts tagged `react`. It builds on [typescript](typescript.md), which apply wherever it does.

## REACT-01 · Hooks are called the same way on every render

Hooks are called at the top of a component or another hook, never inside a condition, a loop or a callback.

**Why:** React matches each hook to its state by call order. A hook called conditionally gets another hook's state, which the code can't describe.

**Ask:** Is any hook in this change called conditionally, in a loop or in a callback?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | High | [CODE-13](../code-quality.md) | Any | `react-hooks/rules-of-hooks`, in ESLint |

## REACT-02 · State isn't copied from other data by an effect

A value that follows from props or state is worked out during render. An effect never copies it into state of its own.

**Why:** A copy is out of date for a render, and wrong for good when the effect misses a change.

**Ask:** Does any effect in this change set state from other props or state?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | Medium | [FE-02](../frontend.md) | Any | `react-hooks/no-deriving-state-in-effects`, in ESLint |

## REACT-03 · A component file longer than 150 lines prompts a question

A component file over 150 lines, not counting blank lines and comments, fails the lint, so someone asks what could move out: a hook, a child component, or plain logic. Where nothing should, a disable comment at the top says why.

**Why:** A component that keeps growing usually holds several jobs, and every change to one re-renders and re-tests the rest.

**Ask:** Has any component file grown past 150 lines, and does each that stays say why?

**Default:** 150 lines. A project changes it in `standards.overrides`, with its reason.

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Low | [CODE-10](../code-quality.md) | Any | `max-lines`, in ESLint |

## REACT-04 · No HTML from outside is put into the page

`dangerouslySetInnerHTML` isn't used. Content from outside, such as a supplier's description, is shown as text, or through a sanitiser whose use a reviewer can see.

**Why:** HTML from outside can carry a script, which then runs as the person viewing the page.

**Ask:** Does this change use dangerouslySetInnerHTML?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | High | [SEC-08](../security.md) | Any | `react-dom/no-dangerously-set-innerhtml`, in ESLint |

## REACT-05 · Every image says what it shows

Every `img` has `alt` text saying what it shows, or an empty `alt` when it's only decoration.

**Why:** A screen reader reads an image without alt text as its file name, or not at all.

**Ask:** Does every image in this change have alt text?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | Medium | [DES-08](../design-accessibility.md) | Any | `jsx-a11y/alt-text`, in ESLint |

## REACT-06 · Every form field has a label

Every `label` is tied to its field, by wrapping it or by `htmlFor`, so the field is named when it's reached.

**Why:** A field named only by placeholder text or position is unnamed to a screen reader, and its placeholder disappears as soon as someone types.

**Ask:** Is every label in this change tied to its field?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Prototype | A tool | Medium | [DES-09](../design-accessibility.md) | Any | `jsx-a11y/label-has-associated-control`, in ESLint |

## REACT-07 · Anything clickable works with a keyboard

An element with `onClick` also answers the keyboard. Better, it's a `button` or a link, which do both.

**Why:** A clickable `div` can't be reached or used by someone who doesn't use a mouse.

**Ask:** Does anything clickable in this change ignore the keyboard?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Medium | [DES-10](../design-accessibility.md) | Any | `jsx-a11y/click-events-have-key-events`, in ESLint |

## REACT-08 · Server data comes through a query cache, not an effect

Data from the server is read through the project's query cache, such as TanStack Query or SWR, not fetched in `useEffect` and kept in `useState`.

**Why:** Fetching in an effect repeats the same request in every component that needs it, races when inputs change, and leaves each copy stale in its own way.

**Ask:** Does this change fetch server data in an effect and keep it in component state?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [FE-01](../frontend.md) | Any | – |

## REACT-09 · Long lists draw only what's on screen

A list that can grow past a screenful, such as every past booking, is virtualised, so only the rows in view are drawn.

**Why:** Drawing every row makes the screen slower with every row the business adds.

**Ask:** Does this change draw a list that can grow long without virtualising it?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Low | [PERF-05](../performance.md) | Any | – |

## REACT-10 · An effect stops what it starts

An effect that starts something, such as a timer, a subscription or a request, returns a cleanup that stops it.

**Why:** Without cleanup, work carries on after the component is gone, and sets state nobody will see or calls the server twice.

**Ask:** Does every effect in this change stop what it starts?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [PERF-06](../performance.md) | Any | – |
