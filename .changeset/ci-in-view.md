---
"peer-ai": minor
---

CI in view (RFC 0020, for #226). On GitHub, `next_work` reads each open item's pull request checks once, through `gh`, and keeps them for two minutes. The current item gets `pullRequest`, with its checks and any failing ones, and each summary gets `ci`: passing, pending, waiting, or failing with which. A failing check becomes the item's next action, "Fix CI: integration-tests, on 4f2a9c1.", and the instructions say to fix it first and tell the person. Peer AI's own gate being red while the item is short of ship is "waiting", not failing, and the gate's message on a pull request now ends with what it's waiting for: "Waiting for: a passing verify, code-review, the move to ship." Offline, without `gh` or a GitHub remote, nothing changes.
