# Habita - Arquitectura de Alto Nivel

Esta aplicación es un gestor de tareas del hogar para familias. Consiste en un frontend Next.js y un backend (BFF - Backend for Frontend) también en Next.js, desplegado en Vercel con PostgreSQL como base de datos.

## Stack Tecnológico

- **Framework**: Next.js 14+ (App Router)
- **Hosting**: Vercel
- **Base de Datos**: PostgreSQL (Vercel Postgres o Neon)
- **ORM**: Prisma
- **Autenticación**: NextAuth.js con Google OAuth
- **Estilos**: Tailwind CSS + shadcn/ui
- **Validación**: Zod
- **Estado Cliente**: React Query (TanStack Query)
- **Emails**: Resend (confirmación de cuenta)

---

## Estructura del Proyecto

```
habita/
├── .ai/                    # Sistema de AI engineering (skills, rules, agents)
├── prisma/
│   ├── schema.prisma       # Esquema de base de datos
│   ├── migrations/         # Migraciones de Prisma
│   └── seed.ts             # Datos iniciales (TaskCatalog)
├── src/
│   ├── app/                # App Router de Next.js
│   │   ├── api/            # API Routes (BFF)
│   │   ├── (auth)/         # Rutas de autenticación
│   │   └── (app)/          # Rutas de la aplicación (protegidas)
│   ├── components/         # Componentes React
│   │   ├── ui/             # Componentes base (shadcn/ui)
│   │   ├── forms/          # Formularios
│   │   ├── layouts/        # Layouts
│   │   └── features/       # Componentes de features
│   ├── lib/                # Utilidades y configuraciones
│   ├── hooks/              # Custom hooks
│   ├── types/              # Tipos TypeScript
│   └── styles/             # Estilos globales
├── CLAUDE.md               # Este archivo
└── PRD.md                  # Requerimientos del producto
```

---

# REGLAS DE CÓDIGO (del sistema .ai/rules)

## Naming Conventions

### DO ✅
- `camelCase` para variables y funciones
- Verbos para funciones: `getUser`, `calculateTotal`, `validateInput`
- Sustantivos para variables: `user`, `totalAmount`, `validationResult`
- Ser específico: `userEmailAddress` no `email`, `taskCompletionDate` no `date`
- Palabras completas: `household` no `hh`, `member` no `mem`
- Booleanos con prefijo `is`, `has`, `can`, `should`: `isCompleted`, `hasMembers`
- Archivos en `kebab-case`: `task-list.tsx`, `user-service.ts`

### DON'T ❌
- Nombres de una letra (excepto `i`, `j` en loops cortos)
- Abreviaciones no universales
- Nombres genéricos: `data`, `info`, `temp`, `result`, `item`
- Notación húngara: `strName`, `arrItems`

## Function Design

### DO ✅
- Funciones menores a 20 líneas (idealmente 10)
- UNA cosa por función
- Máximo 3 parámetros (usar objetos para más)
- Return early para casos de error/edge
- Preferir funciones puras

### DON'T ❌
- Funciones mayores a altura de pantalla
- Boolean parameters (usar options object)
- Nested callbacks más de 2 niveles

## Error Handling

### DO ✅
- Fail fast: detectar errores temprano
- Ser explícito: no swallow errors silenciosamente
- Proveer contexto: qué operación falló y por qué
- Log para debugging, display para usuarios
- Siempre manejar promise rejections
- Usar try-catch con async/await

### DON'T ❌
- Empty catch blocks
- `catch (e) { return null }` sin logging
- Throwing strings en lugar de Error objects
- Ignorar promise rejections

## Anti-Patterns a Evitar

1. **Magic Numbers & Strings** → Usar constantes con nombres descriptivos
2. **Nested Ternaries** → Usar objetos de mapeo o switch
3. **Mutating Function Arguments** → Retornar nuevos objetos
4. **Using Index as React Key** → Usar IDs únicos
5. **God Objects/Functions** → Separar responsabilidades
6. **Copy-Paste Code** → Extraer a funciones/utils
7. **Stringly Typed Code** → Usar union types/enums
8. **Boolean Blindness** → Usar options objects con nombres claros

