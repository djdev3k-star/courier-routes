# Copilot instructions for Courier Routes

## Code style
- Do not use emojis or emoticons in code, comments, or UI text.

## Git safeguards - CRITICAL
- **NEVER force push** (`git push --force` or `-f`) without explicit user confirmation
- **ALWAYS check status first**: Run `git status` before any destructive operation
- **Before rebasing**: Warn the user and confirm - rebasing rewrites history
- **Before reset**: Always use `git stash` first to save uncommitted work
- **Commit frequently**: Commit working changes before starting new features
- **Pull before push**: Always `git pull --rebase` before pushing to avoid conflicts
- **Branch for experiments**: Create a branch before risky changes (`git checkout -b experiment`)
- **Check for uncommitted work**: If `git status` shows changes, ask user whether to commit or stash first

## Big picture architecture
- Static, client-only SPA: [index.html](index.html) wires all UI and loads [js/app.js](js/app.js). No build system or bundler.
- Data flow: [generate_data.py](generate_data.py) builds [data/routes.json](data/routes.json) from external CSVs; the app fetches that JSON on load and renders Home/Routes/Reports/Map views.
- Runtime state lives in `appData` (`stats` + `days[]`), which `render*()` functions read to update the DOM. Manual trips are merged in at startup via `loadOfflineTrips()`.
- Map view uses Mapbox GL JS with a hardcoded `MAPBOX_TOKEN` and renders line/marker layers in `initMap()`.

## Key files and patterns
- UI + behavior live together in [index.html](index.html) (inline `onclick` handlers) and [js/app.js](js/app.js) (DOM lookups + string templates).
- Styling is a single dark-theme stylesheet in [css/styles.css](css/styles.css); print layout rules are in [css/print.css](css/print.css) and driven by a hidden `#printArea` container.
- Trip data schema comes from [generate_data.py](generate_data.py): each day has `date`, `trips[]`, and `stats` with totals; trip items include `pickup_coords`/`dropoff_coords` for map rendering.

## Developer workflows
- Run locally with a static server (per README): `python -m http.server 8080` and open http://localhost:8080.
- Regenerate data by running `python generate_data.py`; it writes [data/routes.json](data/routes.json).

## Project-specific conventions
- Dates are treated as local dates via `new Date(day.date + 'T12:00:00')` to avoid timezone shifts in UI.
- Offline/manual trip entry is persisted in localStorage under `courierRoutes_offlineTrips` and merged into `appData` on startup.
- Batch CSV upload reads the template in [data/offline_trips_template.csv](data/offline_trips_template.csv) and stores rows in localStorage under `offlineTrips` (see `importBatchTrips()` in [js/app.js](js/app.js)).

## Integration points
- Mapbox GL JS is loaded from CDN in [index.html](index.html); the token lives in `MAPBOX_TOKEN` in [js/app.js](js/app.js).
- Data generation expects external CSVs in absolute paths configured in [generate_data.py](generate_data.py) (`SOURCE_DIR`, `TRIPS_DIR`, `PAYMENTS_DIR`, `GEOCODED_FILE`).
