import type { ProfileInput } from "../profile.ts";

// React on the web, and the base for React Native and Next.js. Examples are from a made-up
// bicycle repair booking service.

/** A component file `lines` lines long, of one-line components. */
function components(lines: number): string {
  return `${Array.from({ length: lines }, (_, i) => `export const Bay${String(i)} = () => <li>Bay ${String(i)}</li>;`).join("\n")}\n`;
}

export const react: ProfileInput = {
  id: "react",
  name: "React",
  prefix: "REACT",
  about:
    "React components on the web: hooks that behave, state that isn't copied, components that stay small, no HTML from outside, and the accessibility checks a linter can make. React Native and Next.js build on it.",
  stacks: ["react"],
  extends: ["typescript"],
  rules: [
    {
      id: "REACT-01",
      title: "Hooks are called the same way on every render",
      rule: "Hooks are called at the top of a component or another hook, never inside a condition, a loop or a callback.",
      why: "React matches each hook to its state by the order of the calls. A hook called conditionally gets another hook's state, a bug that appears only on some renders.",
      ask: "Is any hook in this change called conditionally, in a loop or in a callback?",
      stage: "prototype",
      check: "auto",
      severity: "high",
      carries: "CODE-16",
      enforcer: { tool: "eslint", rule: "react-hooks/rules-of-hooks" },
      examples: {
        file: "example.tsx",
        fails:
          'import { useState } from "react";\nexport function Notes({ open }: { open: boolean }) {\n  if (open) {\n    const [note] = useState("");\n    return <p>{note}</p>;\n  }\n  return null;\n}\n',
        passes:
          'import { useState } from "react";\nexport function Notes({ open }: { open: boolean }) {\n  const [note] = useState("");\n  return open ? <p>{note}</p> : null;\n}\n',
      },
    },
    {
      id: "REACT-02",
      title: "State isn't copied from other data by an effect",
      rule: "A value that follows from props or state is worked out during render. An effect never copies it into state of its own.",
      why: "A copy is out of date for a render, and wrong for good when the effect misses a change.",
      ask: "Does any effect in this change set state from other props or state?",
      stage: "prototype",
      check: "auto",
      severity: "medium",
      carries: "FE-02",
      enforcer: { tool: "eslint", rule: "react-hooks/no-deriving-state-in-effects" },
      examples: {
        file: "example.tsx",
        fails:
          'import { useEffect, useState } from "react";\nexport function Total({ labour, parts }: { labour: number; parts: number }) {\n  const [total, setTotal] = useState(0);\n  useEffect(() => {\n    setTotal(labour + parts);\n  }, [labour, parts]);\n  return <p>{total}</p>;\n}\n',
        passes:
          "export function Total({ labour, parts }: { labour: number; parts: number }) {\n  const total = labour + parts;\n  return <p>{total}</p>;\n}\n",
      },
    },
    {
      id: "REACT-03",
      title: "A component file longer than {value} lines prompts a question",
      rule: "A component file over {value} lines, not counting blank lines and comments, fails the lint, so someone asks what could move out: a hook, a child component, or plain logic. Where nothing should, a disable comment at the top says why.",
      why: "A component that keeps growing usually holds several jobs, and every change to one re-renders and re-tests the rest.",
      ask: "Has any component file grown past {value} lines, and does each that stays say why?",
      stage: "mvp",
      check: "auto",
      severity: "low",
      carries: "CODE-10",
      default: { value: 150, unit: "lines" },
      enforcer: {
        tool: "eslint",
        rule: "max-lines",
        options: [{ max: "$value", skipBlankLines: true, skipComments: true }],
        files: ["**/*.tsx", "**/*.jsx"],
        ignores: ["**/*.test.*", "**/*.spec.*", "**/*.stories.*"],
      },
      examples: {
        file: "example.tsx",
        fails: (value) => components(Number(value) + 1),
        passes: (value) => components(Number(value)),
      },
    },
    {
      id: "REACT-04",
      title: "No HTML from outside is put into the page",
      rule: "`dangerouslySetInnerHTML` isn't used. Content from outside, such as a supplier's description, is shown as text, or through a sanitiser whose use a reviewer can see.",
      why: "HTML from outside can carry a script, which then runs as the person viewing the page.",
      ask: "Does this change use dangerouslySetInnerHTML?",
      stage: "prototype",
      check: "auto",
      severity: "high",
      carries: "SEC-08",
      enforcer: { tool: "eslint", rule: "react-dom/no-dangerously-set-innerhtml" },
      examples: {
        file: "example.tsx",
        fails:
          "export function PartNotes({ html }: { html: string }) {\n  return <div dangerouslySetInnerHTML={{ __html: html }} />;\n}\n",
        passes: "export function PartNotes({ text }: { text: string }) {\n  return <div>{text}</div>;\n}\n",
      },
    },
    {
      id: "REACT-05",
      title: "Every control has a name a screen reader can say",
      rule: "Every button, link and other control has a name a screen reader can announce: its text, or an `aria-label` when it shows only an icon.",
      why: 'A button that shows only an icon is announced as "button", with nothing to say what it does.',
      ask: "Does every control in this change have a name, including those that show only an icon?",
      stage: "prototype",
      check: "auto",
      severity: "medium",
      carries: "DES-08",
      // Form fields are REACT-06's: a field inside its label is named, which this rule can't see.
      enforcer: {
        tool: "eslint",
        rule: "jsx-a11y/control-has-associated-label",
        options: [{ ignoreElements: ["input", "select", "textarea"] }],
      },
      examples: {
        file: "example.tsx",
        fails:
          'export function Close({ onClose }: { onClose: () => void }) {\n  return (\n    <button type="button" onClick={onClose}>\n      <svg aria-hidden="true" />\n    </button>\n  );\n}\n',
        passes:
          'export function Close({ onClose }: { onClose: () => void }) {\n  return (\n    <button type="button" aria-label="Close" onClick={onClose}>\n      <svg aria-hidden="true" />\n    </button>\n  );\n}\n',
      },
    },
    {
      id: "REACT-06",
      title: "Every label is tied to its field",
      rule: "Every `label` is tied to its field, by wrapping it or by `htmlFor`, so the field is named when it's reached.",
      why: "A label that sits beside a field without being tied to it isn't read out when the field is reached, so a screen reader announces an unnamed field.",
      ask: "Is every label in this change tied to its field?",
      stage: "prototype",
      check: "auto",
      severity: "medium",
      carries: "DES-09",
      enforcer: { tool: "eslint", rule: "jsx-a11y/label-has-associated-control", options: [{ assert: "either" }] },
      examples: {
        file: "example.tsx",
        fails:
          'export function Serial() {\n  return (\n    <div>\n      <label>Frame number</label>\n      <input id="serial" />\n    </div>\n  );\n}\n',
        passes:
          'export function Serial() {\n  return (\n    <label>\n      Frame number\n      <input id="serial" />\n    </label>\n  );\n}\n',
      },
    },
    {
      id: "REACT-07",
      title: "Anything clickable works with a keyboard",
      rule: "An element with `onClick` also answers the keyboard. Better, it's a `button` or a link, which do both.",
      why: "A clickable `div` can't be reached or used by someone who doesn't use a mouse.",
      ask: "Does anything clickable in this change ignore the keyboard?",
      stage: "mvp",
      check: "auto",
      severity: "medium",
      carries: "DES-10",
      enforcer: { tool: "eslint", rule: "jsx-a11y/click-events-have-key-events" },
      examples: {
        file: "example.tsx",
        fails:
          'export function Cancel({ onCancel }: { onCancel: () => void }) {\n  return <div role="button" tabIndex={0} onClick={onCancel}>Cancel booking</div>;\n}\n',
        passes:
          'export function Cancel({ onCancel }: { onCancel: () => void }) {\n  return <button type="button" onClick={onCancel}>Cancel booking</button>;\n}\n',
      },
    },
    {
      id: "REACT-08",
      title: "Server data comes through a query cache, not an effect",
      rule: "In a component that runs in the browser, data from the server is read through the project's query cache, such as TanStack Query or SWR, not fetched in `useEffect` and kept in `useState`. Components that render on the server fetch there instead.",
      why: "Fetching in an effect repeats the same request in every component that needs it, races when inputs change, and leaves each copy stale in its own way.",
      ask: "Does this change fetch server data in an effect and keep it in component state?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "FE-01",
    },
    {
      id: "REACT-09",
      title: "Long lists draw only what's on screen",
      rule: "A list that can grow past a screenful, such as every past booking, is virtualised, so only the rows in view are drawn.",
      why: "Drawing every row makes the screen slower with every row the business adds.",
      ask: "Does this change draw a list that can grow long without virtualising it?",
      stage: "mvp",
      check: "ai-review",
      severity: "low",
      carries: "PERF-05",
    },
    {
      id: "REACT-10",
      title: "An effect stops what it starts",
      rule: "An effect that starts something, such as a timer, a subscription or a request, returns a cleanup that stops it.",
      why: "Without cleanup, work carries on after the component is gone, and sets state nobody will see or calls the server twice.",
      ask: "Does every effect in this change stop what it starts?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "PERF-06",
    },
  ],
};