## Comments & Documentation

### DO ✅
- Comentar el **WHY**, no el **WHAT**
- Documentar reglas de negocio no obvias
- Documentar workarounds con referencia a ticket
- JSDoc para funciones públicas exportadas
- TODO/FIXME con contexto y ticket

### DON'T ❌
- Comentar lo obvio
- Código comentado (usar git)
- Change logs en archivos

---

# REGLAS TYPESCRIPT

## Strict Mode

Este proyecto usa:
- `noUncheckedIndexedAccess: true` - Array access retorna `T | undefined`
- `verbatimModuleSyntax: true` - Usar `import type` para type-only imports
- `strictNullChecks: true` - null/undefined son tipos distintos

### Patterns
```typescript
// Truthy check para array access
if (tasks[0]) {
  return tasks[0].title; // Narrowed to Task
}

// Non-null assertion cuando es seguro
const inserted = await db.insert(tasks).values({...}).returning();
return inserted[0]!; // Sabemos que insert retorna la row

// import type para tipos
import type { Task, Member } from './types';
```

## Types

### DO ✅
- Explicit return types en funciones exportadas
- `unknown` en lugar de `any` cuando el tipo es desconocido
- `interface` para object shapes (extendable)
- `type` para unions, intersections, primitives
- Discriminated unions para type-safe variants
- `as const` para literal types

### DON'T ❌
- `any` type
- Type assertions sin validación (`as Type`)
- Non-null assertions (`!`) sin certeza
- `@ts-ignore` sin explicación

## Import Organization

Orden de imports (con líneas en blanco entre grupos):
1. External packages (node_modules)
2. Internal aliases (@/)
3. Relative imports (./)
4. Type imports (import type)

---

# REGLAS REACT

## Components

### DO ✅
- Un componente por archivo
- Props interface definida arriba del componente
- Hooks al inicio del componente
- Early returns para loading/error states
- Componentes menores a 100 líneas (máx 200)

### DON'T ❌
- Componentes >300 líneas
- Business logic en componentes (poner en hooks/utils)
- Inline functions en JSX (extraer a const)
- Deep nested JSX (extraer componentes)

## State Management

### Server State (React Query)
- Todos los datos del servidor van por React Query
- Usar `queryKey` para cache identity
- Invalidate queries después de mutations
- Optimistic updates para mejor UX

### UI State (useState/useReducer)
- Modal open/closed
- Form inputs
- Expanded/collapsed
- Selected items
- Local filters

### Decision Tree
```
¿Viene del servidor?
├── SÍ → React Query
└── NO → ¿Lo usan múltiples componentes?
    ├── SÍ → Lift to common ancestor o context
    └── NO → Local useState

¿Se puede computar de otro state?
├── SÍ → No guardarlo, computarlo (useMemo si es caro)
└── NO → Guardarlo
```

## useEffect

### Casos válidos
- Fetch data (preferir React Query)
- Subscriptions/event listeners
- Cambios manuales al DOM
- Logging/analytics
- Conectar a sistemas externos

### DON'T ❌
- Transformar/filtrar data (computarlo directamente)
- Reset state cuando props cambian (usar key)
- Chain effects (A → B → C)

## Memoization (useMemo, useCallback, memo)

Solo usar cuando hay un problema medido:
- `useMemo`: cálculos caros (>1ms), referential equality para context values
- `useCallback`: callbacks pasados a hijos memoizados
- `memo()`: componentes que re-renderizan frecuentemente con mismos props

---

# REGLAS DATABASE

