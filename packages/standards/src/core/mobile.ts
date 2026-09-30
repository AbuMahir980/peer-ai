import type { RuleInput } from "../rule.ts";

// What phone apps need beyond the frontend rules. Security rules cite the OWASP Mobile
// Application Security Verification Standard (MASVS) 2.1.0 control they come from, checked
// against OWASP's own repository. Platform numbers, such as touch target sizes, are in the
// stack profiles.

const MASVS = "OWASP MASVS 2.1.0";
const control = (id: string) => `https://github.com/OWASP/masvs/blob/master/controls/${id}.md`;

export const mobile = [
  {
    id: "MOB-01",
    domain: "mobile",
    title: "Sensitive data on the phone is kept in secure storage",
    rule: "Session tokens, keys and other sensitive data on the phone are kept in the platform's secure storage, such as the iOS Keychain or the Android Keystore, never in ordinary app storage.",
    why: "Ordinary app storage can be read from a backup, a rooted phone or another app's exploit. Secure storage is encrypted and tied to the device.",
    ask: "Does this change keep any token, key or sensitive data in ordinary storage on the phone?",
    stage: "mvp",
    check: "ai-review",
    severity: "high",
    sources: [{ name: MASVS, ref: "MASVS-STORAGE-1", url: control("MASVS-STORAGE-1") }],
  },
  {
    id: "MOB-02",
    domain: "mobile",
    title: "Sensitive data doesn't leak from the phone",
    rule: "Sensitive data doesn't leak through the device's logs, backups, clipboard, keyboard suggestions or the screenshot shown in the app switcher.",
    why: "Each of these is read by something other than your app, and some of them are copied off the phone.",
    ask: "Could sensitive data in this change leak through logs, backups, the clipboard, the keyboard or the app switcher?",
    stage: "mvp",
    check: "ai-review",
    severity: "medium",
    sources: [{ name: MASVS, ref: "MASVS-STORAGE-2", url: control("MASVS-STORAGE-2") }],
  },
  {
    id: "MOB-03",
    domain: "mobile",
    title: "An in-app browser opens only pages you trust",
    rule: "An in-app browser (a WebView) loads only the app's own pages or ones on an allow-list. JavaScript and bridges to the app's code are switched on only where needed, and a link from outside, such as a QR code or a deep link, is checked before it's opened.",
    why: "A WebView that opens any page runs an attacker's page inside your app, with whatever access the app gives it.",
    ask: "Can any in-app browser in this change open a page that isn't trusted?",
    stage: "mvp",
    check: "ai-review",
    severity: "high",
    sources: [{ name: MASVS, ref: "MASVS-PLATFORM-2", url: control("MASVS-PLATFORM-2") }],
  },
  {
    id: "MOB-04",
    domain: "mobile",
    title: "Links into the app are untrusted input",
    rule: "Anything that arrives from outside the app, through a deep link, a notification or another app, is validated like any other untrusted input before it's used.",
    why: "Anyone can craft a link that opens your app, so a deep link is a door anyone can knock on.",
    ask: "Is everything that reaches this change through a link, notification or another app validated?",
    stage: "mvp",
    check: "ai-review",
    severity: "medium",
    sources: [{ name: MASVS, ref: "MASVS-CODE-4", url: control("MASVS-CODE-4") }],
  },
  {
    id: "MOB-05",
    domain: "mobile",
    title: "Permissions are asked for when needed, at the least level",
    rule: "The app asks for each permission when the feature that needs it is used, says why, and asks for the least it can, such as location while the app is in use rather than all the time.",
    why: "A permission asked for up front, or at a higher level than needed, is refused by careful people, rejected by app stores, and a privacy risk when granted.",
    ask: "Does this change ask for a permission earlier, or at a higher level, than the feature needs?",
    stage: "mvp",
    check: "ai-review",
    severity: "high",
    sources: [
      { name: MASVS, ref: "MASVS-PRIVACY-1", url: control("MASVS-PRIVACY-1") },
      { name: MASVS, ref: "MASVS-PRIVACY-3", url: control("MASVS-PRIVACY-3") },
    ],
  },
  {
    id: "MOB-06",
    domain: "mobile",
    title: "The app can require an update",
    rule: "The app can ask people to update, and refuse to run a version that's no longer safe, so a fix reaches everyone.",
    why: "Installed apps stay on old versions for years, and without a way to require an update, a security fix never reaches them.",
    ask: "Can the app require people on an unsafe version to update?",
    stage: "production",
    check: "ai-review",
    severity: "medium",
    sources: [{ name: MASVS, ref: "MASVS-CODE-2", url: control("MASVS-CODE-2") }],
  },
] satisfies RuleInput[];
