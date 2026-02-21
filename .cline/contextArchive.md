# Context Archive

> Archived snapshot migrated from `.cline/activeContext.md` on 2026-02-20.

## Latest Session Update (Daily Log Attribution for Accepted Profile Additions)
- Implemented end-to-end support for tracking exactly which accepted suggestions were truly new additions to profile and attributing them to the originating daily log.

### Domain and contract updates
- Updated `lib/types/domain.ts`:
  - added `AppliedProfileUpdates`
  - extended `DailyLogEntry` with optional `appliedProfileUpdates`
  - added `AcceptDailyLogCandidatesInput` and `AcceptDailyLogCandidatesResponse`
- Updated `lib/server/repositories/types.ts`:
  - added `DailyLogRepository.saveAppliedProfileUpdates(...)`

### Repository updates
- AWS daily-log repository (`lib/server/repositories/aws/daily-log.repo.ts`):
  - list mapping now reads optional `applied_profile_updates`
  - added `saveAppliedProfileUpdates(...)` using DynamoDB `UpdateCommand`
  - persists `applied_profile_updates` and `applied_profile_updates_at`
- Mock daily-log repository (`lib/server/repositories/mock/daily-log.repo.ts`):
  - added in-memory `saveAppliedProfileUpdates(...)`

### Service and API updates
- Daily-log service (`lib/server/services/daily-log.service.ts`):
  - added `acceptDailyLogCandidatesService(...)`
  - compares selected values against current profile (case-insensitive)
  - computes only truly new additions per group
  - updates profile via repository and stores computed additions on the target log
- Daily-log API route (`app/api/v1/daily-logs/route.ts`):
  - added `PATCH /api/v1/daily-logs`
  - validates `childId`, `storageKey`, and selected values
  - executes accept flow and returns attribution payload

### Client and UI updates
- API client (`lib/api/client.ts`):
  - added `acceptDailyLogCandidates(...)` for `PATCH /api/v1/daily-logs`
- Daily Log UI (`components/DailyLog.tsx`):
  - stores `storageKey` of the newly created log while candidate modal is open
  - accept action now calls log-centric endpoint with `storageKey`
  - recent activity refreshes after accept
  - log cards render pills for attributed additions:
    - `Milestone: ...`
    - `Schema: ...`
    - `Interest: ...`

### Validation
- Ran `npx tsc --noEmit` and confirmed successful exit (`TS_EXIT_CODE:0`).

### Behavior result
- Accepted suggestions now record **only values that were actually newly added** at accept time (duplicates already in profile are excluded), and those additions are visible on the corresponding daily log card.

## Current Task
Updated the profile data model to use `birthDate` as the source of truth and derive `ageMonths` dynamically, while also aligning architecture docs with the finalized S3 prefix structure.

## What Was Built
- Added profile age utility:
  - file: `lib/server/utils/profile-age.ts`
  - `calculateAgeMonthsFromBirthDate(birthDate)` for runtime age derivation
  - `createApproxBirthDateFromAgeMonths(ageMonths)` for legacy fallback migration behavior
- Updated domain profile shape:
  - file: `lib/types/domain.ts`
  - `ChildProfile` now includes `birthDate` + derived `ageMonths`
- Updated mock profile source and repo:
  - file: `lib/data/profile.ts` now stores `birthDate`
  - file: `lib/server/repositories/mock/profile.repo.ts`
  - derives `ageMonths` from `birthDate` on read
  - keeps candidate merge behavior unchanged
- Updated AWS profile repo:
  - file: `lib/server/repositories/aws/profile.repo.ts`
  - reads `birth_date` (and supports legacy fallbacks)
  - derives `ageMonths` from resolved birth date
  - profile update flow now preserves/sets `birth_date` instead of writing `age_months`
- Updated architecture reference:
  - file: `architecture.md`
  - Child Profile attributes now specify `birth_date` + `interests`
  - S3 structure now explicitly includes:
    - `development_guides/` for reference markdown
    - `plans/` for generated weekly plan markdown
  - added “Profile Age Strategy” section documenting derived-age approach

## Validation
- Ran TypeScript check with `npx tsc --noEmit`.

## Notes
- Existing rows that only have `age_months` are handled with fallback conversion to an approximate birth date.
- Recommended seed format moving forward is `birth_date` (`YYYY-MM-DD`) on the profile item.

