# Shelf: architecture

- **Rebuild in progress.** Each feature moves from `src/legacy/` (JavaScript, class components, Redux) to `src/features/` (TypeScript, hooks). While both exist, the legacy Redux store still owns the book list.
- **API.** The Shelf API is a separate service with its own repository. The app reaches it only through `src/legacy/api/client.js` and `src/lib/http.ts`.
- **Local data.** Saved books and settings are stored on the phone. Anything that changes how they're stored must move the existing data across.
- **Design.** Colours, spacing and type come from `src/theme/tokens.ts`.
