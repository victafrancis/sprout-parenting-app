# Sprout Parenting App

Sprout is a Next.js app for capturing daily parenting logs, maintaining a child profile, and preparing data for personalized weekly development plans.

This project follows a **Split-Brain architecture**:
- **Control Plane (Next.js app):** parent-facing UI and APIs for daily logs/profile updates
- **Worker Plane (Lambda, planned):** scheduled weekly synthesis using DynamoDB + S3 knowledge base + OpenRouter

For full architecture details, see `architecture.md`.

---

## Data Model (Current)

The app uses a DynamoDB single-table strategy (`Sprout_Data`) with PK/SK patterns.

- **Profile item**
  - `PK=USER#<childId>`
  - `SK=PROFILE`
  - Stores `birth_date` (`YYYY-MM-DD`) as source of truth
- **Daily logs**
  - `PK=LOG#<childId>`
  - `SK=DATE#<ISO timestamp>`

### Profile age strategy

- Persist `birth_date` in DynamoDB.
- Derive `ageMonths` at read time in backend/app code.
- This keeps profile age automatically current without manual updates.

---

## S3 Conventions

Bucket: `sprout-knowledge-base`

- `development_guides/` → reference markdown files (including `baby-development-report.md`)
- `plans/` → generated weekly plan markdown artifacts

### Weekly plan retrieval behavior (current app)

- The weekly-plan API accepts `childId` and optional `objectKey`.
- The app lists markdown files under `plans/<childId>/`.
- When `objectKey` is not provided, it loads the latest markdown file by S3 `LastModified`.
- The Weekly Plan UI shows all available markdown files in a dropdown and lets you switch between them.
- If no markdown files exist for the prefix, the UI shows: `No weekly plans generated yet.`

---

## Run Modes

Set via `DATA_MODE` in `.env.local`:

- `DATA_MODE=mock` → mock repositories (safe local/demo behavior)
- `DATA_MODE=aws` → AWS repositories (DynamoDB/S3-backed behavior)

### Mock mode + real AI extraction

`DATA_MODE=mock` controls storage repositories only. In this mode, the app still calls OpenRouter during daily log creation when `OPENROUTER_API_KEY` is configured.

- Storage path: mock repositories (in-memory)
- AI extraction path: real OpenRouter call on `POST /api/v1/daily-logs`
- Read endpoints (`GET /api/v1/*`) do not call AI

This allows realistic AI parsing tests locally without writing to AWS.

Core env vars used by Next.js server side:

- `DATA_MODE`
- `REGION`
- `DYNAMODB_TABLE`
- `S3_WEEKLY_PLAN_BUCKET`
- `S3_WEEKLY_PLAN_PREFIX`
- `ADMIN_PASSCODE`
- `SESSION_SECRET`
- `SESSION_TTL_HOURS`
- `SESSION_REMEMBER_TTL_DAYS`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

---

## Daily Log AI Flow (Current)

When creating a daily log (`POST /api/v1/daily-logs`), the server:

1. validates input (`childId`, `rawText`)
2. reads current profile context
3. reads `baby-development-report.md` server-side
4. calls OpenRouter (model from `OPENROUTER_MODEL`, default `google/gemini-2.5-flash`)
5. validates AI output with strict Zod schema
6. saves the log through the selected repository (`mock` or `aws`)
7. returns:
   - `log`
   - `profileCandidates` (milestones, activeSchemas, interests)
   - `extractionSource` (`openrouter` or `fallback`)

### Fallback behavior

If OpenRouter is unavailable (missing key, timeout, invalid response, or request failure), the log is still saved and extraction falls back to empty candidates (`extractionSource="fallback"`).

---

## Authentication, Demo Mode, and Session Cookies

The app supports two runtime experiences:

- **Demo Mode (default):** mock read/write behavior (in-memory only)
- **Authenticated Mode:** real AWS-backed reads/writes when `DATA_MODE=aws`

### User flow

1. App loads and shows **`Demo Mode (click to login)`** in the header.
2. Clicking opens a simple passcode login dialog.
3. Successful login sets a signed session cookie and switches to authenticated mode.
4. Header action becomes **`Log out`**.
5. Logging out clears the session and returns the app to demo mode.

