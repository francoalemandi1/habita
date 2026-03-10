# Skill: Cron Job

## Cuándo usar
Cuando se necesita crear un nuevo job programado que corre periódicamente en Vercel Cron.

## Crons existentes (`vercel.json`)

| Ruta | Schedule | Qué hace |
|------|----------|----------|
| `/api/cron/process` | `0 7 * * *` (diario 7am UTC) | Ausencias, limpieza notificaciones, billing servicios, expiración eventos, limpieza auth mobile, notificaciones proactivas |
| `/api/cron/weekly-plan` | `0 7 * * 1` (lunes 7am UTC) | Generar distribución semanal de tareas |
| `/api/rotations/process` | `0 7 * * *` (diario 7am UTC) | Procesar rotaciones vencidas |
| `/api/cron/events/ingest` | `0 7 * * *` (diario 7am UTC) | Descubrir eventos culturales por ciudad |
| `/api/cron/grocery-deals` | `0 7 * * *` (diario 7am UTC) | Pre-generar ofertas de supermercados |

## Pasos

### 1. Crear route file

`src/app/api/cron/<nombre>/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Si la operación tarda: aumentar timeout (default 10s, max 300s en Vercel Pro)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // 1. Validar CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 503 },
      );
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Lógica del cron
    const result = await processMyJob();

    // 3. Retornar métricas
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[mi-cron] Fatal error:", error);
    return NextResponse.json(
      { error: "Error processing cron job" },
      { status: 500 },
    );
  }
}

// GET para status/monitoring
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ready",
    endpoint: "POST /api/cron/<nombre>",
    description: "Descripción de lo que hace",
  });
}
```

### 2. Lógica con error counting (para loops)

Cuando el cron procesa múltiples items, usar el patrón de error counting:
```typescript
async function processMyJob() {
  const items = await prisma.model.findMany({
    where: { /* filtrar por lo relevante */ },
  });

  let processed = 0;
  let errors = 0;

  for (const item of items) {
    try {
      await processItem(item);
      processed++;
    } catch (error) {
      console.error(`[mi-cron] Error processing ${item.id}:`, error);
      errors++;
      // NO re-throw: continuar con el siguiente item
    }
  }

  return { processed, errors, total: items.length };
}
```

### 3. Registrar en vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/<nombre>",
      "schedule": "0 7 * * *"
    }
  ]
}
```

Formatos comunes de schedule:
- `0 7 * * *` — diario a las 7am UTC
- `0 7 * * 1` — lunes a las 7am UTC
- `0 */6 * * *` — cada 6 horas
- `0 0 1 * *` — primer día de cada mes

### 4. Agregar CRON_SECRET en env

Si es la primera vez, verificar que `CRON_SECRET` esté configurado en:
- `.env.local` (desarrollo)
- Vercel dashboard → Settings → Environment Variables (producción)

## Patrones importantes

### Logging con prefijo de contexto
```typescript
console.log(`[mi-cron] Starting: ${items.length} items to process`);
console.error(`[mi-cron] Error for item ${item.id}:`, error);
console.log(`[mi-cron] Done: ${processed}/${total} processed, ${errors} errors`);
```

### Notificaciones fire-and-forget
```typescript
// Si el cron envía notificaciones: nunca bloquear ni propagar errores
try {
  await deliverNotificationToMembers({ memberIds, type: "MI_TIPO", ... });
} catch {
  // Log implícito en deliverNotificationToMembers
}
```

### Operaciones pesadas con `after()`
Para operaciones que se disparan en paralelo (ej: procesar múltiples ciudades):
```typescript
import { after } from "next/server";

// Responder inmediato, procesar en background
after(async () => {
  for (const city of cities) {
    await processCity(city);
  }
});

return NextResponse.json({ success: true, citiesQueued: cities.length });
```

### Timezone-aware scheduling
Si el cron depende del día de la semana del household:
```typescript
const now = new Date();
const matchedHouseholds = allHouseholds.filter((h) => {
  const localDay = getLocalDayOfWeek(now, h.timezone!);
  return localDay === h.planningDay;
});
```

## Checklist

- [ ] CRON_SECRET validation inline (Bearer token)
- [ ] GET handler para status/monitoring
- [ ] Console logging con prefijo `[nombre-cron]`
- [ ] Errors en loops: contar y continuar, NO re-throw
- [ ] Respuesta JSON: `{ success, [métricas], timestamp }`
- [ ] Outer catch: log + responder 500 genérico
- [ ] Si envía notificaciones: fire-and-forget
- [ ] `maxDuration` si la operación puede tardar > 10s
- [ ] Registrar en `vercel.json` crons
- [ ] Data isolation: filtrar por `householdId` donde aplique
- [ ] `pnpm typecheck` al finalizar

## Anti-patrones

- **NO** crear helper compartido para CRON_SECRET (cada endpoint es independiente)
- **NO** propagar errores de items individuales (el cron debe continuar)
- **NO** olvidar el timestamp en la respuesta (útil para debugging)
- **NO** usar FlatList-style pagination en crons (procesar todo o usar cursores)
