# peer-ai-eslint-config

The ESLint settings for the stack profiles a project lists in `peer-ai.config.json` ([RFC 0006](https://github.com/AbuMahir980/peer-ai/blob/main/rfcs/0006-stack-profiles-and-their-enforcers.md)).

```js
// eslint.config.js
import peerAi from "peer-ai-eslint-config";

export default [...peerAi(), /* your own settings */];
```

For each part of the project, `peerAi()` turns on the automatic rules its profiles enforce with ESLint: at the project's stage, with its traits and architecture, and with any value it changed in `standards.overrides`. Rules set aside in `standards.exceptions` are left out. While `standards.enforcement` is `report`, or a rule is in `standards.deferred`, its rules are warnings instead of errors ([RFC 0011](https://github.com/AbuMahir980/peer-ai/blob/main/rfcs/0011-adopting-peer-ai-on-an-existing-codebase.md)). Your own settings come after, so they win where both set the same rule.

- **Peer AI's rules run under Peer AI's names,** such as `peer-ai/max-depth` or `peer-ai-jsx-a11y/alt-text`. So they sit beside the plugins and settings your project has, whatever they are: your own `jsx-a11y` or `no-restricted-syntax` neither clashes with them nor replaces them. To leave a line alone, name Peer AI's rule and say why: `// eslint-disable-next-line peer-ai/max-depth -- the booking rules nest one level deeper`.
- **Install it beside ESLint and the plugins your profiles use.** `eslint` and `typescript-eslint` are peer dependencies, and the other plugins are optional ones.
- **It finds `peer-ai.config.json` from the folder ESLint runs in, or above it,** and every file pattern is relative to that folder. So an `eslint.config.js` at the root and one inside a part both work, and linting from a part's folder works too.
- **Each part gets its own rules.** A part nested inside another is left to its own settings.
- **Rules that need type information run on TypeScript files only,** through the project's tsconfig files. Each TypeScript file must be in one: a file outside every tsconfig, such as a loose script, fails to lint. Add it to a tsconfig, or ignore it in your own settings.

`peer-ai doctor` checks your ESLint config uses these settings, and says what to add when it doesn't.

## The plugins each profile needs

Install `eslint` and `typescript-eslint` always, and the plugins for the profiles you list. A profile needs the plugins of the profiles it builds on too.

| Profile | Plugins |
|---------|---------|
| `typescript`, `node`, `express`, `nestjs`, `fastify` | none beyond typescript-eslint |
| `react` | `eslint-plugin-react-hooks`, `eslint-plugin-react-dom`, `eslint-plugin-jsx-a11y-x` |
| `react-native` | the React plugins |
| `next` | the React plugins, and `@next/eslint-plugin-next` |

If a plugin is missing, `peerAi()` says which one to install.

## Proven against ESLint

Every rule these settings turn on has an example that must fail and one that must pass. The tests run ESLint on both, through the same settings a project gets, and again with a changed value where the rule has one. A setting that can't fail can't ship.
