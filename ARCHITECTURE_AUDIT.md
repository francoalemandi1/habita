# Habita — Auditoría de Arquitectura y Plan de Refactorización

**Fecha:** 2026-03-09
**Alcance:** Infraestructura, Backend, AI/LLM, Frontend Web, Mobile, Shared Packages

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Web (Next.js │  │ Mobile (Expo │  │  Crons (Vercel)  │  │
│  │  App Router)  │  │ + RN)        │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐  │
│  │              API Routes (src/app/api/)                 │  │
│  │  requireMember() · handleApiError() · householdId     │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────┴────────────────────────────┐  │
│  │              Prisma ORM → Neon PostgreSQL              │  │
│  │  48 models · 65 indexes · pooled + direct URLs        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────────────── Shared Packages ────────────────────┐  │
│  │ contracts (Zod) │ domain (logic) │ design-tokens │    │  │
│  │ api-client (HTTP) │ query-keys                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────────────── AI Layer ───────────────────────────┐  │
│  │ DeepSeek + Gemini │ Tavily + Serper │ Background Jobs │  │
│  │ markJobRunning → after() → completeJob → polling      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles (definidos)

| Principio | Estado | Notas |
|-----------|--------|-------|
| Data isolation (householdId) | ✅ Cumplido | 100% de rutas filtran correctamente |
| TypeScript strict | ✅ Cumplido | noUncheckedIndexedAccess, verbatimModuleSyntax |
| Shared packages platform-agnostic | ✅ Cumplido | 0 violaciones de imports |
| Decimal serialization | ✅ Cumplido | .toNumber() consistente |
| Auth dual (web cookie + mobile Bearer) | ✅ Cumplido | requireMember() unificado |
| Feature parity web ↔ mobile | ✅ Cumplido | 28/28 screens con paridad |

---

## Diagnóstico por Capa

### 1. INFRAESTRUCTURA

**Estado general: BUENO con 2 issues críticos**

#### Hallazgos

| # | Severidad | Descripción | Archivo | Línea |
|---|-----------|-------------|---------|-------|
| I-1 | 🔴 CRÍTICO | `maxDuration` falta en `/api/cron/process` — timeout con 8 operaciones paralelas (~40-90s) | `src/app/api/cron/process/route.ts` | — |
| I-2 | 🔴 CRÍTICO | `maxDuration` falta en `/api/cron/weekly-plan` — timeout con loop por household (~60-300s) | `src/app/api/cron/weekly-plan/route.ts` | — |
| I-3 | 🟡 MEDIO | 3 modelos sin `@@index([householdId])`: SavedEvent, SavedRecipe, SavedCart | `prisma/schema.prisma` | ~961, ~992, ~1015 |
| I-4 | 🟢 BAJO | `CRON_SECRET` falta en `.env.example` | `.env.example` | — |
| I-5 | 🟢 BAJO | `/api/cron/scan-gmail` no retorna campo `success` en response | `src/app/api/cron/scan-gmail/route.ts` | — |
| I-6 | 🟢 BAJO | Build script no incluye `typecheck:all` | `package.json` | — |

---

### 2. BACKEND (API Routes)

**Estado general: MUY BUENO — 100+ rutas auditadas**

#### Hallazgos

| # | Severidad | Descripción | Archivos afectados |
|---|-----------|-------------|--------------------|
| B-1 | 🔴 CRÍTICO | `.parse()` en vez de `.safeParse()` — crash sin manejo en rutas de saved-items | `src/app/api/saved-items/deals/route.ts:36` y similares |
| B-2 | 🟠 ALTO | 4 rutas sin `handleApiError()` — manejo manual inconsistente | `push-tokens/route.ts`, `push-tokens/deregister/route.ts`, `notification-preferences/route.ts`, `briefing/route.ts` |
| B-3 | 🟡 MEDIO | Chequeos manuales de auth error redundantes (ya mapeados por `mapSessionError`) | Mismas 4 rutas de B-2 |
| B-4 | 🟡 MEDIO | Type cast sin guard en deactivación de member (`plan.assignments as Array<...>`) | `src/app/api/members/[memberId]/route.ts:143` |
| B-5 | 🟢 BAJO | Response format inconsistente: algunos retornan `null` directo vs `{ data: null }` | `fund/route.ts`, `members/me/route.ts`, `households/route.ts` |
| B-6 | 🟢 BAJO | Validation errors: algunos retornan `details` y otros no | Varias rutas POST/PATCH |
| B-7 | 🟢 BAJO | 1 componente usa `fetch()` directo en vez de `apiFetch()` | `preferences-manager.tsx:42` |

