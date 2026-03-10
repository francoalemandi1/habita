---
paths:
  - "src/app/api/**/*.ts"
---

# Reglas para API routes

- SIEMPRE empezar con `requireMember()` (o `requirePermission()` si muta datos)
- SIEMPRE filtrar por `householdId` del member. NUNCA confiar en householdId del cliente
- SIEMPRE wrappear en try/catch con `handleApiError(error, { route, method })` en el catch
- Si recibe body: validar con `schema.safeParse(body)` y retornar 400 si falla
- Serializar `Decimal` → `.toNumber()` y `Date` → `.toISOString()` antes de retornar JSON
- Si es ruta de cron: validar `CRON_SECRET` via Bearer token (no usar requireMember)
- Queries independientes → `Promise.all()` para paralelizar
- Queries en loop → batch con `{ in: [...] }` + agrupar en memoria
- findMany sin filtro acotado → agregar `take` para limitar resultados
- Errores custom: `BadRequestError`, `NotFoundError`, `ConflictError`, `ForbiddenError` (de `@/lib/errors`)