**Referencia obligatoria para Prisma:** [Prisma LLM Docs](https://www.prisma.io/docs/llms.txt)

## Schema Design

### DO ✅
- Toda tabla tiene `id` primary key (auto-increment)
- Include `createdAt` timestamp
- Considerar `updatedAt` para data mutable
- Usar foreign keys para relaciones
- Table names: plural, snake_case (`household_members`)
- Column names: snake_case (`created_at`)
- Foreign keys: `{referenced_table}Id` (`householdId`)
- Boolean columns: prefijo `is_` (`isActive`)

## Queries

### DO ✅
- Siempre filtrar por owner/householdId para user data
- Select solo columnas necesarias para tablas grandes
- Usar pagination para listas unbounded
- Usar transactions para operaciones multi-step
- Añadir indexes para columnas frecuentemente consultadas

### DON'T ❌
- Query sin owner filter en user tables
- Select * en tablas grandes
- Queries unbounded (sin limit)
- N+1 query patterns (usar joins)

## Migraciones (Prisma Migrate)

Las migraciones se guardan en `prisma/migrations/` y se aplican **manualmente antes de cada deploy**, no durante el build de Vercel.

### Por qué no corren en el build

La DB de producción es Neon Serverless (plan hobby). Neon suspende el compute cuando está inactivo. `prisma migrate deploy` necesita advisory locks (`pg_advisory_lock`) que timeoutean durante el cold start de Neon. Por eso las migraciones se aplican manualmente antes del deploy.

### Conexiones de base de datos

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")          // Pooled — runtime queries
  directUrl = env("DATABASE_URL_UNPOOLED") // Direct — migraciones
}
```

| Variable | Uso | Hostname Neon |
|----------|-----|---------------|
| `DATABASE_URL` | Prisma Client (runtime) | `...-pooler.c-4.us-east-1.aws.neon.tech` |
| `DATABASE_URL_UNPOOLED` | `prisma migrate deploy` | `...c-4.us-east-1.aws.neon.tech` (sin `-pooler`) |

Ambas **deben existir** en Vercel Environment Variables y en `.env` local.

### Scripts disponibles

| Script | Comando | Uso |
|--------|---------|-----|
| `db:up` | `docker compose up -d` | Levantar PostgreSQL local |
| `db:push` | `prisma db push` | Aplicar schema sin migración (solo dev local) |
| `db:migrate` | `prisma migrate dev` | Crear migración interactiva (dev local) |
| `db:deploy` | `prisma migrate deploy` | Aplicar migraciones pendientes (producción) |
| `db:studio` | `prisma studio` | UI para ver/editar datos |
| `db:seed` | `tsx prisma/seed.ts` | Poblar datos iniciales |

### Build de Vercel

El build command en `package.json` es:
```bash
"build": "prisma generate && next build"
```

**NO incluye `prisma migrate deploy`**. Las migraciones se aplican manualmente antes del deploy (ver procedimiento abajo).

### Procedimiento: agregar un campo o tabla nueva

**Paso 1 — Desarrollo local (iterar rápido)**
```bash
# Editar prisma/schema.prisma con el cambio
# Aplicar directo a la DB local (sin generar migración)
pnpm db:push
# Desarrollar y testear el código que usa el nuevo campo
```

**Paso 2 — Generar migración (antes de commitear)**
```bash
# 1. Crear shadow DB temporal
PGPASSWORD=habita psql -h localhost -p 5434 -U habita -d habita \
  -c "CREATE DATABASE habita_shadow;"

# 2. Generar el SQL de la migración
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  --shadow-database-url "postgresql://habita:habita@localhost:5434/habita_shadow?schema=public"

# 3. Crear directorio y guardar el SQL
#    Formato: YYYYMMDDHHMMSS_descripcion_en_snake_case
mkdir -p prisma/migrations/20260215120000_add_new_field/
# Copiar el output del paso 2 en prisma/migrations/20260215120000_add_new_field/migration.sql

# 4. Registrar la migración como aplicada en la DB local
npx prisma migrate resolve --applied 20260215120000_add_new_field

# 5. Verificar drift cero (DEBE decir "This is an empty migration")
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  --shadow-database-url "postgresql://habita:habita@localhost:5434/habita_shadow?schema=public"

# 6. Limpiar shadow DB
PGPASSWORD=habita psql -h localhost -p 5434 -U habita -d habita \
  -c "DROP DATABASE habita_shadow;"
```

**Paso 3 — Aplicar migración en producción (ANTES del deploy)**
```bash
# Renombrar .env.local para que no sobreescriba las URLs de Neon en .env
mv .env.local .env.local.bak

