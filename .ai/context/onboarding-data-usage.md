# Uso de datos recopilados en el onboarding

Resumen de qué se recopila en el onboarding, dónde se persiste y dónde se usa en la aplicación.

## Datos enviados a `POST /api/households/onboarding`

| Dato (onboarding) | Persistencia | Uso en la app |
|-------------------|--------------|----------------|
| **householdName** | `Household.name` | Dashboard (título), Perfil (Mi Hogar), Layout (switcher), InviteShareBlock, emails (bienvenida), cron (weekly-plan, weekly-insights), join flow. |
| **memberName** | `Member.name` | Dashboard, Perfil, Kids (“¡Hola, {name}!”), Leaderboard, competencias, transferencias, verificaciones, briefing, IA (assistant, chat, apply-plan, recommendations), algoritmo de asignación. |
| **memberType** | `Member.memberType` | Algoritmo de asignación (capacidad), control parental (solo ADULT), Kids/Teen vs Child. |
| **tasks** (name, frequency, weight, estimatedMinutes) | `Task` (por hogar) | Asignaciones, planes, rotaciones, preferencias, catálogo interno. Nota: `category` se envía pero no se guarda en el modelo `Task`. |
| **location** (latitude, longitude, timezone, country, city) | `Household` (campos opcionales) | Perfil (ubicación), `lib/llm/regional-context.ts` (IA), cron weekly-insights (timezone), weekly-plan (timezone para fechas). |

## Datos solo en frontend (no enviados al API)

| Dato | Uso |
|------|-----|
| **hasChildren** | Paso “Tu hogar”: checkbox. Determina si se muestra la sección **Niños** en “Selección de tareas” y si se envían tareas de esa categoría. Resumen pre-creación. |
| **hasPets** | Paso “Tu hogar”: checkbox. Determina si se muestra la sección **Mascotas** en “Selección de tareas” y si se envían tareas de esa categoría. Resumen pre-creación. |

## Comportamiento actual

- **Mascotas** y **Niños** en “Selección de tareas” solo se muestran si en el paso anterior el usuario marcó “Con niños” y/o “Con mascotas”.
- El payload de creación del hogar filtra categorías: no se envían tareas de Mascotas si `!hasPets` ni de Niños si `!hasChildren`.
- El resto de datos recopilados (nombre del hogar, nombre del miembro, tipo de miembro, tareas, ubicación) se persisten y se usan en los flujos indicados arriba.
