---
"peer-ai": minor
"@peer-ai/workflow": minor
---

Peer AI picks the skill, so nobody has to remember 29 names (RFC 0004, section 8). `next_work` names the installed skill that fills each gap (`useSkill`). When a work item moves to verify, Peer AI works out the reviews it needs from the files the change touched, each with its reason, and keeps them on the item (`requiredReviews`); `next_work` lists them. `peer-ai check` and `advance_work_item` warn about a missing required review for an MVP and refuse in production. `activities.verify.reviews` in the config can require more reviews, or skip one with a reason. Only reviews whose skill exists are required.
