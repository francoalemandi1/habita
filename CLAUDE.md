# Habita

Gestor de tareas del hogar para familias argentinas. Web + Mobile (monorepo pnpm).

- Web: `src/` (Next.js App Router, Vercel)
- Mobile: `apps/mobile/` (Expo + React Native)
- Shared: `packages/contracts/` (Zod schemas), `packages/design-tokens/`, `packages/api-client/`, `packages/domain/`

## Idioma

Español argentino en UI. Código en inglés.

## Comandos

```bash
pnpm typecheck        # Web — correr después de cada cambio
pnpm typecheck:all    # Web + packages + mobile
pnpm build            # prisma generate + next build
pnpm db:push          # Schema → DB local (solo dev)
pnpm db:deploy        # Aplicar migraciones (producción)
```

### Mobile — build shareable (APK via URL)

```bash
cd apps/mobile && eas build --profile preview --platform android
```

Genera un APK hosteado en expo.dev con URL compartible. El perfil `preview` apunta a `habita.casa` (prod). `--non-interactive` omite preguntas del CLI (útil en CI).

```bash
cd apps/mobile && eas build --profile preview --platform ios
```

Genera un `.ipa` para iOS (requiere Apple Developer account y certificates configurados en EAS). Ambos builds quedan en expo.dev con URL compartible.

## Reglas críticas

### Data isolation
SIEMPRE filtrar por `householdId`. Usar `getCurrentMember()` o `requireMember()` en cada API route. NUNCA confiar en un householdId enviado por el cliente.

