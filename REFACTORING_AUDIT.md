# Habita — Auditoría de Compliance con Skills & Rules

**Fecha:** 2026-03-09
**Alcance:** Compliance con patrones definidos en `.claude/skills/` y `.claude/rules/`
**Prerrequisito:** ARCHITECTURE_AUDIT.md (Fases 0-7 completadas)

---

## Resumen

Esta auditoría compara el codebase contra las reglas, skills y convenciones documentadas en CLAUDE.md, `.claude/rules/` y `.claude/skills/`. Se enfoca en inconsistencias donde un patrón se aplica en unos lugares pero no en otros.

---

## Diagnóstico por Capa

### 1. API ROUTES — Compliance con `api-routes.md`

**Regla violada: "Wrap ALL catch blocks with handleApiError(error, context)"**

| # | Archivo | Problema |
|---|---------|----------|
| R-1 | `cron/events/ingest/route.ts` | catch block manual, no usa `handleApiError` |
| R-2 | `cron/process/route.ts` | GET handler sin try/catch |
| R-3 | `cron/scan-gmail/route.ts` | catch block manual |
| R-4 | `cron/weekly-plan/route.ts` | GET handler sin try/catch |
| R-5 | `rotations/process/route.ts` | catch block manual |
| R-6 | `gmail/callback/route.ts` | catch block manual |
| R-7 | `stats/route.ts` | catch block manual |
| R-8 | `push/subscribe/route.ts` | catch block manual en POST y DELETE |

**Regla violada: "Validate body with Zod .safeParse()"**

| # | Archivo | Problema |
|---|---------|----------|
| R-9 | `push/subscribe/route.ts` (POST) | `typeof` checks manuales en vez de Zod |
| R-10 | `push/subscribe/route.ts` (DELETE) | `typeof` check manual |
| R-11 | `notifications/route.ts` (PATCH) | Validación manual del body |

---

### 2. WEB COMPONENTS — Compliance con `web-components.md`

**Regla violada: "Use apiFetch() for ALL client-side API calls"**

16 componentes usan `fetch()` directo:

| # | Archivo | Calls |
|---|---------|-------|
| W-1 | `my-assignments-list.tsx` | 5 fetch calls |
| W-2 | `progress-view.tsx` | 1 |
| W-3 | `notifications-page.tsx` | 1 |
| W-4 | `daily-briefing-wrapper.tsx` | 1 |
| W-5 | `daily-checklist.tsx` | 1 |
| W-6 | `fridge-calendar-view.tsx` | 1 |
| W-7 | `profile-settings.tsx` | 1 |
| W-8 | `absences-manager.tsx` | 1 |
| W-9 | `transfer-request-button.tsx` | 1 |
| W-10 | `task-catalog-picker.tsx` | 1 |
| W-11 | `pending-transfers.tsx` | 1 |
| W-12 | `plan-status-card.tsx` | 1 |
| W-13 | `household-switcher.tsx` | 1 |
| W-14 | `add-task-to-day-dialog.tsx` | 1 |
| W-15 | `rotation-toggle.tsx` | 1 |
| W-16 | `notifications-dropdown.tsx` | 1 |

**Regla violada: "Use EmptyState component for empty lists"**

| # | Archivo | Problema |
|---|---------|----------|
| W-17 | `notifications-page.tsx` | Inline empty state, no usa `EmptyState` |
| W-18 | `progress-view.tsx` | Inline empty state |
| W-19 | `absences-manager.tsx` | Inline empty state |
| W-20 | `pending-transfers.tsx` | Inline empty state |
| W-21 | `services-list.tsx` | Inline empty state |
| W-22 | `fund-page.tsx` | Inline empty state |
| W-23 | `expense-insights-page.tsx` | Inline empty state |

**Regla violada: "Date serialization — .toISOString() before passing to client"**