# Aplicar migraciones pendientes contra Neon
# (asegurarse que DATABASE_URL y DATABASE_URL_UNPOOLED en .env apunten a Neon)
pnpm db:deploy

# Restaurar .env.local
mv .env.local.bak .env.local
```

**Paso 4 — Deploy**
```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "Add migration: add_new_field"
git push origin main
# Vercel ejecuta: prisma generate && next build (sin migraciones)
```

### Reglas críticas

- **NUNCA usar `db:push` en producción** — solo `migrate deploy` (`pnpm db:deploy`)
- **NUNCA borrar o editar migraciones ya aplicadas** en producción
- **Siempre hacer campos nuevos nullable** (`?`) o con `@default()` para evitar breaking changes
- **Siempre verificar drift cero** antes de commitear la migración
- **Siempre aplicar migraciones en prod ANTES de pushear el código** que depende de ellas
- **Migraciones destructivas** (DROP COLUMN, DROP TABLE, cambio de tipo) requieren plan de migración de datos previo

### Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `P1002` timeout en advisory lock | Neon compute está cold | Reintentar — el primer intento despierta el compute, el segundo suele funcionar |
| `P3005` database not empty | DB sin tabla `_prisma_migrations` | Hacer baseline (ver abajo) |
| `P2022` column does not exist | Migración no aplicada en prod | Correr `pnpm db:deploy` contra producción |
| `.env.local` sobreescribe URLs | Prisma carga `.env.local` sobre `.env` | Renombrar `.env.local` temporalmente al correr contra prod |

### Baseline (para DBs creadas con db:push)

Si `prisma migrate deploy` falla con `P3005: The database schema is not empty`, la DB fue creada con `db:push` y no tiene tabla `_prisma_migrations`. Ejecutar contra la DB afectada:

```sql
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
VALUES
    (gen_random_uuid(), 'baseline', '<nombre_migracion_ya_aplicada>', now(), 1);
-- Repetir para cada migración cuyo schema ya existe en la DB
```

---

# REGLAS SEGURIDAD

## Data Isolation (CRÍTICO)

### DO ✅
- SIEMPRE verificar ownership en CADA query
- SIEMPRE verificar ownership en CADA mutation
- Nunca confiar en IDs del cliente solos
- Verificar cadena de relaciones (user → household → task)

```typescript
// Pattern para todas las queries
const member = await getCurrentMember(session);
if (!member) throw new Error('Not a member of any household');