### TypeScript strict
`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `strictNullChecks`. Los array accesses pueden ser `undefined`.

### Shared packages
NO pueden importar `@/*`, `next/*`, ni `react-native` (ESLint enforced). Deben ser platform-agnostic.

### Prisma Decimal
Montos son `Decimal` en DB. Serializar con `.toNumber()` antes de enviar al cliente.

### Campos nuevos en schema
SIEMPRE nullable (`?`) o con `@default()`. Si no, la migración falla en producción con datos existentes.

### Typecheck después de cambios
Si se tocó solo web: `pnpm typecheck`. Si se tocó mobile o packages: `pnpm typecheck:all`.

### Paridad web ↔ mobile
Todo cambio funcional o de UX hecho en web (`src/`) DEBE replicarse en mobile (`apps/mobile/`). Aplicar misma lógica, mismos fixes, misma data. Adaptar UI a patrones nativos (React Native, `useThemeColors`, `ScrollView`, etc.).

## Patrones del proyecto

### Auth dual
- **Web**: NextAuth (cookie JWT, 30 días)
- **Mobile**: Bearer tokens (`mob_at_*` / `mob_rt_*`) con refresh rotation
- Ambos se resuelven en `getCurrentUserId()` (`src/lib/session.ts`)

### Permisos (MemberType)
- ADULT: todo
- TEEN: complete + transfer + preference
- CHILD: solo complete
- Usar `requirePermission("task:create")` en API routes que mutan

### API routes
- Error handling: `handleApiError(error, context)` — mapea Prisma/AppError automáticamente
- Errores custom: `BadRequestError`, `NotFoundError`, `ConflictError`, etc. (`src/lib/errors.ts`)
- Crons protegidos por `CRON_SECRET` header

### Household mode
`isSoloHousehold()` es derivado del member count (nunca stored en DB). Cambia copy y features visibles.

### Notifications
Fire-and-forget: errores se loguean pero nunca propagan. No wrappear en try/catch que cambie el flujo.

### Mobile theme
`useThemeColors()` hook + `createStyles(colors)` factory con `useMemo`. NO hex hardcodeados.

### Mobile listas
Usar `ScrollView` con `.map()` o `nestedScrollEnabled`. NO `FlatList` dentro de `ScrollView` (VirtualizedList error).

### Mobile API client
`createApiClient()` de `@habita/api-client`. Auto-inyecta Bearer token + header `x-habita-household-id`. Retry en network errors. Refresh automático en 401.

### Mobile storage keys
Prefijo `habita_mobile_` (tokens, household, device, theme). `habita_first_visit:` para guides.

### Web dark mode
CSS variables `.dark` en `globals.css`, activado con `next-themes`.

### First-visit guides
- Web: `localStorage` (`src/hooks/use-first-visit.ts`)
- Mobile: `AsyncStorage` (`apps/mobile/src/hooks/use-first-visit.ts`)

### Contracts
Agregar Zod schemas en `packages/contracts/src/` para cada endpoint nuevo. Nombrar: `createXInputSchema`, `xResponseSchema`.

### Design tokens
`packages/design-tokens/` es fuente de verdad para colores (light + dark), spacing, radius, shadows. Sincronizado con CSS vars de `globals.css`.

### Domain logic
`packages/domain/`: `inferExpenseSubcategory()` (240+ keywords AR), `parseProductUnit()` (g/kg/ml/L regex).

### AI background jobs
Operaciones AI async (LLM, scraping) usan fire-and-forget con polling:
`markJobRunning()` → `after()` ejecuta → `completeJob()` → cliente pollea `/api/ai/job-status`.
Hook compartido: `useAiJobStatus()` (web y mobile). Ver skill `ai-background-job.md`.

### Query keys (React Query)
- Compartidos web+mobile: `packages/contracts/src/query-keys.ts`
- Web-only: `src/lib/query-keys.ts` (extiende los compartidos)

### UI estandarizada (web)
- `PageHeader` (`src/components/ui/page-header.tsx`) — título + subtítulo + ícono + acciones
- `EmptyState` (`src/components/ui/empty-state.tsx`) — ícono/emoji + título + descripción + children

## Migraciones (CRÍTICO)

- **NUNCA** modificar `schema.prisma` sin migración antes de commitear
- **NUNCA** `db:push` en producción
- Migración en prod ANTES de pushear código que la necesite
- `DATABASE_URL` — pooled (runtime), `DATABASE_URL_UNPOOLED` — direct (migraciones)
- Procedimiento completo: ver skill `prisma-migration.md`

## Skills

Skills disponibles en `.claude/skills/`:

### Creación
- `new-api-endpoint.md` — Crear endpoint API completo
- `new-web-page.md` — Nueva página web (server + client components)
- `new-mobile-screen.md` — Nueva pantalla mobile con todos los patrones
- `new-shared-package.md` — Nuevo paquete compartido en el monorepo
- `full-feature.md` — Feature completa (contract → API → web → mobile)
- `ai-background-job.md` — Operación AI async con fire-and-forget + polling
- `cron-job.md` — Job programado con Vercel Cron

### Operaciones
- `prisma-migration.md` — Procedimiento de migración paso a paso
- `deploy-checklist.md` — Checklist pre-deploy

### Debugging
- `debug-mobile-auth.md` — Diagnosticar problemas de auth mobile
- `debug-prisma-performance.md` — Anti-patterns y optimización de queries Prisma

### Dominio
- `expense-management.md` — Splits, settlements, balances y precisión Decimal

## Rules (contextuales)

Reglas en `.claude/rules/` se cargan automáticamente según el path del archivo que se esté editando:

- `api-routes.md` — `src/app/api/**` — Auth, data isolation, error handling, Prisma patterns
- `mobile-screens.md` — `apps/mobile/**` — Theme, ScrollView, SafeAreaView, mobileApi
- `prisma-schema.md` — `prisma/schema.prisma` — Nullable fields, migraciones, Decimal
- `shared-packages.md` — `packages/**` — Platform-agnostic, sin imports de @/*, next/*, react-native
- `web-components.md` — `src/components/**`, `src/app/**/*.tsx` — PageHeader, EmptyState, design tokens
- `data-isolation.md` — `src/app/api/**`, `src/lib/**` — householdId filtering, requireMember()
