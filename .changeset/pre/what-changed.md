---
"peer-ai": minor
---

At a person's first session after the project's Peer AI version changes, `next_work` gives `whatChanged`: a line per change since their last session, from the changelog that ships with the package (RFC 0014). The AI tool tells them in a few plain words, once, then carries on. Each machine remembers the version of its last session per project, in its cache folder, never in the project.
