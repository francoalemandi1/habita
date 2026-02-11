# Plan: Integrar Tavily Web Search como segunda fuente de retrieval

## Contexto

Overpass/OSM provee **lugares físicos reales** (restaurantes, parques, museos), pero no tiene **eventos temporales** (festival el sábado, obra de teatro esta semana, feria gastronómica). Para cubrir ese gap, se integra Tavily Search API como segunda fuente de datos en el paso de retrieval. El LLM sigue siendo un clasificador puro — ahora recibe candidatos de dos fuentes en vez de una.

**Patrón: RAG con dos fuentes**
```
1. Overpass API → lugares físicos reales (existente)
2. Tavily Search → eventos, novedades, tendencias (NUEVO)
3. Merge + dedup → lista unificada de candidatos
4. LLM → clasifica y selecciona de la lista unificada
```

**Decisiones del usuario:**
- API: Tavily (free tier 1000 credits/mes, diseñado para RAG)
- Scope: Las 3 secciones (culture, restaurants, weekend)

---

## Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `src/lib/tavily.ts` | **Crear** — Cliente Tavily con cache, tipos, búsqueda por sección |
| `src/lib/llm/relax-finder.ts` | **Modificar** — Consumir resultados de Tavily, merge con Overpass, ajustar candidateBlock |
| `.env.example` | **Modificar** — Agregar `TAVILY_API_KEY` |

**Sin cambios en:** `overpass.ts`, `relax-client.tsx`, `route.ts`, schema Prisma, tipos exportados (`RelaxEvent`, `RelaxResult`)

---

## Paso 1: Crear `src/lib/tavily.ts`

### Tipos

```typescript
/** Resultado normalizado de Tavily para el pipeline de relax */
export interface WebSearchResult {
  title: string;
  snippet: string;       // content de Tavily (1-2 oraciones)
  url: string;           // link original
  source: string;        // dominio (ej: "eventbrite.com")
}
```

### Queries por sección

```typescript
const SECTION_QUERIES: Record<RelaxSection, (city: string) => string> = {
  culture: (city) => `eventos culturales esta semana ${city}`,
  restaurants: (city) => `mejores restaurantes y bares ${city}`,
  weekend: (city) => `actividades fin de semana ${city}`,
};
```

### Cache in-memory (patrón weather.ts/overpass.ts)

```typescript
const tavilyCache = new Map<string, TavilyCacheEntry>();
const TAVILY_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas (más corto que Overpass porque eventos cambian más)
```

Cache key: `${section}:${city.toLowerCase()}`

### Función principal

```typescript
export async function searchLocalEvents(
  city: string,
  country: string,
  section: RelaxSection
): Promise<WebSearchResult[]>
```

1. Si no hay `TAVILY_API_KEY`, retorna `[]` (graceful, no bloquea)
2. Check cache
3. Usa `@tavily/core` SDK: `tavily({ apiKey }).search(query, { country, maxResults: 10, topic: "general", searchDepth: "basic" })`
4. Timeout de 8 segundos con AbortController
5. Normaliza `results[]` a `WebSearchResult[]`
6. Guarda en cache
7. Retorna (array vacío si falla, nunca throw)

**Costo: 1 credit por búsqueda basic. Con cache de 2h y 3 secciones = ~36 credits/día máximo.**

---

## Paso 2: Modificar `src/lib/llm/relax-finder.ts`

### Cambios mínimos, máximo impacto

**2a. Importar y llamar Tavily en `generateRelaxSuggestions()`**

Después de `fetchRawPlacesAround()`, agregar:
```typescript
const webResults = await searchLocalEvents(options.city, options.country, options.section);
```

Ambas llamadas se pueden hacer en paralelo con `Promise.all`:
```typescript
const [rawPlaces, webResults] = await Promise.all([
  fetchRawPlacesAround(options.latitude, options.longitude),
  searchLocalEvents(options.city, options.country, options.section),
]);
```

