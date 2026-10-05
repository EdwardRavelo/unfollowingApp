# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Unfollowing tracks Instagram followers/following over time and detects who unfollowed you. Everything runs locally: there is no backend, no accounts and no telemetry. The code, comments, UI copy and docs are in Spanish, so keep new code in Spanish too.

It has two independent pieces that share **one** contract, the snapshot JSON file described in `SNAPSHOT_FORMAT.md`:

- `extractor/`: a Manifest V3 Chrome extension written in plain JS with no build step. It produces `snapshot-YYYY-MM-DD.json`.
- `dashboard/`: a React 19 + Vite app (plain JSX, no TypeScript, no router). It imports snapshots, stores them in IndexedDB and analyzes them.

If you change the snapshot shape, update all three of these together: `extractor/popup.js` (`SCHEMA_VERSION`), `dashboard/src/lib/schema.js` (`SCHEMA_VERSION`, `parseSnapshot`) and `SNAPSHOT_FORMAT.md`. Breaking changes bump `schemaVersion`. The dashboard currently rejects any version other than the one it expects.

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

`popup.js` injects `extractInPage` into an open instagram.com tab with `chrome.scripting.executeScript` and awaits its return value, so the popup must stay open until the extraction finishes. The injected function runs in the page context: it reads the `ds_user_id` and `csrftoken` cookies and paginates Instagram's internal `api/v1` friendship endpoints. Between pages it waits a random 800–2000 ms, and it backs off 30 s on HTTP 429. It reports progress back with `chrome.runtime.sendMessage`. When the run finishes, the popup offers "Descargar snapshot.json" (a blob download) and "Copiar al portapapeles".

Because `extractInPage` is serialized into the page, it must stay self-contained: it cannot reference anything outside its own body, and it receives everything it needs through `args`. If Instagram changes its API, the only things to update are `IG_APP_ID` and the endpoint URLs/headers in `popup.js`.

Instagram returns at most about 10 users per page and rate-limits bursts of requests (HTTP 429, or 200 with `{"status":"fail"}`), so many runs in a short time get the account temporarily throttled. The user decided to keep this original popup-based extractor. A background-worker version with auto-download (commit 72e670c) was reverted at their request.

## Known doc/code mismatch

The root README describes a "Cargar datos de ejemplo" button on the Import screen, but no such button exists in `dashboard/src` at this time.