---

### 3. AI / LLM

**Estado general: BUENA ARQUITECTURA — background jobs bien implementados**

#### Hallazgos

| # | Severidad | Descripción | Archivo |
|---|-----------|-------------|---------|
| A-1 | 🟠 ALTO | Error messages referencian providers no implementados (Anthropic, OpenRouter) | `src/app/api/ai/generate-plan/route.ts:18`, `preview-plan/route.ts:71` |
| A-2 | 🟠 ALTO | DeepSeek provider no tiene fallback de JSON extraction (Gemini sí lo tiene) | `src/lib/llm/deepseek-provider.ts:35` |
| A-3 | 🟡 MEDIO | `apply-plan` acepta body con cast `as ApplyPlanBody` sin validación Zod | `src/app/api/ai/apply-plan/route.ts:31-37` |
| A-4 | 🟡 MEDIO | Race condition en stale job cleanup (updateMany + findFirst no atómicos) | `src/lib/ai-jobs.ts:34-56` |
| A-5 | 🟡 MEDIO | Type cast sin validación en `job-status` route (`as AiJobType`) | `src/app/api/ai/job-status/route.ts:11` |
| A-6 | 🟡 MEDIO | `POLL_INTERVAL_MS` duplicado en web y mobile (3000ms en ambos, no compartido) | `src/hooks/use-ai-job-status.ts:15`, `apps/mobile/src/hooks/use-ai-job-status.ts:12` |
| A-7 | 🟢 BAJO | Errores LLM genéricos (`console.error` + return null) sin clasificación | `ai-planner.ts:147`, `recipe-finder.ts`, `deals-finder.ts` |
| A-8 | 🟢 BAJO | API keys inicializadas a nivel módulo sin validación previa | `deepseek-provider.ts:12`, `gemini-provider.ts:8` |

---

### 4. FRONTEND WEB

**Estado general: BUENO con deuda técnica en colores y loading states**

#### Hallazgos

| # | Severidad | Descripción | Detalle |
|---|-----------|-------------|---------|
| W-1 | 🟠 ALTO | 204+ instancias de colores hardcodeados en 34 archivos | `dashboard/page.tsx:387-427`, `plans/page.tsx:80-107`, `expense-list.tsx:68-71`, `add-expense-dialog.tsx:70-76` |
| W-2 | 🟠 ALTO | 11 de 20 páginas sin `loading.tsx` | balance, cocina, compras, descubrir, expense-insights, grocery-deals, fund, notifications, progress, services, suggest-tasks |
| W-3 | 🟡 MEDIO | Solo 1 `error.tsx` global — sin error boundaries por página | `src/app/(app)/error.tsx` es el único |
| W-4 | 🟡 MEDIO | Dark mode incompleto: subcategorías DELIVERY y KIOSCO sin variantes `dark:` | `expense-list.tsx:68-71` |
| W-5 | 🟡 MEDIO | Forms usan useState manual × N campos — sin react-hook-form ni patrón unificado | `add-expense-dialog.tsx:131-150`, `edit-expense-dialog.tsx:40-46` |
| W-6 | 🟢 BAJO | Error handling inconsistente en hooks: algunos muestran toast, otros silencian | `use-services.ts:51-52` vs `use-services.ts:21-22` |

---

### 5. MOBILE

**Estado general: EXCELENTE — 100% compliance con CLAUDE.md**

