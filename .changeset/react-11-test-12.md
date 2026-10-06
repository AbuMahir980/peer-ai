---
"peer-ai-standards": minor
"peer-ai-skills": minor
---

Two new rules (RFC 0019, for #202):

- **REACT-11: a hook is called by its own name, never passed around as a value.** It's enforced by ESLint's `react-hooks/hooks`, which `peer-ai-eslint-config` turns on for React, React Native and Next.js parts, and catches a hook passed as an argument. `code-review` reads for what the tool can't see: a hook renamed, passed as a prop, or kept in an object. Under the React Compiler, each breaks the component on a later render.
- **TEST-12: tests run the code the build ships,** with the same compiler, transforms and flags, such as the React Compiler. Where a test runner can't, an end-to-end check of the built app covers the difference. `test-strategy` checks it for the project, `code-review` for a change to the build or test settings, and `qa-acceptance` for an item that adds a compiler or transform.

`code-review` also gains a guide for CODE-16, the framework's own rules: a tool's check counts as evidence only when it runs for the file.