### Cookies used

- `sprout_session`
  - Signed token created server-side (`role`, `exp`)
  - `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production
  - TTL controlled by:
    - `SESSION_TTL_HOURS` (normal sign-in)
    - `SESSION_REMEMBER_TTL_DAYS` (remember-me sign-in)
- `sprout_demo`
  - Marks demo-mode browsing for public/non-authenticated usage
  - `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production

### Endpoints

- `POST /api/auth/login` → validates passcode and issues signed session cookie
- `POST /api/auth/logout` → clears session and returns to demo cookie state
- `POST /api/auth/demo` → explicitly forces demo cookie state
- `GET /api/auth/status` → returns current resolved mode

### Security notes

- Passcode validation uses timing-safe comparison.
- Signed session cookie prevents tampering from granting admin access.
- API routes still enforce mode checks server-side (defense in depth):
  - demo: reads and writes use mock repositories (in-memory only)
  - authenticated: reads and writes follow selected data mode (`aws` or `mock`)
  - unauthenticated: blocked

For production on Amplify, store `ADMIN_PASSCODE` and `SESSION_SECRET` in Amplify environment variables.

If `SESSION_SECRET` is missing, the app stays in **demo-only mode** and passcode login is disabled (`AUTH_DISABLED`).

---

## Profile Candidate Review Flow

The Daily Log UI uses a review-first profile update flow:

1. save log
2. show suggested profile candidates in a modal
3. allow removing any suggestion before apply
4. call `PATCH /api/v1/profile` with accepted values only

Profile updates use append-only merge with case-insensitive dedupe for:
- `milestones`
- `activeSchemas`
- `interests`

In demo mode, profile candidate apply writes to in-memory mock storage only.

### Write behavior by auth mode and data mode

- `mode=authenticated` + `DATA_MODE=aws`:
  - reads and writes go to AWS repositories (DynamoDB/S3-backed)
- `mode=authenticated` + `DATA_MODE=mock`:
  - reads and writes go to mock repositories (in-memory)
- `mode=demo` (regardless of `DATA_MODE`):
  - reads and writes go to mock repositories (in-memory)
  - this enables local/demo testing of daily log creation, OpenRouter extraction, and profile candidate apply without AWS writes

---

## Mock Persistence Notes

In mock mode, profile/log data is stored in process memory.

- persists while the same dev server process is running
- resets on server restart/crash
- may reset during module reload/hot reload events

Use `DATA_MODE=aws` for durable persistence.

---

## Local Development

Start the app:

```bash
npm run dev
```

### Dev launcher behavior

`npm run dev` runs `scripts/dev-with-profile.mjs`.

The launcher:
- preloads `.env` and `.env.local`
- uses precedence: **shell env > `.env.local` > `.env`**
- checks `DATA_MODE`
- if `DATA_MODE=aws` and `AWS_PROFILE` is missing, sets `AWS_PROFILE=sprout-local`
- if `DATA_MODE=mock`, skips AWS profile injection

Dry-run the launcher logic without starting Next.js:

```bash
node -e "process.env.SPROUT_DEV_DRY_RUN='1'; import('./scripts/dev-with-profile.mjs')"
```

---

## AWS Credentials (Local vs Deployed)

### Local development

Use AWS CLI profiles (recommended):

```bash
aws configure --profile sprout-local
```

The launcher can auto-apply this profile in AWS mode when profile is not already set.

### Deployed runtime

Use IAM roles (least privilege) for Amplify/Lambda runtime identities instead of local user keys.

---

## Troubleshooting

### Launcher says mock even though `.env.local` has `DATA_MODE=aws`

This was caused by checking `process.env` before env files were loaded. The launcher now preloads `.env`/`.env.local` before mode checks.

If behavior seems unexpected, run the dry-run command and confirm the mode message.

### Unexpected AWS identity/permissions

Check current caller identity:

```bash
aws sts get-caller-identity
```

If needed, explicitly set profile in shell before starting dev:

- Git Bash:
  ```bash
  export AWS_PROFILE=sprout-local
  npm run dev
  ```
- Windows CMD:
  ```cmd
  set AWS_PROFILE=sprout-local&& npm run dev
  ```
