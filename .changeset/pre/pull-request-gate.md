---
"peer-ai": minor
---

On a pull request, `peer-ai check` now fails until the work item on its branch is at ship, so a change can't merge before it's verified and reviewed (RFC 0010). It reads the branch from the pull request on GitHub Actions, or from the new `--branch`; a branch with no work item, such as a dependency update, passes. The reviews an item needs now come from its own commits since it started, so a stacked branch isn't asked for its parents' reviews and a merge can't erase them, and whitespace-only changes no longer count. `peer-ai doctor`, and through it `next_work`, warns when an item is still at prepare while its branch has commits, or when its verify or a review looked at an older commit. The CI gate's workflow now checks out the pull request's own commit, with its history.
