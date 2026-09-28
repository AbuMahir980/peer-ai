# Sprout: architecture

- **Local-first.** All data is in IndexedDB, defined in `src/db.ts`. Every schema change keeps existing data, moving it with an upgrade when its shape changes.
- **Offline.** A service worker (`public/sw.js`) serves the app with no connection and picks up new versions when they're published.
- **Plant identification** is a third-party service, called from `src/features/identify/identify.ts`.
- **Sync** is a later backend. It hasn't started.
- **Design.** Colours and spacing come from `src/styles/tokens.css`.
