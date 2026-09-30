# @peer-ai/eslint-config

The ESLint settings for the stack profiles a project lists in `peer-ai.config.json` ([RFC 0006](../../rfcs/0006-stack-profiles-and-their-enforcers.md)).

```js
// eslint.config.js
import peerAi from "@peer-ai/eslint-config";

export default [...peerAi(), /* your own settings */];
```

For each part of the project, `peerAi()` turns on the automatic rules its profiles enforce with ESLint: at the project's stage, with its traits and architecture, and with any value it changed in `standards.overrides`. Rules set aside in `standards.exceptions` are left out. Your own settings come after, so they win where both set the same rule.

- **Install it beside ESLint and its plugins.** `eslint`, `typescript-eslint` and the plugins the profiles use are peer dependencies: ESLint refuses two copies of one plugin, so these settings share your project's copy.
- **It finds `peer-ai.config.json` from the folder ESLint runs in, or above it,** and every file pattern is relative to that folder. So an `eslint.config.js` at the root and one inside a part both work, and linting from a part's folder works too.
- **Each part gets its own rules.** A part nested inside another is left to its own settings.
- **Rules that need type information run on TypeScript files only,** through the project's tsconfig files. Each TypeScript file must be in one: a file outside every tsconfig, such as a loose script, fails to lint. Add it to a tsconfig, or ignore it in your own settings.

`peer-ai doctor` checks your ESLint config uses these settings, and says what to add when it doesn't.

## Proven against ESLint

Every rule these settings turn on has an example that must fail and one that must pass. The tests run ESLint on both, through the same settings a project gets, and again with a changed value where the rule has one. A setting that can't fail can't ship.
