# Severity

A finding takes the severity of the rule it breaks: each rule in `rules.md` states its level. Never invent a level. The scale below is what each level means, so the level can be explained to a person.

| Level | Means | Examples |
|-------|-------|----------|
| critical | It causes harm now: a security hole, data lost or exposed, a law broken, or the service going down | A password or key in the code; a full card number stored; SQL injection; a database change that deletes user data |
| high | It is likely to hurt users or the business soon | A missing permission check; an API that no longer does what it promised; personal data written to logs |
| medium | A real problem with limited reach | A database query with no limit on a growing table; a screen a screen reader can't use; new behaviour with no test |
| low | It makes the code harder to change safely | A project standard broken in a way that affects nothing yet |

A finding the project has knowingly accepted is recorded with `status: "accepted"`, who accepted it and why. Only a person accepts a risk; a review never does.