| # | Archivo | Campo |
|---|---------|-------|
| W-24 | `plan/page.tsx` | `plan.createdAt` pasado raw a client component |
| W-25 | `dashboard/page.tsx` | `assignment.createdAt`, `assignment.completedAt` |
| W-26 | `my-tasks/page.tsx` | `assignment.dueDate` |
| W-27 | `rotations/page.tsx` | `rotation.createdAt` |
| W-28 | `tasks/page.tsx` | `task.createdAt` |

**Regla violada: "Use PageHeader for page titles"**

| # | Archivo | Problema |
|---|---------|----------|
| W-29 | `dashboard/page.tsx` | Custom heading, no usa `PageHeader` |
| W-30 | `plan/page.tsx` | Custom heading |

**Regla violada: "Spanish Argentine imperative (vos)"**

| # | Archivo | Actual → Correcto |
|---|---------|-------------------|
| W-31 | Varias páginas | "Gestiona" → "Gestioná" |
| W-32 | Varias páginas | "Configura" → "Configurá" |
| W-33 | Varias páginas | "Selecciona" → "Seleccioná" |
| W-34 | Varias páginas | "Conecta" → "Conectá" |

---

### 3. MOBILE SCREENS — Compliance con `mobile-screens.md`

**Regla violada: "useThemeColors() + createStyles(colors) — NO hardcoded hex"**

Los siguientes archivos tienen colores hardcodeados extensivos (20+ cada uno):

| # | Archivo | Instancias aprox. |
|---|---------|-------------------|
| M-1 | `balance.tsx` | ~25 (success/warning/error greens, reds, yellows) |
| M-2 | `compras.tsx` | ~40 (store type colors, status colors) |
| M-3 | `cocina.tsx` | ~30 (recipe category colors, status) |
| M-4 | `tasks.tsx` | ~20 (priority colors, status) |
| M-5 | `descubrir.tsx` | ~25 (card backgrounds, category colors) |
| M-6 | `grocery-deals.tsx` | ~15 |
| M-7 | `services.tsx` | ~15 |
| M-8 | `expense-insights.tsx` | ~15 |
| M-9 | `fund.tsx` | ~10 |
| M-10 | `notifications.tsx` | ~10 |
| M-11 | `progress.tsx` | ~10 |
| M-12 | `components/features/expense-list-item.tsx` | ~10 |
| M-13 | `components/features/service-card.tsx` | ~8 |
| M-14 | `components/features/deal-card.tsx` | ~8 |
| M-15 | `components/features/recipe-card.tsx` | ~8 |
| M-16 | `components/features/event-card.tsx` | ~8 |

**Regla violada: "RefreshControl on all data-fetching ScrollViews"**

| # | Archivo |
|---|---------|
| M-17 | `balance.tsx` |
| M-18 | `services.tsx` |
| M-19 | `fund.tsx` |
| M-20 | `progress.tsx` |
| M-21 | `expense-insights.tsx` |
| M-22 | `notifications.tsx` |
| M-23 | `preferences.tsx` |
| M-24 | `profile.tsx` |

**Regla violada: "NO FlatList inside ScrollView"**

| # | Archivo | Problema |
|---|---------|----------|
| M-25 | `city-typeahead.tsx` | FlatList dentro de ScrollView |
| M-26 | `login.tsx` | FlatList dentro de ScrollView |

**Regla violada: "Use BottomSheet instead of Modal"**

| # | Archivo |
|---|---------|
| M-27 | `balance.tsx` — Modal para detalle |
| M-28 | `compras.tsx` — Modal para picker |
| M-29 | `cocina.tsx` — Modal para detalle |

**Regla violada: "Alert titles in Spanish"**

| # | Archivo | Actual |
|---|---------|--------|
| M-30 | `balance.tsx` | `Alert.alert("Error", ...)` |
| M-31 | `compras.tsx` | `Alert.alert("Error", ...)` |
| M-32 | `tasks.tsx` | `Alert.alert("Error", ...)` |
| M-33 | `services.tsx` | `Alert.alert("Error", ...)` |
| M-34 | `fund.tsx` | `Alert.alert("Error", ...)` |
| M-35 | `notifications.tsx` | `Alert.alert("Error", ...)` |

---

