# Mobile Production Roadmap (What Is Still Missing)

## Current baseline (already implemented)

- Expo app scaffold with Router, auth/app shells, React Query and storage abstraction (`apps/mobile`).
- Shared packages initialized:
  - `@habita/contracts`
  - `@habita/domain`
  - `@habita/api-client`
  - `@habita/design-tokens`
- Mobile auth lane exists in backend:
  - `POST /api/auth/mobile/exchange`
  - `POST /api/auth/mobile/refresh`
  - `POST /api/auth/mobile/logout`
- `session.ts` supports bearer auth and `x-habita-household-id` header.
- First vertical prototype in mobile (`expenses` list + create).

This is a strong foundation, but it is still **pre-production**.

## Production-critical gaps

## 1) Identity and token security hardening

### Missing / pending
- Replace token storage in generic `Session` records with a mobile-specific secure model.
  - Today access/refresh tokens are stored as plain session tokens; no hashing.
- Add refresh token rotation safeguards:
  - token family tracking;
  - replay detection;
  - revoke-all on suspicious reuse.
- Add device/session metadata for audit and revocation UX.
- Add issuer checks and stronger claim validation for Google ID token (`iss`, nonce strategy if applicable).

### Target
- Dedicated model (e.g. `MobileAuthSession`) with hashed refresh token, expiry, device metadata, revoked-at fields.
- One-time-use refresh semantics with breach detection.

## 2) OAuth native rollout completeness

### Missing / pending
- Google Cloud production setup checklist not codified:
  - iOS/Android OAuth clients;
  - bundle/package IDs;
  - redirect URI verification.
- Environment split per stage (`dev`, `staging`, `prod`) for mobile OAuth IDs and API base URL.
- Clear fallback behavior if OAuth provider is unavailable.

### Target
- Repeatable runbook to configure new environments without guesswork.
- Staging and production OAuth credentials fully separated.

## 3) API compatibility and contract stability

### Missing / pending
- Expand contracts coverage to all payloads used by planned mobile modules.
- Add contract-versioning policy and compatibility tests.
- Ensure all endpoints needed by mobile use consistent error envelopes/codes.

### Target
- `packages/contracts` becomes source of truth for mobile-facing DTOs.
- CI check that server responses keep contract compatibility.

## 4) Mobile app runtime hardening

### Missing / pending
- Replace console telemetry with production observability (Sentry/Crashlytics style).
- Global error boundary and network failure UX patterns.
- App lifecycle handling:
  - token refresh on foreground;
  - safe logout on auth failure loops.
- Secure storage strategy validation for sensitive tokens.

### Target
- Crash/error visibility by release version and endpoint.
- Predictable auth/session behavior across app restarts and background/foreground.

## 5) CI/CD and release operations

### Missing / pending
- EAS build profiles and signed artifacts strategy.
- App versioning/release channel policy.
- CI jobs for mobile typecheck/tests/build smoke.
- Promotion process dev -> staging -> prod.

### Target
- Automated build pipeline with deterministic promotion gates.
- Operational playbook for mobile releases and rollback.

## 6) QA and test depth

### Missing / pending
- Unit tests in shared packages are minimal.
- No dedicated integration tests for mobile auth endpoints.
- No E2E mobile smoke flow for login + first vertical.
- No performance baseline measurements on real devices.

### Target
- Mandatory test suite before beta:
  - auth exchange/refresh/logout integration tests;
  - mobile happy-path smoke;
  - contract validation tests.

## 7) Product parity for first public beta

### Missing / pending
- Expenses vertical is still minimal (no edit/delete/settle/fund/service integration parity).
- Household switch UX in mobile must be first-class before shared households scale.
- Empty/error/loading states need consistency across all authenticated screens.

### Target
- Beta-ready scope for `Registrá` with clear parity checklist against web.

## Plan continuation (next 4 execution waves)

## Wave 1 — Security and auth hardening (highest priority)
- Introduce dedicated `MobileAuthSession` data model and migration.
- Hash refresh tokens + rotation family + replay protection.
- Add auth integration tests for exchange/refresh/logout.

Deliverable:
- Production-safe token lifecycle.

## Wave 2 — OAuth and env operations
- Complete Google OAuth production runbook and env matrix.
- Finalize Expo config per environment.
- Add bootstrap diagnostics screen for OAuth/env issues (internal only).

Deliverable:
- Reproducible secure login in staging/prod.

## Wave 3 — Runtime/observability
- Add crash + API error instrumentation.
- Add robust auth failure recovery and lifecycle refresh handling.
- Define and monitor SLOs from `docs/mobile-quality-gates.md`.

Deliverable:
- Operable mobile app with visibility and alerting.

## Wave 4 — Beta parity on first vertical
- Complete `Registrá` parity subset:
  - list/create/edit/delete;
  - retries and degraded mode UX;
  - household switching.
- Run pilot with measured KPIs.

Deliverable:
- Controlled external beta for one validated vertical.

## Suggested immediate next task

Start with **Wave 1** and implement:
1. New Prisma model for mobile auth sessions.
2. Hash + rotate refresh tokens with replay detection.
3. Integration tests for `/api/auth/mobile/*`.

This is the most important blocker between “works” and “safe for production”.