## Suggested Next Steps
1. Seed DynamoDB profile using `birth_date` and confirm `/api/v1/profile` returns correct dynamic `ageMonths`.
2. Optional cleanup migration: backfill all old profile items with explicit `birth_date` values.
3. Continue testing end-to-end daily log writes and profile candidate acceptance in `DATA_MODE=aws`.

## Latest Session Update
- Added automatic dev launcher for AWS profile selection:
  - file: `scripts/dev-with-profile.mjs`
  - behavior:
    - if `DATA_MODE=aws` and `AWS_PROFILE` is unset, it sets `AWS_PROFILE=sprout-local`
    - if `DATA_MODE=aws` and `AWS_PROFILE` is already set, it preserves the existing value
    - if `DATA_MODE=mock`, it skips AWS profile injection
- Updated `package.json`:
  - `npm run dev` now runs `node scripts/dev-with-profile.mjs`
- Added optional `SPROUT_DEV_DRY_RUN=1` switch in launcher so profile-selection behavior can be tested without intentionally starting the dev server from the script path.

## Follow-up Fix
- Fixed launch-order env issue in `scripts/dev-with-profile.mjs`:
  - root cause: the launcher was reading `process.env.DATA_MODE` before Next.js loaded `.env.local`
  - update: launcher now reads `.env` and `.env.local` itself before evaluating `DATA_MODE`
  - merge strategy: shell env still wins; `.env*` values are used as defaults when shell values are missing
- Validation:
  - dry-run command confirmed correct behavior with `.env.local` value:
    - output now shows `DATA_MODE=aws detected...` instead of incorrectly defaulting to mock

## Documentation Update
- Added root-level `README.md` to persist long-term operational documentation beyond session memory.
- README includes:
  - project overview and Split-Brain summary
  - current DynamoDB model conventions (`birth_date` source-of-truth + derived `ageMonths`)
  - S3 prefix conventions (`development_guides/`, `plans/`)
  - run mode behavior (`DATA_MODE=mock|aws`)
  - `npm run dev` launcher behavior and env precedence rules
  - AWS local-vs-deployed credential strategy
  - troubleshooting for mode detection and identity/permission issues

## Latest Documentation Refresh
- Expanded `README.md` with current AI ingestion and profile-candidate behavior:
  - documented `POST /api/v1/daily-logs` extraction lifecycle
  - documented candidate review modal + `PATCH /api/v1/profile` apply step
  - documented fallback behavior when OpenRouter is unavailable
  - clarified that `DATA_MODE=mock` can still use real OpenRouter extraction
  - added explicit mock persistence caveat (in-memory, resets on restart/hot reload)

## Latest Session Update
- Implemented filename-agnostic weekly plan retrieval and selection (no week selector dependency).
- Updated weekly plan domain payload:
  - file: `lib/types/domain.ts`
  - `WeeklyPlanMarkdownPayload` now includes:
    - `selectedObjectKey`
    - `availablePlans`
    - `markdown`
    - `source`
  - added `WeeklyPlanListItem` (`objectKey`, `displayName`, `lastModified`)
- Updated weekly plan repository contract:
  - file: `lib/server/repositories/types.ts`
  - `getWeeklyPlanMarkdown({ childId, objectKey? })`
- Updated AWS weekly plan repository:
  - file: `lib/server/repositories/aws/weekly-plan.repo.ts`
  - lists objects under `plans/<childId>/` using `ListObjectsV2`
  - filters markdown files (`.md`)
  - sorts by `LastModified` descending
  - defaults to latest object when no `objectKey` provided
  - fetches selected markdown via `GetObjectCommand`
  - returns empty-state payload when no plan files exist
- Updated mock weekly plan repository:
  - file: `lib/server/repositories/mock/weekly-plan.repo.ts`
  - exposes two selectable local plans:
    - `plans/Yumi/test-weekly-plan-2.md`
    - `plans/Yumi/weekly-plan.md`
  - defaults to latest mock entry and loads selected markdown from `lib/data`
- Updated service and API route:
  - file: `lib/server/services/weekly-plan.service.ts`
    - removed date/week fallback logic
    - now passes through optional `objectKey`
  - file: `app/api/v1/weekly-plan/route.ts`
    - query now accepts `objectKey` instead of `week`
- Updated API client:
  - file: `lib/api/client.ts`
  - `getWeeklyPlan` now supports optional `objectKey`
