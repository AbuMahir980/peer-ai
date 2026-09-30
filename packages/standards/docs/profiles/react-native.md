# React Native

Phone apps in React Native, with or without Expo: text that follows the person's size, nothing written to the device log, secrets in the platform's secure store, and the checks a phone app needs before it's trusted with people's data. It builds on the React profile.

List it in `standards.profiles` as `react-native`. It applies to parts tagged `react-native`, `expo`. It builds on [react](react.md), which apply wherever it does.

## RN-01 · Text follows the person's text size

Text isn't stopped from scaling with `allowFontScaling={false}`. A layout that breaks at large sizes is fixed, such as by wrapping or scrolling, not by ignoring the setting.

**Why:** People who set a larger text size need it to read at all; an app that ignores it is unusable to them.

**Ask:** Does this change stop any text from following the person's text size?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Medium | [DES-14](../design-accessibility.md) | Any | `no-restricted-syntax`, in ESLint |

## RN-02 · Nothing is written to the device log

The app doesn't call `console`. What needs recording goes through the project's logger, which drops personal data and sends nothing from release builds.

**Why:** On a phone, the console goes to the device log, which crash tools collect and anyone with the phone on a cable can read.

**Ask:** Does this change call console?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | A tool | Medium | [MOB-02](../mobile.md) | Any | `no-console`, in ESLint |

## RN-03 · Tokens and personal data are kept in secure storage

Session tokens, keys and personal data are kept in the platform's secure store, such as `expo-secure-store` or the Keychain and Keystore, never in AsyncStorage or a plain file.

**Why:** AsyncStorage is a plain file on the device, readable from a backup or a rooted phone.

**Ask:** Does this change keep a token or personal data outside secure storage?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | High | [MOB-01](../mobile.md) | Any | – |

## RN-04 · A web view opens only your own pages

A `WebView` loads only the project's own pages: `originWhitelist` lists them, links elsewhere open in the system browser, and JavaScript is on only where the page needs it.

**Why:** A web view that follows any link runs someone else's page inside the app, with whatever the app gave the web view.

**Ask:** Can any web view in this change load a page the project doesn't own?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | High | [MOB-03](../mobile.md) | Any | – |

## RN-05 · A link into the app is checked before it's used

Every value a deep link carries, such as an id or a URL, is checked before the app acts on it, like any other input from outside.

**Why:** Anyone can send a link that opens the app. A link that's trusted can open a page it shouldn't, or act as the person.

**Ask:** Does this change act on a deep link's values without checking them?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | High | [MOB-04](../mobile.md) | Any | – |

## RN-06 · Long lists use a list component

A list that can grow long is a `FlatList`, `SectionList` or another virtualised list, not a `ScrollView` of mapped items.

**Why:** A ScrollView draws every item at once, so the screen gets slower and uses more memory with every item.

**Ask:** Does this change draw a list that can grow long inside a ScrollView?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Low | [PERF-05](../performance.md) | Any | – |

## RN-07 · Touch targets are at least 44 points

Everything a person taps is at least 44 by 44 points, using `hitSlop` where the visible part is smaller.

**Why:** A small target is missed by people with less precise hands, and by everyone on a moving bus.

**Ask:** Is anything tappable in this change smaller than 44 points?

**Default:** 44 points. A project changes it in `standards.overrides`, with its reason.

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Low | [DES-15](../design-accessibility.md) | Any | – |

## RN-08 · Permissions are asked for when they're needed

The app asks for a permission, such as location or the camera, when the person starts the feature that needs it, and at the least level that works, such as while in use.

**Why:** A permission asked for at launch is refused without being understood, and a wider one than needed is a risk the person didn't agree to.

**Ask:** Does this change ask for a permission before it's needed, or at a wider level than it needs?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| MVP | AI review | Medium | [MOB-05](../mobile.md) | Any | – |

## RN-09 · The app can require an update

At start-up, the app asks the server for the lowest version it may run, and asks the person to update when it's below it, such as with Expo Updates or a store check.

**Why:** An installed app can't be recalled. Without a way to require an update, a version with a security hole stays in use.

**Ask:** Can the server require people to update this app?

| Applies from | Checked by | Severity | Carries | Architectures | Enforced by |
|--------------|------------|----------|---------|---------------|-------------|
| Production | AI review | High | [MOB-06](../mobile.md) | Any | – |
