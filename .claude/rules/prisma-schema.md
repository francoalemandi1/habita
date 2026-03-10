---
paths:
  - "prisma/schema.prisma"
---

# Reglas para schema Prisma

- Campos nuevos: SIEMPRE nullable (`?`) o con `@default()`. Sin esto la migración falla con datos existentes
- NUNCA commitear cambios a schema.prisma sin crear migración formal primero
- NUNCA correr `db:push` en producción
- Montos monetarios: `Decimal(10, 2)` — serializar con `.toNumber()` en el cliente
- Todo modelo con datos de usuario DEBE tener `householdId` con relación a `Household` y `@@index`
- Enums nuevos: agregar también en `packages/contracts/` si se usan en API responses
- Después de editar: `pnpm db:push` (dev local), luego migración formal (ver skill `prisma-migration.md`)