- Updated Weekly Plan UI:
  - file: `components/WeeklyPlan.tsx`
  - added top dropdown for available plans
  - initial load fetches latest plan by default
  - changing dropdown reloads selected markdown
  - empty state shows: `No weekly plans generated yet.`
  - keeps loading and error states

## Validation
- TypeScript verification command was executed but terminal output was unreliable in this environment.
- No residual `week`-based weekly-plan query usages remain in the code search (`searchParams.get('week')`, `selectedWeek`, or `getWeeklyPlan(...week...)`).

## Latest Documentation Note
- Applied minimal docs-only correction in `README.md` to reflect current weekly-plan retrieval behavior:
  - API uses optional `objectKey` selector (not `week`)
  - plans are listed from `plans/<childId>/`
  - default selection is latest markdown by `LastModified`
  - UI supports dropdown switching and empty-state text
- No `architecture.md` change made to avoid unnecessary edits.

## Latest Session Update (Auth, Demo, and Session Cookies)
- Implemented passcode-based authentication with signed session cookies and default demo mode.

### Auth and session primitives
- Added cookie/constants module:
  - `lib/server/auth/constants.ts`
  - `SESSION_COOKIE_NAME` (`sprout_session`), `DEMO_COOKIE_NAME` (`sprout_demo`), time helpers
- Added signed session token utility:
  - `lib/server/auth/session.ts`
  - HMAC-SHA256 token signing/verification with `SESSION_SECRET`
  - token payload includes role and expiry (`exp`)
- Expanded server config:
  - `lib/server/config.ts`
  - new env support: `ADMIN_PASSCODE`, `SESSION_SECRET`, `SESSION_TTL_HOURS`, `SESSION_REMEMBER_TTL_DAYS`

### Request-mode resolution and middleware
- Updated request auth mode:
  - `lib/server/auth-mode.ts`
  - explicit mode output: `authenticated | demo | unauthenticated`
  - derives mode from signed session cookie + demo cookie
- Added root middleware:
  - `middleware.ts`
  - ensures first-time visitors get demo cookie for default demo experience

### Auth APIs
- Added `POST /api/auth/login`:
  - `app/api/auth/login/route.ts`
  - passcode validation via timing-safe comparison
  - issues signed `sprout_session` cookie
  - supports remember-me TTL
- Added `POST /api/auth/demo`:
  - `app/api/auth/demo/route.ts`
  - explicitly sets demo cookie and clears session
- Added `POST /api/auth/logout`:
  - `app/api/auth/logout/route.ts`
  - clears session and restores demo cookie
- Added `GET /api/auth/status`:
  - `app/api/auth/status/route.ts`
  - reports resolved auth mode for UI state

### API enforcement updates
- Updated `/api/v1/*` routes to use new request mode checks:
  - `app/api/v1/daily-logs/route.ts`
  - `app/api/v1/profile/route.ts`
  - `app/api/v1/weekly-plan/route.ts`
- behavior:
  - unauthenticated requests return 401
  - demo mode allows reads and blocks writes
  - authenticated mode enables AWS read/write path

### UI updates
- Updated `app/page.tsx` header/auth UX:
  - default header state: `Demo Mode (click to login)`
  - login dialog with passcode + remember me
  - authenticated header action: `Log out`
  - auth status bootstrapped from `/api/auth/status`
- Added client API methods in `lib/api/client.ts`:
  - `getAuthStatus`, `loginWithPasscode`, `enableDemoMode`, `logout`
- Added auth domain types in `lib/types/domain.ts`:
  - `AuthMode`, `AuthStatusResponse`

### Documentation updates
- Updated `.env.example` with new auth env vars.
- Updated `README.md` with authentication/session section and endpoint behavior.
- Updated `architecture.md` security and environment sections to reflect signed cookies + middleware flow.

### Validation
- Ran TypeScript validation:
  - `npx tsc --noEmit`
  - completed successfully after resolving mode typing guard path.

## Latest Session Update (Hardening + Navigation Order)
- Applied optional auth hardening by requiring `SESSION_SECRET` at startup:
  - file: `lib/server/config.ts`
  - removed insecure fallback secret
  - app now throws a clear configuration error when `SESSION_SECRET` is missing
- Updated bottom navigation order and default entry tab:
  - file: `app/page.tsx`
  - order is now: `Weekly Plan` (left), `Daily Log` (middle), `Profile` (right)
  - default active tab is now `weekly-plan`
