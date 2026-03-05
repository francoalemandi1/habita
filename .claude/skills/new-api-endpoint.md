# Skill: Nuevo endpoint API

## Cuándo usar
Cuando se necesita crear un nuevo endpoint en `src/app/api/`.

## Pasos

### 1. Contract (si el endpoint recibe/devuelve datos tipados)
Crear o extender schema en `packages/contracts/src/<feature>.ts`:
```typescript
// Input
export const createXInputSchema = z.object({ ... });
export type CreateXInput = z.infer<typeof createXInputSchema>;

// Response
export const xResponseSchema = z.object({ ... });
export type XResponse = z.infer<typeof xResponseSchema>;
```
Exportar desde `packages/contracts/src/index.ts`.

### 2. Route file
Crear `src/app/api/<feature>/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const member = await requireMember();
    const householdId = member.householdId;

    const data = await prisma.model.findMany({
      where: { householdId },
    });

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error, { route: "/api/<feature>", method: "GET" });
  }
}
```

### 3. Checklist
- [ ] `requireMember()` o `requireAuth()` al inicio
- [ ] Filtrar SIEMPRE por `householdId`
- [ ] `handleApiError(error, context)` en el catch
- [ ] Si muta datos: verificar `requirePermission()` si aplica
- [ ] Si recibe body: validar con Zod schema del contract
- [ ] Serializar `Decimal` con `.toNumber()` y `Date` con `.toISOString()`
- [ ] Si es ruta de cron: proteger con `CRON_SECRET`
- [ ] `pnpm typecheck` al finalizar

### 4. Si hay ruta dinámica
Crear `src/app/api/<feature>/[id]/route.ts` para GET/PATCH/DELETE individual.
Verificar que el recurso pertenece al `householdId` del member.

### 5. Errores custom
Usar las clases de `src/lib/errors.ts`:
- `BadRequestError("mensaje")` → 400
- `NotFoundError("mensaje")` → 404
- `ConflictError("mensaje")` → 409
- `ForbiddenError("mensaje")` → 403
