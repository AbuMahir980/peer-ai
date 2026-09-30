# @peer-ai/standards

Peer AI's engineering standards: the rules every project follows, in any language.

- **Readable pages:** [`docs/`](https://github.com/AbuMahir980/peer-ai/blob/main/packages/standards/docs/README.md), one page per domain, and one per stack profile in [`docs/profiles/`](https://github.com/AbuMahir980/peer-ai/blob/main/packages/standards/docs/README.md#stack-profiles).
- **The rules themselves:** `src/core/`, written as typed data, so Peer AI's review can cite them and `standards_for_file` can hand the right ones to an AI tool.
- **Stack profiles:** `src/profiles/`, how to follow the core rules in one stack, and the tool that enforces each automatic rule.
- **The design:** [RFC 0003](https://github.com/AbuMahir980/peer-ai/blob/main/rfcs/0003-how-a-standard-is-written.md) for the rules, and [RFC 0006](https://github.com/AbuMahir980/peer-ai/blob/main/rfcs/0006-stack-profiles-and-their-enforcers.md) for the profiles.

## What every rule has

| Part | What it says |
|------|--------------|
| ID | Stable and never reused, such as `MONEY-01` |
| Rule | The rule, in plain words |
| Why | What goes wrong without it |
| Ask | The question a reviewer answers |
| Applies from | Prototype, MVP or production |
| Checked by | A tool, AI review, or a person |
| Severity | How serious breaking it usually is |
| Applies when | The traits a product needs for the rule to apply, such as `money` |
| Source | The outside standard it comes from, such as OWASP, where there is one |

## Choosing the rules that apply

```ts
import { rulesFor } from "@peer-ai/standards";

rulesFor({ stage: "mvp", traits: ["money"], domains: ["money", "code-quality"] });
```

## Adding or changing a rule

1. Add or edit it in `src/core/`. A rule with a missing part, an id that doesn't match its domain, or an id used twice fails the build.
2. Regenerate the pages: `pnpm --filter @peer-ai/standards generate`. A test fails if you forget.
3. Changing what an existing rule requires needs an RFC.

## Stack profiles

A profile rule has every part a core rule has, and four more:

| Part | What it says |
|------|--------------|
| Carries | The core rule it carries out, such as `CODE-14` |
| Architectures | The architecture labels it applies to, such as `layered`; none means every architecture |
| Default | A number or choice the project may change in `standards.overrides`, which `{value}` in its text stands for |
| Enforcer | For an automatic rule, the tool and setting that checks it, such as ESLint's `max-depth` |

A project lists its profiles in `standards.profiles`. A profile applies to a part whose stack has one of its tags, and brings the profiles it builds on:

```ts
import { profileRulesFor } from "@peer-ai/standards";

profileRulesFor({ listed: ["typescript"], stack: ["typescript", "react"], stage: "mvp" });
```

## Adding a profile or a profile rule

1. Add the profile to `src/profiles/`, and list it in `src/index.ts`. A rule that carries no core rule, an id without the profile's prefix, or an automatic rule without its enforcer and examples fails the build.
2. Give each automatic rule an example that must fail and one that must pass. The tests run the real tool on both: the compiler here, ESLint in `@peer-ai/eslint-config`, and Ruff in `peer-ai`, through `@astral-sh/ruff-wasm-nodejs`. The GitHub Actions profile's examples are proven in CI instead: `scripts/pipeline-proof.ts` installs the tools its pipeline uses and runs them on each example.
3. Regenerate the pages: `pnpm --filter @peer-ai/standards generate`.
4. A new profile doesn't need an RFC; changing what a rule requires does.
