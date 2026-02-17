# Active Context

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
