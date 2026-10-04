# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Unfollowing tracks Instagram followers/following over time and detects who unfollowed you. Everything runs locally: there is no backend, no accounts and no telemetry. The code, comments, UI copy and docs are in Spanish, so keep new code in Spanish too.

It has two independent pieces that share **one** contract, the snapshot JSON file described in `SNAPSHOT_FORMAT.md`:

- `extractor/`: a Manifest V3 Chrome extension written in plain JS with no build step. It produces `snapshot-YYYY-MM-DD.json`.
- `dashboard/`: a React 19 + Vite app (plain JSX, no TypeScript, no router). It imports snapshots, stores them in IndexedDB and analyzes them.

If you change the snapshot shape, update all three of these together: `extractor/background.js` (`SCHEMA_VERSION`), `dashboard/src/lib/schema.js` (`SCHEMA_VERSION`, `parseSnapshot`) and `SNAPSHOT_FORMAT.md`. Breaking changes bump `schemaVersion`. The dashboard currently rejects any version other than the one it expects.

## Commands

Run all of these from `dashboard/`:

```bash
npm install
npm run dev                          # Vite dev server
npm test                             # Vitest, single run
npm run test:watch
npx vitest run src/lib/diff.test.js  # one test file
npx vitest run -t "username"         # tests whose name matches
npm run lint                         # oxlint (config: .oxlintrc.json)
npm run build                        # outputs dashboard/dist
```

The extractor has no build step. Load `extractor/` as an unpacked extension at `chrome://extensions` (Developer mode), then reload it there after each edit.

## Deployment

`.github/workflows/deploy.yml` builds `dashboard/` with Node 20 on every push to `main` and deploys `dashboard/dist` to GitHub Pages. `vite.config.js` sets `base: './'` so the site works at any Pages subpath; keep asset paths relative.

## Dashboard architecture

- **Data flow:** `App.jsx` owns the full `snapshots` array, loaded from IndexedDB through `lib/db.js`. It passes the array to every page. Pages are pure views that derive their data from that array by calling `lib/diff.js`. Nothing is cached or persisted besides the raw snapshots. Navigation is a `tab` state in `App.jsx`, not a router.
- **`lib/diff.js`** is the core logic: `computeRelations` (within one snapshot), `computeChanges` (prev → curr), `historyUnfollowers` (accumulates across all consecutive pairs), `buildTrend` and `computeSummary`. Users are **always compared by `id`, never by `username`**, because usernames change. `diff.test.js` covers this. `schema.test.js` and `csv.test.js` also live in `lib/`.
- **`lib/schema.js`** validates and normalizes imported JSON: it coerces ids to strings, deduplicates users and fills safe defaults for optional fields. Every snapshot passes through `parseSnapshot` before it reaches the DB. `incompleteParts` flags a snapshot whose lists fall short of the profile counts (`account.followerCount`/`followingCount`) by more than 5 users and 2%. The extractor uses the same threshold.
- **`lib/db.js`:** the IndexedDB store `snapshots` (DB name `unfollowing`) is keyed by `capturedAt`. Re-importing a snapshot with the same timestamp overwrites it. Reads always return snapshots sorted ascending by date, and the last element is treated as the current snapshot.
- **`lib/csv.js`** exports any user list to CSV. It uses the `;` separator and a UTF-8 BOM so the file opens correctly in Spanish-locale Excel, and it neutralizes cells that start with `=`, `+`, `-` or `@` so Excel doesn't run them as formulas.
- **Theme:** `localStorage` holds only the theme preference (`auto` / `light` / `dark`), applied as `data-theme` on `<html>`.

## Extractor architecture

`background.js` (the MV3 service worker) does the work. It keeps extraction state in `chrome.storage.local` (`state`, `lastSnapshot`), and `popup.js` only renders that state and sends `start`/`download` messages, so closing the popup doesn't stop an extraction. The worker opens an instagram.com tab if needed and injects `extractInPage` into it with `chrome.scripting.executeScript`. It does **not** await the return value: the page sends `progress`, `done` and `error` messages, and during rate-limit waits it sends heartbeats every 10 s so the worker stays alive. When the run finishes, the worker builds the snapshot and auto-downloads it to `Downloads/unfollowing/`.

`extractInPage` reads the `ds_user_id` and `csrftoken` cookies and paginates Instagram's internal `api/v1` friendship endpoints. It deduplicates users by id and retries with exponential backoff on 429 responses and on 200 responses with `status: "fail"` (previously these truncated lists silently). It also records the profile's follower/following counts so incomplete captures can be detected. Because `extractInPage` is serialized into the page, it must stay self-contained: it cannot reference anything outside its own body, and it receives everything it needs through `args`. If Instagram changes its API, the only things to update are `IG_APP_ID` and the endpoint URLs/headers in `background.js`.

## Known doc/code mismatch

The root README describes a "Cargar datos de ejemplo" button on the Import screen, but no such button exists in `dashboard/src` at this time.