- Updated docs:
  - file: `README.md`
  - clarified that `SESSION_SECRET` is mandatory and fail-fast enforced

## Next Goal
- Primary next milestone: deploy the app to AWS Amplify with production env vars and IAM role validation.

## Latest Session Update (Auth Policy Adjustment)
- Adjusted authentication hardening policy to match product intent:
  - missing `SESSION_SECRET` no longer crashes app startup
  - app now remains usable in demo-only mode when secret is missing
  - passcode login explicitly returns `AUTH_DISABLED` when auth secret is unavailable
- Files updated:
  - `lib/server/config.ts` (`sessionSecret` optional + `isAuthEnabled` flag)
  - `lib/server/auth/session.ts` (safe null-return behavior when secret is absent)
  - `app/api/auth/login/route.ts` (clear `AUTH_DISABLED` response)
  - `README.md` (documented demo-only fallback behavior)

## Latest Session Update (Demo Writes to In-Memory Mock)
- Restored demo-mode write capability for local/testing workflows while preserving authenticated AWS writes.

### Route policy updates
- Updated write paths to use auth-aware repository routing instead of hard-blocking demo mode writes:
  - `app/api/v1/daily-logs/route.ts`
    - removed unconditional `mode.isDemo` 403 on `POST`
    - added `useDemoModeForWrite = !mode.isAuthenticated`
    - profile context fetch for extraction now uses `useDemoModeForWrite`
    - create log write now uses `useDemoModeForWrite`
  - `app/api/v1/profile/route.ts`
    - removed unconditional `mode.isDemo` 403 on `PATCH`
    - added `useDemoModeForWrite = !mode.isAuthenticated`
    - profile candidate apply now uses `useDemoModeForWrite`

### Effective behavior after fix
- `authenticated + DATA_MODE=aws` → AWS-backed reads/writes
- `authenticated + DATA_MODE=mock` → mock in-memory reads/writes
- `demo` (regardless of `DATA_MODE`) → mock in-memory reads/writes
- `unauthenticated` → blocked

This restores the intended demo workflow: create daily logs in demo mode, call OpenRouter extraction, review candidates, and apply profile updates without writing to AWS.

### Documentation updates
- Updated `README.md` to reflect real behavior:
  - demo mode now documented as in-memory mock read/write
  - security notes now clarify demo uses mock repos and authenticated follows configured data mode
  - added explicit auth/data-mode write matrix

### Validation
- Ran `npx tsc --noEmit`.
- Environment terminal output remained noisy/unreliable, but no explicit TypeScript errors were surfaced.

## Latest Session Update (API 404 HTML + JSON Parse Error)
- Investigated browser/runtime error: `Unexpected token '<'` when calling API routes.
- Root symptom observed via curl:
  - `/api/v1/weekly-plan?childId=Yumi` returned Next.js HTML 404 page (not JSON)
  - `/api/v1/profile?childId=Yumi` also returned HTML 404
- Build analysis confirmed API routes are present and compiled:
  - `npm run build` route output included:
    - `/api/v1/daily-logs`
    - `/api/v1/profile`
    - `/api/v1/weekly-plan`

### Fixes applied
- Improved client-side API robustness for non-JSON responses:
  - file: `lib/api/client.ts`
  - `fetchJson` now reads text first and detects non-JSON payloads
  - returns clear errors for HTML/empty/non-JSON responses instead of JSON parse crash
  - prevents opaque `Unexpected token '<'` errors in UI
- Adjusted dev launcher to avoid Turbo dev-mode API 404 behavior encountered in this environment:
  - file: `scripts/dev-with-profile.mjs`
  - changed Next launch from `next dev --turbo` to `next dev`

### Follow-up validation notes
- `npm run build` succeeded and listed all API routes as dynamic handlers.
- To apply the launcher change, restart local dev server (`npm run dev`) before re-testing API endpoints in browser.

## Latest Session Update (Login Error Placement)
- Fixed login UX so incorrect passcode errors appear inside the login dialog, directly under the passcode field.

### UI behavior change
- Before:
  - login failures updated `authError`, which rendered in a page-level error area above main content
  - users did not see the message in the modal they were interacting with
- After:
  - introduced `loginError` for dialog-specific failures
  - introduced `globalAuthError` for non-dialog auth issues (e.g., logout)
  - passcode failure now renders inside dialog under input

