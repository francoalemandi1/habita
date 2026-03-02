# Mobile Quality Gates and Metrics

## Purpose

Define objective gates for advancing each mobile rollout phase without risking web stability.

## Phase 0 Gate (Workspace and boundaries)

- `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.
- Shared packages exist with explicit exports:
  - `@habita/contracts`
  - `@habita/domain`
  - `@habita/api-client`
  - `@habita/design-tokens`
- Lint rule blocks web-only imports inside `packages/*`.

## Phase 1 Gate (Foundation)

- Expo app boots and can navigate auth/app shells.
- React Query provider and API client are wired.
- Storage abstraction persists tokens and active household.
- Basic telemetry logs auth/network failures.

Metrics:
- cold start to first screen under 3 seconds on local dev build;
- unhandled promise rejection count in app boot: 0.

## Phase 2 Gate (Mobile auth lane)

- Backend exposes:
  - `POST /api/auth/mobile/exchange`
  - `POST /api/auth/mobile/refresh`
  - `POST /api/auth/mobile/logout`
- `requireAuth` and `requireMember` work with bearer and existing web cookies.
- Active household can be selected via `x-habita-household-id`.

Metrics:
- token refresh success rate above 99% in controlled QA;
- unauthorized API calls after refresh: 0 in test suite.

## Phase 3 Gate (Shared packages adoption)

- Web imports extracted domain utilities through shared packages.
- Mobile consumes shared contracts and API client.
- No shared package imports Next.js or app aliases.

Metrics:
- duplicate DTO definitions reduced to 0 in mobile/web for covered domains;
- package-level tests for contracts/domain passing in CI.

## Phase 4 Gate (First vertical: expenses)

- Mobile can:
  - list expenses;
  - create expense;
  - render empty and error states;
  - retry failed requests.
- End-to-end against real BFF in staging succeeds.

Metrics:
- expense list API success rate above 99%;
- create expense p95 response below 1.5 seconds in staging;
- crash-free sessions above 99.5% for pilot cohort.

## Ongoing rollout metrics

- API error rate by endpoint and platform.
- Auth failure rate by mobile version.
- Retention and completion for the first shipped vertical.
- Time to parity per module after kickoff.
