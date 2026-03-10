# Skill: AI Background Job con polling

## Cuándo usar
Cuando se agrega una nueva operación AI asíncrona que tarda más de unos segundos (LLM calls, scraping, procesamiento pesado).

## Arquitectura

```
Cliente POST → API valida + markJobRunning() → after() ejecuta trabajo
          ↓                                          ↓
     Recibe jobId                            completeJob(SUCCESS/FAILED)
          ↓
     useAiJobStatus() polls cada 3s
          ↓
     onComplete → fetch /api/ai/job-result/{jobId}
```

## Pasos

### 1. Agregar job type al enum (si es nuevo)

`prisma/schema.prisma`:
```prisma
enum AiJobType {
  PREVIEW_PLAN
  COCINA
  SHOPPING_PLAN
  MI_NUEVO_TIPO     // ← agregar acá
}
```

Correr migración (ver skill `prisma-migration.md`).

Agregar también en `packages/contracts/src/ai-jobs.ts`:
```typescript
export const AI_JOB_TYPES = ["PREVIEW_PLAN", "COCINA", "SHOPPING_PLAN", "MI_NUEVO_TIPO"] as const;
```

### 2. API route (fire-and-forget)

`src/app/api/ai/<feature>/route.ts`:
```typescript
import { NextResponse, type NextRequest, after } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { markJobRunning, completeJob, findRunningJob, findRecentSuccessfulJob } from "@/lib/ai-jobs";
import type { AiJobTriggerResponse } from "@habita/contracts";

export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = await request.json();

    // Validar input con Zod
    const validation = myInputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Input inválido" }, { status: 400 });
    }

    // (Opcional) Verificar caché de resultado reciente
    const cached = await findRecentSuccessfulJob(
      member.householdId,
      "MI_NUEVO_TIPO",
      { key: validation.data.key },  // JSONB @> containment match
      12 * 60 * 60 * 1000,           // 12 horas TTL
    );
    if (cached) {
      return NextResponse.json({
        started: false,
        alreadyRunning: false,
        jobId: cached.id,
      } satisfies AiJobTriggerResponse);
    }

    // Prevenir ejecuciones duplicadas
    const existing = await findRunningJob(member.householdId, "MI_NUEVO_TIPO");
    if (existing) {
      return NextResponse.json({
        started: false,
        alreadyRunning: true,
        jobId: existing.id,
      } satisfies AiJobTriggerResponse);
    }

    // Crear job RUNNING
    const jobId = await markJobRunning(
      member.householdId,
      member.id,
      "MI_NUEVO_TIPO",
      validation.data,
    );

    // Fire-and-forget: after() ejecuta después de enviar response
    after(async () => {
      const startTime = Date.now();
      try {
        const result = await ejecutarOperacionPesada(validation.data);

        await completeJob(jobId, {
          status: "SUCCESS",
          resultData: result,
          durationMs: Date.now() - startTime,
        });
      } catch (error) {
        console.error("[mi-feature] Error:", error);
        await completeJob(jobId, {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Error desconocido",
          durationMs: Date.now() - startTime,
        });
      }
    });

    return NextResponse.json({
      started: true,
      alreadyRunning: false,
      jobId,
    } satisfies AiJobTriggerResponse);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/<feature>", method: "POST" });
  }
}
```

### 3. Registrar en status endpoint

`src/app/api/ai/job-status/route.ts` — agregar `"MI_NUEVO_TIPO"` al set de tipos válidos:
```typescript
const VALID_TYPES = new Set<AiJobType>(["PREVIEW_PLAN", "COCINA", "SHOPPING_PLAN", "MI_NUEVO_TIPO"]);
```

### 4. Hook de datos (web)

`src/hooks/use-<feature>.ts`:
```typescript
"use client";
import { useCallback, useState } from "react";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";
import { apiFetch } from "@/lib/api-client";

export function useMyFeature() {
  const [data, setData] = useState<ResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  const { isRunning, refetchStatus } = useAiJobStatus({
    jobType: "MI_NUEVO_TIPO",
    onComplete: async (jobId) => {
      try {
        const result = await apiFetch<{ resultData: ResultType }>(
          `/api/ai/job-result/${jobId}`
        );
        setData(result.resultData);
      } catch {
        setError("Error al obtener resultados");
      }
    },
    onError: (msg) => setError(msg ?? "Error en la operación"),
  });

  const trigger = useCallback(async (input: InputType) => {
    setTriggerLoading(true);
    setError(null);
    try {
      await apiFetch("/api/ai/<feature>", { method: "POST", body: input });
      await refetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setTriggerLoading(false);
    }
  }, [refetchStatus]);

  return { data, isLoading: triggerLoading || isRunning, error, trigger };
}
```

### 5. Hook de datos (mobile)

`apps/mobile/src/hooks/use-<feature>.ts` — mismo patrón, usando `mobileApi` en vez de `apiFetch`.

### 6. AiJobWatcher (mobile, si aplica)

Agregar config en `apps/mobile/src/components/ai-job-watcher.tsx`:
```typescript
const JOB_CONFIGS: JobConfig[] = [
  // ... existentes
  {
    jobType: "MI_NUEVO_TIPO",
    successMessage: "Resultado listo",
    actionLabel: "Ver resultado",
    href: "/(app)/mi-feature",
    errorMessage: "Error en la operación",
  },
];
```

## Funciones disponibles (`src/lib/ai-jobs.ts`)

| Función | Uso |
|---------|-----|
| `markJobRunning(householdId, memberId, jobType, inputData?)` | Crear job RUNNING, retorna `jobId` |
| `completeJob(jobId, { status, resultData?, errorMessage?, durationMs })` | Marcar como SUCCESS o FAILED |
| `findRunningJob(householdId, jobType)` | Verificar si ya hay uno corriendo |
| `findRecentSuccessfulJob(householdId, jobType, inputMatcher, maxAgeMs)` | Buscar en caché (JSONB containment) |
| `getLatestJobStatus(householdId, jobType)` | Último status (ventana de 1 hora) |
| `getJobResult(jobId, householdId)` | Resultado completo (con data isolation) |

## Timeouts y limpieza

- Jobs RUNNING > 5 minutos → automáticamente marcados FAILED (stale detection)
- Status polling solo considera jobs de la última hora
- Polling del cliente: cada 3 segundos mientras `status === "RUNNING"`

## Checklist

- [ ] Enum `AiJobType` actualizado en schema.prisma + contracts
- [ ] API route usa `after()` para fire-and-forget
- [ ] `findRunningJob()` para prevenir duplicados
- [ ] `completeJob()` siempre llamado (SUCCESS y FAILED)
- [ ] `handleApiError` en catch externo
- [ ] Job type registrado en `/api/ai/job-status` VALID_TYPES
- [ ] Hook web con `useAiJobStatus`
- [ ] Hook mobile equivalente
- [ ] Config en AiJobWatcher mobile (si el usuario debe ver progreso global)
- [ ] `pnpm typecheck:all` al finalizar