### 4. PRISMA PERFORMANCE — Compliance con `debug-prisma-performance.md`

**Anti-pattern: "N+1 — create in loop instead of createMany"**

| # | Archivo | Línea | Problema |
|---|---------|-------|----------|
| P-1 | `assignment-algorithm.ts` | ~490 | `prisma.assignment.create` en loop → usar `createMany` |

**Anti-pattern: "Sequential independent queries — use Promise.all()"**

| # | Archivo | Queries |
|---|---------|---------|
| P-2 | `assignments/route.ts` | 3 queries independientes secuenciales |
| P-3 | `transfers/route.ts` | 2 queries independientes |
| P-4 | `roulette/assign/route.ts` | 2 queries independientes |

**Anti-pattern: "Unbounded findMany without take limit"**

| # | Archivo | Tabla |
|---|---------|-------|
| P-5 | `expenses/balances/route.ts` | expenses (high traffic) |
| P-6 | `fund/route.ts` | contributions + expenses → luego `.slice(0,10)` en JS |
| P-7 | `saved-items/events/route.ts` | saved events |
| P-8 | `saved-items/recipes/route.ts` | saved recipes |
| P-9 | `saved-items/deals/route.ts` | saved deals |
| P-10 | `services/route.ts` | services |

**Anti-pattern: "Existence check fetching full object — use select: { id: true }"**

| # | Archivo | Problema |
|---|---------|----------|
| P-11 | Varias rutas POST | `findFirst()` sin `select` para check de existencia |

---

### 5. SHARED PACKAGES — Compliance con `shared-packages.md` y contracts

**Regla violada: "Contract schemas for every endpoint"**

15+ API routes sin schema en `@habita/contracts`:

| Grupo | Routes sin contract |
|-------|-------------------|
| Absences | `/api/absences` (POST/DELETE) |
| Rotations | `/api/rotations/*` (3 routes) |
| Preferences | `/api/preferences` (POST/DELETE) |
| Push tokens | `/api/push/subscribe` (POST/DELETE) |
| Gmail | `/api/gmail/*` (2 routes) |
| Fund | `/api/fund` (POST) |
| Stats | `/api/stats` |
| Notifications | `/api/notifications` (PATCH) |
| Transfer | `/api/transfers/*` |
| Roulette | `/api/roulette/*` |

**Regla violada: "Naming convention — createXInputSchema, xResponseSchema"**

| # | Archivo | Actual → Correcto |
|---|---------|-------------------|
| C-1 | `shopping-plan.ts` | `shoppingPlanPayloadSchema` → `createShoppingPlanInputSchema` |
| C-2 | `shopping-plan.ts` | `shoppingPlanResultSchema` → `shoppingPlanResponseSchema` |
| C-3 | `expenses.ts` | `expensePayloadSchema` → `createExpenseInputSchema` |
| C-4 | `services.ts` | `servicePayloadSchema` → `createServiceInputSchema` |

**Problema: Schemas duplicados y divergentes**

Schemas en `src/lib/validations/` duplican los de `@habita/contracts` con diferencias:
- Local schemas tienen mensajes de error en español argentino
- Local schemas tienen `.refine()` validators adicionales
- Local schemas tienen enums más estrictos
- Rutas importan de local en vez de contracts

---

## Plan de Refactorización (Fase 2)

### Fase 2.0 — Date Serialization (BUGS — prioridad máxima)

Dates pasados raw a client components pueden causar hydration mismatches.

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 2.0.1 | Serializar dates con `.toISOString()` en 5 server pages | W-24–W-28 | 30 min |

### Fase 2.1 — fetch() → apiFetch() en web (HIGH — consistencia)

`apiFetch()` agrega auth headers, base URL, y error handling estandarizado.

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 2.1.1 | Migrar 16 componentes de `fetch()` a `apiFetch()` | W-1–W-16 | 2 hrs |

### Fase 2.2 — API Routes handleApiError + Zod (HIGH — robustez)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 2.2.1 | Migrar 8 routes a `handleApiError()` en catch blocks | R-1–R-8 | 1 hr |
| 2.2.2 | Reemplazar `typeof` checks por Zod `.safeParse()` en 3 routes | R-9–R-11 | 30 min |

