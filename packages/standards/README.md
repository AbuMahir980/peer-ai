# @peer-ai/standards

Peer AI's engineering standards: the rules every project follows, in any language.

- **Readable pages:** [`docs/`](docs/), one page per domain.
- **The rules themselves:** `src/core/`, written as typed data, so Peer AI's review can cite them and `standards_for_file` can hand the right ones to an AI tool.
- **The design:** [RFC 0003](../../rfcs/0003-how-a-standard-is-written.md).

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
