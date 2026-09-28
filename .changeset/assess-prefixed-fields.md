---
"peer-ai": patch
---

`assess` now finds personal data in column names with a prefix, such as `recipient_phone` or `home_address`. Before, an underscore in front of the word hid it.
