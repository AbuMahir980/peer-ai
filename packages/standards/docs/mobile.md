# Mobile

What phone apps need beyond the frontend rules.

## MOB-01 · Sensitive data on the phone is kept in secure storage

Session tokens, keys and other sensitive data on the phone are kept in the platform's secure storage, such as the iOS Keychain or the Android Keystore, never in ordinary app storage.

**Why:** Ordinary app storage can be read from a backup, a rooted phone or another app's exploit. Secure storage is encrypted and tied to the device.

**Ask:** Does this change keep any token, key or sensitive data in ordinary storage on the phone?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP MASVS 2.1.0, MASVS-STORAGE-1](https://github.com/OWASP/masvs/blob/master/controls/MASVS-STORAGE-1.md) |

## MOB-02 · Sensitive data doesn't leak from the phone

Sensitive data doesn't leak through the device's logs, backups, clipboard, keyboard suggestions or the screenshot shown in the app switcher.

**Why:** Each of these is read by something other than your app, and some of them are copied off the phone.

**Ask:** Could sensitive data in this change leak through logs, backups, the clipboard, the keyboard or the app switcher?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [OWASP MASVS 2.1.0, MASVS-STORAGE-2](https://github.com/OWASP/masvs/blob/master/controls/MASVS-STORAGE-2.md) |

## MOB-03 · An in-app browser opens only pages you trust

An in-app browser (a WebView) loads only the app's own pages or ones on an allow-list. JavaScript and bridges to the app's code are switched on only where needed, and a link from outside, such as a QR code or a deep link, is checked before it's opened.

**Why:** A WebView that opens any page runs an attacker's page inside your app, with whatever access the app gives it.

**Ask:** Can any in-app browser in this change open a page that isn't trusted?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP MASVS 2.1.0, MASVS-PLATFORM-2](https://github.com/OWASP/masvs/blob/master/controls/MASVS-PLATFORM-2.md) |

## MOB-04 · Links into the app are untrusted input

Anything that arrives from outside the app, through a deep link, a notification or another app, is validated like any other untrusted input before it's used.

**Why:** Anyone can craft a link that opens your app, so a deep link is a door anyone can knock on.

**Ask:** Is everything that reaches this change through a link, notification or another app validated?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | [OWASP MASVS 2.1.0, MASVS-CODE-4](https://github.com/OWASP/masvs/blob/master/controls/MASVS-CODE-4.md) |

## MOB-05 · Permissions are asked for when needed, at the least level

The app asks for each permission when the feature that needs it is used, says why, and asks for the least it can, such as location while the app is in use rather than all the time.

**Why:** A permission asked for up front, or at a higher level than needed, is refused by careful people, rejected by app stores, and a privacy risk when granted.

**Ask:** Does this change ask for a permission earlier, or at a higher level, than the feature needs?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | [OWASP MASVS 2.1.0, MASVS-PRIVACY-1](https://github.com/OWASP/masvs/blob/master/controls/MASVS-PRIVACY-1.md); [OWASP MASVS 2.1.0, MASVS-PRIVACY-3](https://github.com/OWASP/masvs/blob/master/controls/MASVS-PRIVACY-3.md) |

## MOB-06 · The app can require an update

The app can ask people to update, and refuse to run a version that's no longer safe, so a fix reaches everyone.

**Why:** Installed apps stay on old versions for years, and without a way to require an update, a security fix never reaches them.

**Ask:** Can the app require people on an unsafe version to update?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | [OWASP MASVS 2.1.0, MASVS-CODE-2](https://github.com/OWASP/masvs/blob/master/controls/MASVS-CODE-2.md) |
