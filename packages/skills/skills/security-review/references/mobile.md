# Phone apps

MOB-01 to MOB-04. These apply only to mobile parts. For other parts, each is `not-applicable`.

## MOB-01: sensitive data in secure storage

**Fail** when session tokens, keys or other sensitive data are kept in ordinary storage, such as:

- AsyncStorage;
- SharedPreferences;
- UserDefaults;
- plain files;
- an unencrypted database.

**Pass** when they're kept in the platform's secure storage: the Keychain or the Keystore, directly or through a wrapper such as `expo-secure-store` or `flutter_secure_storage`.

## MOB-02: nothing sensitive leaks from the phone

**Fail** when any of these happens:

- tokens or personal data are written to the device log;
- backups include sensitive files;
- sensitive values are copied to the clipboard;
- password and code fields allow keyboard suggestions;
- screens showing sensitive data aren't hidden in the app switcher.

## MOB-03: in-app browsers open only trusted pages

**Pass** when a WebView:

- loads only the app's own pages or an allow-list;
- has JavaScript and bridges to native code on only where needed;
- opens outside links in the system browser.

**Fail** when a WebView loads a URL from a deep link, a QR code or a server response without checking it.

## MOB-04: links into the app are untrusted input

**Fail** when parameters from a deep link, a notification or another app are used without validation, for example:

- to navigate to any screen;
- to load any URL;
- to act on a record, such as "delete item 42", without a confirmation or a permission check.