### Fase 2.3 — Prisma Performance (HIGH — queries)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 2.3.1 | Refactorizar N+1 create → `createMany` en assignment-algorithm | P-1 | 30 min |
| 2.3.2 | `Promise.all()` para queries independientes en 3 routes | P-2–P-4 | 30 min |
| 2.3.3 | Agregar `take` limits en 6 `findMany` unbounded | P-5–P-10 | 30 min |
| 2.3.4 | `select: { id: true }` en existence checks | P-11 | 20 min |

### Fase 2.4 — EmptyState + PageHeader web (MEDIUM — UX consistency)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 2.4.1 | Reemplazar 7 inline empty states por `EmptyState` component | W-17–W-23 | 1 hr |
| 2.4.2 | Migrar 2 páginas a `PageHeader` | W-29–W-30 | 30 min |

### Fase 2.5 — Mobile hardcoded colors (MEDIUM — design system)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 2.5.1 | Crear semantic color tokens en design-tokens (success, warning, error, info) | Setup | 30 min |
| 2.5.2 | Migrar colores en top 5 screens (balance, compras, cocina, tasks, descubrir) | M-1–M-5 | 4 hrs |
| 2.5.3 | Migrar colores en remaining 11 files | M-6–M-16 | 3 hrs |

### Fase 2.6 — Mobile UX patterns (MEDIUM — compliance)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 2.6.1 | Agregar RefreshControl a 8 screens | M-17–M-24 | 1 hr |
| 2.6.2 | Reemplazar FlatList por ScrollView+map en 2 archivos | M-25–M-26 | 30 min |
| 2.6.3 | Migrar 3 Modals a BottomSheet | M-27–M-29 | 1.5 hrs |
| 2.6.4 | Cambiar Alert titles "Error" → "Ocurrió un error" | M-30–M-35 | 15 min |

### Fase 2.7 — Spanish Argentine text (LOW — polish)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 2.7.1 | Corregir imperativo "vos" en web pages | W-31–W-34 | 30 min |

### Fase 2.8 — Contracts consolidation (LOW — long-term)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 2.8.1 | Crear contracts faltantes para 15+ API routes | C-missing | 3 hrs |
| 2.8.2 | Renombrar schemas existentes a convención `createXInput`/`xResponse` | C-1–C-4 | 30 min |
| 2.8.3 | Consolidar `src/lib/validations/` → `@habita/contracts` (merge AR messages + refine) | C-diverged | 2 hrs |

---

## Resumen Ejecutivo

| Categoría | MUST | HIGH | MEDIUM | LOW | Total |
|-----------|:----:|:----:|:------:|:---:|:-----:|
| API Routes (handleApiError, Zod) | 8 | 3 | 0 | 0 | 11 |
| Web (fetch→apiFetch, Dates, EmptyState) | 5 | 16 | 9 | 4 | 34 |
| Mobile (colors, RefreshControl, FlatList) | 2 | 16 | 14 | 6 | 38 |
| Prisma Performance | 1 | 9 | 1 | 0 | 11 |
| Shared Packages (contracts) | 0 | 0 | 4 | 18+ | 22+ |
| **TOTAL** | **16** | **44** | **28** | **28+** | **116+** |

### Esfuerzo estimado total: ~25-30 horas de trabajo

### Prioridad de ejecución:
1. **Fase 2.0** (bugs) — Date serialization previene hydration mismatches
2. **Fase 2.1** (high) — fetch→apiFetch asegura auth headers en todas las llamadas
3. **Fase 2.2** (high) — Error handling consistente en API routes
4. **Fase 2.3** (high) — Prisma performance (N+1, unbounded queries)
5. **Fase 2.4** (medium) — UI estandarizada web
6. **Fase 2.5-2.6** (medium) — Mobile design system y UX
7. **Fase 2.7-2.8** (low) — Polish y contracts a largo plazo
