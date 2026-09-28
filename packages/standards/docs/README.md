# Peer AI standards

Generated from the rules in `src/core/`. Don't edit these pages by hand: change a rule, then run `pnpm --filter @peer-ai/standards generate`.

Every rule has an id, the rule in plain words, why it matters, a question a reviewer can answer, the stage it applies from, how it's checked and how serious breaking it usually is. The design is in [RFC 0003](../../../rfcs/0003-how-a-standard-is-written.md).

- **Checked by a tool:** a linter, the type checker, a test or a scanner fails the build.
- **Checked by AI review:** Peer AI's review checks it on every change and shows its evidence in a report.
- **Checked by a person:** a real decision, such as accepting a risk.

| Domain | Rules |
|--------|-------|
| Requirements | Coming |
| [Architecture](architecture.md) | 8 |
| [System design and scalability](system-design.md) | 6 |
| [API design](api-design.md) | 8 |
| [Frontend](frontend.md) | 9 |
| Mobile | Coming |
| [Design and accessibility](design-accessibility.md) | 16 |
| [Backend](backend.md) | 2 |
| [Data](data.md) | 5 |
| [Performance and caching](performance.md) | 7 |
| [Reliability](reliability.md) | 9 |
| [Security](security.md) | 22 |
| [Privacy and compliance](privacy-compliance.md) | 6 |
| [Testing](testing.md) | 9 |
| Delivery | Coming |
| Infrastructure and operations | Coming |
| AI features | Coming |
| [Code quality](code-quality.md) | 14 |
| [Money](money.md) | 12 |
| [Safety-critical data](safety-critical.md) | 6 |