const results = await prisma.task.findMany({
  where: { householdId: member.householdId }
});
```

## Input Validation

### DO ✅
- Type validation (string, number, etc.)
- Range validation (min/max length, value bounds)
- Format validation (email, date patterns)
- Business rule validation
- Usar Zod schemas para params

### DON'T ❌
- Confiar en type assertions
- Aceptar strings unbounded
- Aceptar arrays unbounded
- Mostrar raw user input como HTML

---

# REGLAS TESTING

## Unit Tests

### DO ✅
- Una aserción por test (pueden ser múltiples asserts del mismo concepto)
- Nombres descriptivos que explican el escenario
- Seguir Arrange-Act-Assert (AAA)
- Agrupar tests relacionados con describe
- Mock dependencias externas
- Test edge cases y boundaries

### DON'T ❌
- Testear detalles de implementación
- Tests que dependen unos de otros
- Usar data random sin seeding
- Tests lentos (>100ms)
- Testear código trivial

---

# MODELOS DE DATOS (PRD)

## Tablas Principales (20+)

### Core
- `User` - Usuarios (NextAuth)
- `Household` - Hogares
- `Member` - Miembros de hogares
- `Task` - Tareas definidas
- `Assignment` - Instancias de tareas asignadas

### Gamification
- `MemberLevel` - Niveles y XP
- `Achievement` - Definiciones de logros
- `MemberAchievement` - Logros desbloqueados
- `HouseholdReward` - Recompensas del hogar
- `RewardRedemption` - Canjes de recompensas

### Collaboration
- `TaskTransfer` - Transferencias de tareas
- `MemberAbsence` - Ausencias programadas
- `MemberPreference` - Preferencias de tareas
- `AssignmentFeedback` - Feedback de completado

### Scheduling
- `TaskReminder` - Recordatorios
- `TaskRotation` - Rotaciones automáticas
- `Competition` - Competencias familiares
- `CompetitionScore` - Puntuaciones

### Other
- `Penalty` - Penalidades
- `AIRecommendation` - Recomendaciones IA
- `TaskCatalog` - Catálogo predefinido

## Tipos de Miembro

| Tipo | Capacidad | Descripción |
|------|-----------|-------------|
| ADULT | 100% | Adultos con capacidad completa |
| TEEN | 60% | Adolescentes (13-17 años) |
| CHILD | 30% | Niños (menores de 13) |

## Algoritmo de Asignación

Factores considerados:
1. **Preferencias** (+20 preferidas, -20 no deseadas)
2. **Carga actual** (-5 por cada tarea pendiente)
3. **Recencia** (+1 por día desde última asignación)
4. **Capacidad por tipo** (adult: 1.0, teen: 0.6, child: 0.3)
5. **Edad mínima** (respeta restricciones de tarea)

## Sistema de Puntos

```
puntos_base = peso × frecuencia_multiplicador × 10
bonus_tiempo = +20% si no está atrasada
bonus_racha = +10% si racha >= 3 días
XP = puntos_base + bonuses
100 XP = 1 nivel
```

---

# PROCESO DE DESARROLLO

## Workflow para Features

1. Leer specs en `.ai/specs/`
2. Crear task breakdown en `.ai/context/task-breakdown.md`
3. Implementar task por task
4. Verificar después de cada task: `pnpm typecheck`
5. Build completo al final: `pnpm build`

## Verification Levels

| Level | Comando | Cuándo |
|-------|---------|--------|
| 1 | `pnpm typecheck` | Después de cada task |
| 2 | `pnpm build` | Después de feature completo |
| 3 | `pnpm lint` | Antes de commit |

## Error Recovery

1. Leer mensaje de error completo
2. Identificar root cause
3. Intentar fix (máximo 3 intentos)
4. Si sigue fallando: documentar y pedir ayuda

---

# COMANDOS DE DESARROLLO

```bash
# Instalar dependencias
pnpm install

# Configurar Prisma
pnpm db:generate
pnpm db:migrate

# Desarrollo
pnpm dev

# Build
pnpm build

# Lint
pnpm lint

# Type check
pnpm typecheck

# Base de datos
pnpm db:up        # Levantar PostgreSQL (Docker)
pnpm db:push      # Aplicar schema sin migración (dev/prototipado)
pnpm db:migrate   # Crear/aplicar migraciones (producción)
pnpm db:studio    # Abrir Prisma Studio
pnpm db:seed      # Poblar datos iniciales
```

**Levantar la DB:** Con Docker instalado, `pnpm db:up` inicia Postgres. En `.env` usa `DATABASE_URL="postgresql://habita:habita@localhost:5432/habita?schema=public"`. Luego `pnpm db:push`.

**Migrations vs push:** Usa `db:push` para desarrollo local rápido (sincroniza schema sin historial). Para producción, SIEMPRE crear una migración con el workflow documentado en "REGLAS DATABASE > Migraciones" y aplicar manualmente con `pnpm db:deploy` antes de pushear el código.

---

# VARIABLES DE ENTORNO

```env
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email
RESEND_API_KEY="..."
```

---

# REFERENCIA RÁPIDA

## Consultar para Tareas Específicas

| Tarea | Archivos en .ai/rules/ |
|-------|------------------------|
| Escribir componentes | react/components.md, react/hooks-*.md |
| Escribir tests | testing/unit-tests.md, testing/edge-*.md |
| Trabajo de DB | database/schema-design.md, database/queries.md |
| Performance | performance/*.md, react/hooks-memoization.md |
| Seguridad | security/data-isolation.md, security/input-validation.md |

## Skills Disponibles

| Skill | Propósito |
|-------|-----------|
| code-implementation | Task → Working code |
| verification | Code → Verification report |
| implementation-planning | Feature → Task breakdown |
| review | Code → Review report |
