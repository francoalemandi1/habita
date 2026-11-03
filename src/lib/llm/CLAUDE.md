# LLM Integration Layer

Capa de integración con modelos AI (Gemini, DeepSeek). Todo prompt recibe contexto regional argentino.

## Arquitectura

- **Prompt-as-Code**: La lógica de negocio vive en los strings de prompt, no en validación post-LLM. Cambiar una regla = cambiar el prompt builder.
- **Graceful degradation**: Si AI está deshabilitado (`isAIEnabled()`), todas las funciones retornan `null`. Los callers DEBEN manejar null.
- **Regional injection**: TODA llamada LLM recibe `buildRegionalContext()` (timezone, estación, variante de idioma, clima). No saltear esto.

## Gateway (`@/lib/ai/models.ts`, `@/lib/ai/generate.ts`)

- `getLanguageModel(tier)` (`src/lib/ai/models.ts`) es el ÚNICO punto para elegir modelo. Prioridad DeepSeek > Gemini > `AIUnavailableError`. `tier` es `"fast" | "standard"`; DeepSeek usa `deepseek-chat` para ambos, Gemini usa `gemini-3.5-flash-lite` (fast) / `gemini-3.8-flash` (standard) — verificados 2026-11-03, los modelos Gemini 1 punto 5 ya no existen para esta API key.
- `generateStructured()` (`src/lib/ai/generate.ts`) es el gateway para salidas estructuradas: resuelve el modelo, llama `generateObject` con `AbortSignal.timeout`, loguea una línea `[ai]` por llamada (provider, model, tokens, duración, ok) y relanza el error tras loguearlo. Nuevas integraciones de texto/JSON deben pasar por acá en vez de duplicar `getModel()`.
- **DeepSeek**: texto puro (recetas sin imágenes, sugerencias, extracción masiva)
- **Gemini**: fallback cuando no hay DeepSeek configurado

## AI Planner (`ai-planner.ts`)

### Frecuencias y partición de tareas
- `FREQUENCY_MIN_DAYS` es la fuente de verdad: DAILY=1, WEEKLY=7, BIWEEKLY=14, MONTHLY=30, ONCE=1
- Solo se incluyen tareas donde `minDays <= durationDays` del plan
- DAILY genera exactamente 1 assignment por día del plan (rotando members)
- WEEKLY/BIWEEKLY/ONCE generan 1 assignment total

### Fairness scoring (balanceScore 0-100)
- **Multi-member**: equity basada en pending + completed esta semana + capacity + occupationLevel
- **Solo**: coverage (distribución de tareas a lo largo de la semana)
- NUNCA mezclar la lógica de `buildPlanPrompt()` (multi) con `buildSoloPlanPrompt()` (solo)

### Capacidades por tipo de miembro
- ADULT=100%, TEEN=60%, CHILD=30%
- occupationLevel: BUSY → menos tareas, AVAILABLE → más tareas

### Semana
La semana empieza en **domingo** (`setDate(now.getDate() - now.getDay())`). "Completed this week" = dom-sáb.

### Feedback loop
Ratings recientes (1-5) + comentarios de members se inyectan en el prompt para ajustar distribuciones futuras.

## Regional Context (`regional-context.ts`)

- Timezone: `Intl.DateTimeFormat` con fallback a server time
- Hemisferio: latitud < 0 = sur → invierte nombres de estaciones
- Variante de idioma: 20+ países. AR = "español rioplatense argentino (voseo, lunfardo suave)"
- Clima: `getWeatherForecast(lat, lng)` → temperatura + probabilidad de lluvia con consejos
- Fails gracefully: sin datos de ubicación → `promptBlock` vacío

## Recipe Finder (`recipe-finder.ts`)

- Con imágenes → Gemini (vision). Sin imágenes → DeepSeek
- Input validation: rechaza queries no-alimenticias (`rejected: true`)
- Asume ingredientes básicos (sal, aceite, pimienta) disponibles
- Max 5 recetas, varianza requerida (1 rápida, 1 elaborada, 1 saludable)
- Prohibido en prompts: "delicioso/a", "ideal para", "nutritivo y sabroso"

## Basket Matcher (`core/scoring/basket-matcher.ts`)

- Canasta base de 11 productos empaquetados (leche, aceite, yerba, etc.)
- Matching: keywords AND dentro del grupo, OR entre grupos. Case-insensitive substring
- Precios en formato argentino: "$4.970,00" (puntos=miles, coma=decimal)
- Infraestructura interna, nunca expuesto a UI

## Deals Finder (`deals-finder.ts`)

Pipeline de 5 pasos: web search → regional context → LLM extraction → post-processing → return.
- Búsqueda: Tavily (primario) → Serper (fallback), 2 queries por búsqueda
- Filtros post-LLM: año viejo → rechazar, mayorista → rechazar, precio invertido → swap
- Clasificación: solo productos del hogar (comida, limpieza, higiene, mascotas, farmacia básica)
- Diversificación: max 2 deals por categoría en búsquedas amplias

## Anti-patterns

- NO llamar a LLM sin `buildRegionalContext()` — el output pierde grounding regional
- NO agregar frecuencias nuevas sin actualizar `FREQUENCY_MIN_DAYS` Y el prompt
- NO mezclar lógica solo/multi-member en planificación
- NO confiar en names para matching — usar member IDs (el prompt incluye `[ID: ...]`)
