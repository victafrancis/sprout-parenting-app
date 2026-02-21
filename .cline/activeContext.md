# Active Context

## Current Task
Set up phase-1 PWA install metadata and icon wiring using generated favicon assets.

## Current Status
- Moved generated favicon bundle into static serving path: `public/favicon/`.
- Updated `app/layout.tsx` metadata for PWA-related head tags:
  - `manifest: '/manifest.webmanifest'`
  - favicon + SVG + Apple touch icon references
  - `appleWebApp` metadata and `themeColor` viewport setting
- Added Next App Router manifest route: `app/manifest.ts`.
- Removed obsolete generated manifest file: `app/favicon/site.webmanifest`.

## Open Decisions / Blockers
- Service worker/offline caching is not yet added (optional phase-2 for full PWA behavior).

## Immediate Next Steps
1. Run the app and verify `/manifest.webmanifest` loads and includes the expected icons.
2. In Chrome DevTools → Application, verify Manifest icons and installability.
3. Optional: add service worker (`next-pwa`) for offline caching and stronger PWA behavior.

## Last Updated
2026-02-21