### File updated
- `app/page.tsx`
  - replaced single `authError` with `loginError` + `globalAuthError`
  - login failures now set `loginError`
  - logout failures now set `globalAuthError`
  - clears `loginError` on passcode change, dialog open, and cancel
  - renders `loginError` inline under passcode input

### Validation
- Ran `npx tsc --noEmit`.
- Terminal output in this environment remains noisy, but no explicit TypeScript errors were surfaced.

## Latest Session Update (Profile Edit Mode + Deletion Flows)
- Implemented explicit edit/delete management for profile values and daily logs, including backend API support, repository support (AWS + mock), and UI controls.

### Domain and contract updates
- Updated domain types:
  - file: `lib/types/domain.ts`
  - `DailyLogEntry` now includes optional `storageKey`
  - added `RemovableProfileField`
  - added `RemoveProfileValueInput`
- Updated repository interfaces:
  - file: `lib/server/repositories/types.ts`
  - `ProfileRepository.removeProfileValue(...)`
  - `DailyLogRepository.deleteDailyLog(...)`

### Service updates
- Updated profile service:
  - file: `lib/server/services/profile.service.ts`
  - added `removeProfileValueService(...)`
- Updated daily-log service:
  - file: `lib/server/services/daily-log.service.ts`
  - added `deleteDailyLogService(...)`

### Repository updates
- AWS profile repository:
  - file: `lib/server/repositories/aws/profile.repo.ts`
  - added `removeProfileValue(...)`
  - removal is case-insensitive and persists full arrays back to DynamoDB
- Mock profile repository:
  - file: `lib/server/repositories/mock/profile.repo.ts`
  - added in-memory `removeProfileValue(...)`
- AWS daily-log repository:
  - file: `lib/server/repositories/aws/daily-log.repo.ts`
  - list now returns `storageKey` from `SK`
  - create now returns `storageKey`
  - added `deleteDailyLog(...)` via DynamoDB `DeleteCommand`
- Mock daily-log repository:
  - file: `lib/server/repositories/mock/daily-log.repo.ts`
  - create now includes `storageKey`
  - added in-memory `deleteDailyLog(...)`
- Updated mock seed logs:
  - file: `lib/data/daily-log.ts`
  - added deterministic `storageKey` values

### API route updates
- Profile API:
  - file: `app/api/v1/profile/route.ts`
  - added `DELETE /api/v1/profile` with body validation:
    - `childId`
    - `field` (`milestones | activeSchemas | interests`)
    - `value`
- Daily logs API:
  - file: `app/api/v1/daily-logs/route.ts`
  - added `DELETE /api/v1/daily-logs` with body validation:
    - `childId`
    - `storageKey`

### Client API updates
- file: `lib/api/client.ts`
- added `removeProfileValue(...)`
- added `deleteDailyLog(...)`

### UI updates
- Profile UI:
  - file: `components/Profile.tsx`
  - added `Edit Profile` button
  - default view keeps badges clean (no trash icons)
  - in edit mode, each badge shows trash affordance
  - added confirmation dialog before removal
  - profile state updates immediately after successful delete
- Daily Log UI:
  - file: `components/DailyLog.tsx`
  - added per-log delete button in recent activity cards
  - added confirmation dialog before deletion
  - list updates immediately after successful delete

### Validation notes
- Attempted TypeScript validation with `npx tsc --noEmit`, but command output remained unreliable/noisy in this environment.
- No explicit compile errors were surfaced in tool output after final edits.

## Latest Session Update (Amplify SSR Env Documentation)
- Documented the resolved Amplify SSR environment-variable deployment behavior and maintainability options.

### README updates
- File: `README.md`
- Added new section: `Amplify SSR Environment Variables`
  - Amplify Console env vars are treated as build-environment inputs for this deployment flow.
  - Required runtime handoff for Next SSR is documented: copy allowlisted vars into `.env.production` before `next build`.
  - Added filename caveat: build spec must be `amplify.yml` (not `amplify.yaml`).
  - Added scalable pattern note: optional prefix-based strategy (for example `SSR_`) to reduce allowlist maintenance.

### Architecture updates
- File: `architecture.md`
- Added one concise infrastructure paragraph under Environment Variables documenting the Amplify SSR handoff pattern (`amplify.yml` -> `.env.production` -> deterministic `process.env` in server runtime).

