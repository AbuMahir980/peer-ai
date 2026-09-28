import type { RuleInput } from "../rule.ts";

// Personal data, and handling it the way the law and the people it belongs to expect. The laws
// themselves, such as the NDPA or the GDPR, are rule packs a project chooses in its config.

const ASVS = "OWASP ASVS 5.0";
const V14 = "https://github.com/OWASP/ASVS/blob/master/5.0/en/0x23-V14-Data-Protection.md";
const V16 = "https://github.com/OWASP/ASVS/blob/master/5.0/en/0x25-V16-Security-Logging-and-Error-Handling.md";

export const privacyCompliance = [
  {
    id: "PRIV-01",
    domain: "privacy-compliance",
    title: "Logs never hold secrets, tokens or personal data",
    rule: "Passwords, tokens, keys, payment details and personal data are never written to logs. A redaction filter in the logging layer removes them, and it can't be bypassed.",
    why: "Logs are copied, shipped and kept far more widely than the data they came from, and a password in a log is a password everyone with log access has.",
    ask: "Could anything in this change write a secret or personal data to a log?",
    stage: "prototype",
    check: "auto",
    severity: "high",
    sources: [{ name: ASVS, ref: "16.2.5, level 2", url: V16 }],
  },
  {
    id: "PRIV-02",
    domain: "privacy-compliance",
    title: "No real personal data in the repository",
    rule: "Fixtures, seed data, screenshots, tests and examples use invented data. No real person's data goes into the repository.",
    why: "Everything in a repository is copied to every machine that clones it, forever.",
    ask: "Does this change add any real person's data to the repository?",
    stage: "prototype",
    check: "ai-review",
    severity: "high",
  },
  {
    id: "PRIV-03",
    domain: "privacy-compliance",
    title: "Only what's needed is collected",
    rule: "A feature collects only the personal data it needs, at the precision it needs, and only while it needs it: a rough area rather than an exact location, and location only while searching rather than all the time.",
    why: "Data you don't collect can't leak, can't be misused and doesn't need protecting. Collecting only what's needed is also what data protection laws require.",
    ask: "Does this change collect more personal data, or more precise data, than it needs?",
    stage: "mvp",
    check: "ai-review",
    severity: "high",
  },
  {
    id: "PRIV-04",
    domain: "privacy-compliance",
    title: "Personal data goes only where people have been told",
    rule: "Personal data is sent only to the services people have been told about, with their consent where the law requires it. Analytics and telemetry are off until the person opts in.",
    why: "Sending data to a third party people didn't know about breaks their trust, and in most countries it breaks the law too.",
    ask: "Does this change send personal data anywhere people haven't been told about?",
    stage: "mvp",
    check: "ai-review",
    severity: "high",
    sources: [{ name: ASVS, ref: "14.2.3, level 2", url: V14 }],
  },
  {
    id: "PRIV-05",
    domain: "privacy-compliance",
    title: "Hidden details are removed from files before they leave",
    rule: "Before a photo or file is shared or sent to another service, details the person may not know it carries, such as where a photo was taken, are removed, unless the person chose to keep them.",
    why: "A photo's location can reveal where someone lives, and most people have no idea it's there.",
    ask: "Does this change send or share files with hidden details, such as location, still in them?",
    stage: "mvp",
    check: "ai-review",
    severity: "high",
    sources: [{ name: ASVS, ref: "14.2.8, level 3", url: V14 }],
  },
  {
    id: "PRIV-06",
    domain: "privacy-compliance",
    title: "Personal data is kept only as long as it's needed",
    rule: "Each kind of personal data has a set time it's kept, such as location from a live stream, and a scheduled job deletes it when that time is up.",
    why: 'Data kept forever is data that can leak forever, and "we\'ll delete it later" never happens without a job that does it.',
    ask: "Does the personal data in this change have a set time it's kept, and a job that deletes it?",
    stage: "production",
    check: "ai-review",
    severity: "medium",
    sources: [{ name: ASVS, ref: "14.2.7, level 3", url: V14 }],
  },
] satisfies RuleInput[];
