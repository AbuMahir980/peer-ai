---
"peer-ai": patch
---

The reviews a change needs come from the right files:

- **Only the branch's own files count (#229).** After a branch merges the default branch to stay current, the files that merge brought in, which other items changed and reviewed, no longer ask for reviews. A file counts when the branch's own commits, or its uncommitted changes, touched it.
- **An AI feature review needs an import of a model's library (#232),** on an import line, not the library's name anywhere in a file. A string naming a provider, or "replicate" in a comment, no longer asks for one.
- **A design system asks for design review (#237).** A change to a screen asks for `design-review` when the project map finds a design system, such as design tokens or a design document, even without a `design` section in the config.