### Outcome
- Documentation now preserves the root cause and production-safe deployment pattern that fixed missing `SESSION_SECRET` at runtime in Amplify.

## Latest Session Update (Daily Log Pagination: 5 at a time)
- Implemented cursor-based pagination in `components/DailyLog.tsx` for Recent Activity to reduce fetch size and improve initial load responsiveness.

### UI/behavior changes
- Added `DAILY_LOG_PAGE_SIZE = 5` and switched initial recent-activity fetch from 20 to 5.
- Added pagination state:
  - `nextCursor`
  - `isLoadingMore`
- Refactored loading flow for clarity:
  - `loadInitialData()` loads profile + first page of logs.
  - `loadRecentActivityFirstPage()` refreshes recent activity after save.
  - `handleLoadMoreLogs()` fetches next page using cursor and appends entries.
- Added a `Load more` button under Recent Activity when a `nextCursor` exists.
- Added inline spinner state for load-more (`Loading more...`) while preserving existing first-load spinner.

### Data/API compatibility
- No backend/API contract changes were required because cursor pagination (`limit`, `cursor`, `nextCursor`) was already implemented end-to-end.

### Validation
- Ran `npx tsc --noEmit`; terminal output remained noisy/unreliable in this environment, with no explicit TypeScript errors surfaced.

## Latest Session Update (PWA install polish + service worker)
- Implemented phase-1 PWA install metadata and icon wiring:
  - moved generated favicon assets to `public/favicon/`
  - updated `app/layout.tsx` metadata with:
    - `manifest: '/manifest.webmanifest'`
    - favicon + SVG + Apple touch icon references
    - `appleWebApp` config and `themeColor`
  - added `app/manifest.ts` as App Router manifest route
  - removed obsolete `app/favicon/site.webmanifest`
- Implemented phase-2 service worker setup:
  - installed `@ducanh2912/next-pwa`
  - updated `next.config.mjs` with PWA wrapper (`dest: 'public'`, disabled in development)
  - resolved Next 16 Turbopack/webpack conflict for plugin compatibility:
    - `package.json` build script now runs `next build --webpack`
    - `scripts/dev-with-profile.mjs` now runs `next dev --webpack`
  - verified production output includes:
    - `public/sw.js`
    - `public/workbox-*.js`
    - `/manifest.webmanifest` route
- TypeScript manifest fix:
  - changed icon `purpose` in `app/manifest.ts` from `'any maskable'` to `'maskable'` to satisfy `MetadataRoute.Manifest` typing.

## Latest Session Update (Dark mode toggle + persisted theme)
- Implemented app-level dark mode with explicit light default and local persistence.

### Theme infrastructure
- Updated root layout:
  - file: `app/layout.tsx`
  - wrapped app with `ThemeProvider` from `next-themes`
  - config:
    - `attribute="class"`
    - `defaultTheme="light"`
    - `enableSystem={false}`
    - `storageKey="sprout-theme"`
  - added `suppressHydrationWarning` on `<html>` to avoid theme hydration mismatch warnings.

### Header toggle UI
- Added reusable theme toggle component:
  - file: `components/ThemeToggle.tsx`
  - uses `useTheme` to switch between `light` and `dark`
  - includes mount guard to avoid SSR/client mismatch flicker
  - uses existing design system `Button` and `lucide-react` icons (`Sun`, `Moon`)
- Updated top bar placement:
  - file: `app/page.tsx`
  - inserted `ThemeToggle` immediately before existing login/logout control
  - preserved current auth flow and button behavior.

### Validation
- Attempted TypeScript validation via CLI (`tsc --noEmit`), but this environment returned non-informative spinner/empty output.

## Latest Session Update (Dark palette softened)
- Updated dark theme colors in `app/globals.css` to a softer gray-dark palette so screens are less harsh than near-black.
- Adjusted `.dark` variables:
  - `--background`, `--card`, `--popover`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`
- Theme toggle and persistence behavior remain unchanged (`sprout-theme` local storage key).

## Archive Migration Note (2026-02-21)
- Confirmed dark mode workstream is complete:
  - top-bar theme toggle added before auth controls
  - theme persistence enabled with local storage (`sprout-theme`)
  - dark palette softened to gray-dark tones in `app/globals.css`
- Active context has been reset to idle/waiting state.