#### Hallazgos

| # | Severidad | Descripción | Archivo |
|---|-----------|-------------|---------|
| M-1 | 🟠 ALTO | 40+ colores hardcodeados en `compras.tsx` (#059669, #d97706, #fffbeb, etc.) | `apps/mobile/app/(app)/compras.tsx` |
| M-2 | 🟠 ALTO | Colores hardcodeados en `cocina.tsx` (#ecfdf5, #065f46, #d97706) | `apps/mobile/app/(app)/cocina.tsx` |
| M-3 | 🟡 MEDIO | Tab bar usa `#d2ffa0` hardcodeado para accent | `apps/mobile/app/(app)/_layout.tsx:83,346` |
| M-4 | 🟡 MEDIO | Algunos screens usan ActivityIndicator en vez de Skeleton loading | compras, cocina |
| M-5 | 🟢 BAJO | No hay pull-to-refresh en Profile, Preferences | Screens pequeños |
| M-6 | 🟢 BAJO | No hay haptic feedback en completar tareas | tasks.tsx |

---

### 6. SHARED PACKAGES

**Estado general: SÓLIDO — 0 violaciones platform-agnostic**

#### Hallazgos

| # | Severidad | Descripción | Archivo |
|---|-----------|-------------|---------|
| P-1 | 🟡 MEDIO | Query keys incompletos — faltan roulette, rotations, absences, preferences, push-tokens, cities | `packages/contracts/src/query-keys.ts` |
| P-2 | 🟡 MEDIO | Dark mode colors web vs mobile no pixel-perfect (HSL vs hex mismatch) | `globals.css:54-87` vs `apps/mobile/src/theme/index.ts:69-100` |
| P-3 | 🟡 MEDIO | API client sin timeout de request (puede colgar indefinidamente en mobile) | `packages/api-client/src/index.ts` |
| P-4 | 🟢 BAJO | Orden de evaluación de keywords en `inferExpenseSubcategory` no documentado | `packages/domain/src/expense-subcategory.ts:56-65` |
| P-5 | 🟢 BAJO | `onAuthFailure` puede rechazar sin catch en API client | `packages/api-client/src/index.ts:108-124` |
| P-6 | 🟢 BAJO | `unitInfo` tipado como `z.unknown()` en shopping-plan contract | `packages/contracts/src/shopping-plan.ts:14-19` |

---

## Plan de Refactorización

### Fase 0 — Hotfixes (bugs en producción)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 0.1 | Agregar `export const maxDuration = 120` en `/api/cron/process` | I-1 | 1 min |
| 0.2 | Agregar `export const maxDuration = 300` en `/api/cron/weekly-plan` | I-2 | 1 min |
| 0.3 | Cambiar `.parse()` → `.safeParse()` en rutas de saved-items | B-1 | 15 min |

### Fase 1 — Error Handling & Robustez (1-2 horas)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 1.1 | Migrar 4 rutas a `handleApiError()` (push-tokens, notification-preferences, briefing) | B-2 | 30 min |
| 1.2 | Corregir error messages en AI routes (solo mencionar DeepSeek + Gemini) | A-1 | 10 min |
| 1.3 | Agregar JSON extraction fallback en DeepSeek provider (copiar de Gemini) | A-2 | 15 min |
| 1.4 | Agregar validación Zod en `/api/ai/apply-plan` body | A-3 | 15 min |
| 1.5 | Validar `jobType` enum antes de cast en `/api/ai/job-status` | A-5 | 10 min |
| 1.6 | Agregar type guard en member deactivation (`Array.isArray` check) | B-4 | 5 min |

### Fase 2 — Prisma Schema & Indexes (migración necesaria)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 2.1 | Agregar `@@index([householdId])` a SavedEvent, SavedRecipe, SavedCart | I-3 | 20 min |
| 2.2 | Crear migración formal para los nuevos indexes | I-3 | 10 min |

### Fase 3 — Loading & Error States Web (2-3 horas)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 3.1 | Crear `loading.tsx` para 11 páginas faltantes con skeletons apropiados | W-2 | 2 hrs |
| 3.2 | Crear `error.tsx` específicos para páginas críticas (balance, expenses, plans) | W-3 | 1 hr |

### Fase 4 — Colores & Design System (3-4 horas)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 4.1 | Extraer colores semánticos (success/warning/error/info) como CSS variables | W-1, W-4 | 1 hr |
| 4.2 | Refactorizar colores hardcodeados en web feature components (34 archivos, 204 instancias) | W-1 | 2 hrs |
| 4.3 | Refactorizar colores hardcodeados en mobile compras.tsx (~40 instancias) | M-1 | 1 hr |
| 4.4 | Refactorizar colores hardcodeados en mobile cocina.tsx | M-2 | 30 min |
| 4.5 | Sincronizar dark mode colors web ↔ mobile (HSL → hex exactos) | P-2 | 30 min |

### Fase 5 — Shared Packages Polish (1-2 horas)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 5.1 | Completar query keys faltantes en contracts | P-1 | 30 min |
| 5.2 | Agregar `requestTimeoutMs` al API client con AbortController | P-3 | 45 min |
| 5.3 | Mover `POLL_INTERVAL_MS` a constante compartida en contracts | A-6 | 10 min |
| 5.4 | Documentar orden de evaluación en `inferExpenseSubcategory` | P-4 | 5 min |
| 5.5 | Tipar `unitInfo` correctamente en shopping-plan contract | P-6 | 15 min |

### Fase 6 — AI Layer Hardening (1-2 horas)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 6.1 | Atomizar stale job cleanup con `$transaction` | A-4 | 20 min |
| 6.2 | Clasificar errores LLM (network/timeout/quota/schema) en vez de return null genérico | A-7 | 45 min |
| 6.3 | Validar API keys al inicializar providers (fail fast) | A-8 | 15 min |
| 6.4 | Wrap `onAuthFailure` en try/catch en API client | P-5 | 10 min |

### Fase 7 — Chores & Polish (1-2 horas)

| # | Tarea | Origen | Esfuerzo |
|---|-------|--------|----------|
| 7.1 | Agregar `CRON_SECRET` a `.env.example` | I-4 | 1 min |
| 7.2 | Agregar campo `success` a response de `/api/cron/scan-gmail` | I-5 | 5 min |
| 7.3 | Usar `apiFetch` en `preferences-manager.tsx` (en vez de fetch directo) | B-7 | 5 min |
| 7.4 | Agregar `export const maxDuration` a tab bar accent como token del theme | M-3 | 5 min |
| 7.5 | Estandarizar error handling en hooks web (toast vs silent) | W-6 | 30 min |

---

## Resumen Ejecutivo

| Categoría | Issues Críticos | Issues Altos | Issues Medios | Issues Bajos | Total |
|-----------|:-:|:-:|:-:|:-:|:-:|
| Infraestructura | 2 | 0 | 1 | 3 | 6 |
| Backend | 1 | 1 | 2 | 3 | 7 |
| AI/LLM | 0 | 2 | 4 | 2 | 8 |
| Frontend Web | 0 | 2 | 3 | 1 | 6 |
| Mobile | 0 | 2 | 2 | 2 | 6 |
| Shared Packages | 0 | 0 | 3 | 3 | 6 |
| **TOTAL** | **3** | **7** | **15** | **14** | **39** |

### Esfuerzo estimado total: ~15-20 horas de trabajo

### Prioridad de ejecución:
1. **Fase 0** (inmediato) — 3 fixes que previenen failures en producción
2. **Fase 1** (urgente) — Error handling consistente y robusto
3. **Fase 2** (importante) — Performance de queries con indexes faltantes
4. **Fase 3** (UX) — Loading y error states para mejor experiencia
5. **Fase 4** (deuda técnica mayor) — Colores del design system
6. **Fase 5-7** (mejora continua) — Robustez y polish