**2b. Nuevo builder para bloque de web results**

```typescript
function buildWebResultsBlock(results: WebSearchResult[]): string | null {
  if (results.length === 0) return null;
  const lines = results.map((r, i) =>
    `- ${r.title}: ${r.snippet} (fuente: ${r.source})`
  );
  return `## Eventos y novedades recientes (fuente: búsqueda web)\n${lines.join("\n")}`;
}
```

**Nota clave:** Los web results NO llevan índice numérico. No forman parte del `candidateIndex` system. Son **contexto adicional** para que el LLM enriquezca sus descripciones y `dateInfo` de los lugares de Overpass.

**2c. Inyectar bloque web en el prompt**

En `buildPrompt()`, agregar el `webResultsBlock` entre el `candidateBlock` y las `ANTI_HALLUCINATION_RULES`:

```typescript
function buildPrompt(
  options: RelaxFinderOptions,
  regionalBlock: string,
  localHour: number,
  candidateBlock: string,
  webResultsBlock: string | null  // ← NUEVO parámetro
): string {
  // ...existing code...
  return [
    sectionIntros[section],
    "",
    regionalBlock,
    mealContext,
    candidateBlock,
    webResultsBlock ? `\n${webResultsBlock}` : "",  // ← NUEVO
    "",
    ANTI_HALLUCINATION_RULES,
    // ... rest
  ].join("\n");
}
```

**2d. Actualizar instrucciones del prompt**

Agregar una instrucción nueva al bloque `instructions`:
```
11. Si hay información de "Eventos y novedades recientes", usala para enriquecer las descripciones y dateInfo de los lugares seleccionados. NO la uses para inventar lugares nuevos.
```

**Arquitectura preservada:** El `candidateIndex` sigue referenciando SOLO a `rawPlaces[]`. Los web results son contexto libre que el LLM usa para mejorar descripciones pero NO para inventar lugares. Las anti-hallucination rules siguen intactas.

---

## Paso 3: Agregar env var

En `.env.example`, agregar:
```
TAVILY_API_KEY=
```

---

## Resumen de la arquitectura resultante

```
                    ┌─────────────┐
                    │  Overpass    │ → RawPlace[] (indexados, grounded)
                    └──────┬──────┘
                           │
 generateRelaxSuggestions  │  Promise.all
                           │
                    ┌──────┴──────┐
                    │   Tavily    │ → WebSearchResult[] (contexto libre)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Prompt    │ candidateBlock [0]...[N] + webResultsBlock
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    LLM      │ → candidateIndex (SOLO de Overpass)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ postProcess │ → RelaxEvent[] (datos reales)
                    └─────────────┘
```

**Invariantes preservados:**
- LLM NUNCA inventa lugares (candidateIndex sigue apuntando a Overpass)
- `title`, `venue`, `url`, `distanceKm` siempre vienen de datos reales
- Si Tavily falla o no hay API key, el sistema funciona igual que antes (graceful degradation)
- `RelaxEvent` y `RelaxResult` no cambian — no hay cambios en el cliente

---

## Orden de ejecución

| # | Tarea | Verificación |
|---|-------|-------------|
| 1 | `pnpm add @tavily/core` | Package instalado |
| 2 | Crear `src/lib/tavily.ts` | `pnpm typecheck` |
| 3 | Modificar `src/lib/llm/relax-finder.ts` | `pnpm typecheck` |
| 4 | Agregar `TAVILY_API_KEY=` a `.env.example` | Visual |
| 5 | Build completo | `pnpm build` |

---

## Verificación end-to-end

1. `pnpm typecheck` — sin errores
2. `pnpm build` — build exitoso
3. Sin `TAVILY_API_KEY` → funciona igual que antes (solo Overpass)
4. Con `TAVILY_API_KEY` → Culture muestra descripciones enriquecidas con eventos reales
