# Habita - Copiloto del Hogar

## Overview

**Habita** es un copiloto inteligente para la gestión del hogar familiar. Combina distribución equitativa de tareas, gastos compartidos, planificación con IA y herramientas de bienestar en una sola app. Diseñada para familias de cualquier composición — adultos, adolescentes y niños — con interfaces adaptadas a cada tipo de miembro.

## Core Value Proposition

- **Copiloto con IA**: Planes semanales inteligentes, briefings diarios, recetas por foto, actividades culturales por ubicación
- **Distribución justa**: Asignación de tareas basada en capacidad, preferencias, disponibilidad y carga actual
- **Gastos compartidos**: Splitting estilo Splitwise con categorías, iconografía, auto-categorización y liquidación optimista
- **Familias completas**: Modo niños simplificado, controles parentales, verificación de tareas
- **Notificaciones**: Push web y WhatsApp para mantener al hogar sincronizado

---

# Key Features

## 1. Gestión de Hogares y Miembros

### Creación de Hogar (Onboarding)

Wizard multi-paso:
1. Bienvenida → "Continuar con Google"
2. Nombre y tipo de miembro
3. Nombre del hogar + composición (tiene hijos? mascotas?)
4. Selección de tareas desde catálogo (buscable, por categoría, con custom)
5. Disponibilidad semanal (mañana/tarde/noche, días de semana/fin de semana)
6. Resumen y confirmación
7. Creación con loading animado
8. Código de invitación para compartir

Se captura geolocalización (latitud, longitud, timezone, país, ciudad) para features basados en ubicación.

### Unirse a un Hogar
- Vía link directo (`/join/[code]`) o ingreso manual del código
- Selección de nombre y tipo de miembro
- Código de 8 caracteres alfanuméricos, único por hogar
- **Post-join setup**: Después de unirse, el miembro pasa por un paso de disponibilidad horaria (`/join/[code]/setup`) antes de llegar al dashboard. Este paso es skipeable ("Omitir por ahora") pero asegura que el algoritmo de asignación tenga la info necesaria para distribuir tareas correctamente.

### Tipos de Miembros
| Tipo | Capacidad | Descripción |
|------|-----------|-------------|
| ADULT | 100% | Capacidad completa, acceso a controles parentales |
| TEEN | 60% | Adolescentes (13-17 años) |
| CHILD | 30% | Niños, vista simplificada, tareas requieren verificación |

### Multi-hogar
- Un usuario puede pertenecer a múltiples hogares
- Switcher de hogar en el header

---

## 2. Sistema de Tareas

### Catálogo Predefinido

7 categorías (las de Kids y Mascotas se muestran condicionalmente según composición del hogar):

| Categoría | Tareas ejemplo |
|-----------|----------------|
| Limpieza | Barrer, Trapear, Aspirar, Limpiar baños, Sacar basura |
| Cocina | Preparar comidas, Lavar platos, Ordenar despensa |
| Lavandería | Lavar ropa, Tender, Planchar, Doblar y guardar |
| Habitaciones | Tender camas, Cambiar sábanas, Ordenar habitación |
| Exterior | Regar plantas, Cortar césped, Limpiar patio |
| Mascotas | Alimentar mascota, Pasear perro, Limpiar arenero |
| Otros | Tareas personalizadas del hogar |

### Propiedades de Tarea
- **Nombre** y **descripción**
- **Categoría**: Una de las 7
- **Frecuencia**: DAILY | WEEKLY | BIWEEKLY | MONTHLY | ONCE
- **Peso (dificultad)**: 1-5
- **Tiempo estimado**: En minutos
- **Edad mínima**: Restricción opcional
- **Elegible para ruleta**: Boolean

---

## 3. Sistema de Asignaciones

### Algoritmo de Asignación

Factores considerados:
1. **Preferencias** (+20 preferidas, -20 no deseadas)
2. **Carga actual** (-5 por tarea pendiente)
3. **Recencia** (+1 por día desde última asignación de esa tarea)
4. **Capacidad** (ADULT: 1.0, TEEN: 0.6, CHILD: 0.3)
5. **Edad mínima** (respeta restricciones)
6. **Disponibilidad** (respeta slots configurados)

### Estados de Asignación
| Estado | Descripción |
|--------|-------------|
| PENDING | Pendiente de completar |
| IN_PROGRESS | En progreso |
| COMPLETED | Completada |
| VERIFIED | Verificada por adulto (tareas de niños) |
| OVERDUE | Vencida |
| CANCELLED | Cancelada |

### Mis Tareas (Tab "Tareas")
- Vista dual: lista de cards o calendario semanal (toggle)
- Cards de tareas con colores rotativos, completado rápido
- Transferencias pendientes
- **Empty states diferenciados**: usuario nuevo ve "Empezá a organizar tu hogar" con CTA a crear plan; usuario con historial ve "¡Estás al día!" con stats

---

## 4. Planes Semanales con IA

### Generación de Plan
- IA analiza tareas, preferencias, capacidad y disponibilidad de cada miembro
- Duración configurable (7, 14, 21 días)
- Vista previa con asignaciones y razonamiento por tarea
- Score de equidad (balance entre miembros)

### Estados del Plan
| Estado | Descripción |
|--------|-------------|
| PENDING | Generado, esperando aprobación |
| APPLIED | Aprobado, asignaciones creadas automáticamente |
| COMPLETED | Todas las asignaciones finalizadas |
| EXPIRED | Venció sin completarse |
| REJECTED | Descartado por el usuario |

### Ciclo del Plan
1. Dashboard → "Genera un plan" → IA crea plan
2. Revisar asignaciones y score → Aplicar
3. Completar tareas durante el ciclo
4. Al completar todas → Feedback de fin de ciclo (rating 1-5 + comentario)
5. El feedback mejora planes futuros

### Historial de Planes (`/plans`)
- Lista de planes pasados con status, equidad, detalle por miembro
- Expandibles para ver asignaciones completas
- **Empty state motivador**: "Acá vas a ver tus planes pasados" con descripción de valor

---

## 5. Gastos Compartidos

### Registro de Gastos
- Cualquier miembro puede registrar un gasto
- Campos: título, monto, categoría, quién pagó, notas
- Moneda por defecto: ARS
- **Auto-categorización**: Al escribir el título, la categoría se detecta automáticamente por keywords (~80 keywords argentinos: "supermercado" → GROCERIES, "uber" → TRANSPORT, etc.)

### Categorías con Iconografía
Cada categoría tiene icono y color propios:

| Categoría | Icono | Color |
|-----------|-------|-------|
| GROCERIES | ShoppingCart | Verde |
| UTILITIES | Zap | Amarillo |
| RENT | Home | Azul |
| FOOD | UtensilsCrossed | Naranja |
| TRANSPORT | Car | Sky |
| HEALTH | HeartPulse | Rojo |
| ENTERTAINMENT | Clapperboard | Púrpura |
| EDUCATION | GraduationCap | Índigo |
| HOME | Wrench | Stone |
| OTHER | MoreHorizontal | Gris |

### UI de Categorías
- **Chip visible** en el formulario principal (no oculto en opciones avanzadas)
- **Grid selector**: 2 columnas con icono + color + label al tocar el chip
- **Auto-detect**: Si el título contiene keywords, la categoría se setea automáticamente (respetuoso: no overridea selección manual)

### Tipos de Split
| Tipo | Descripción |
|------|-------------|
| EQUAL | División equitativa entre miembros incluidos |
| CUSTOM | Montos personalizados por miembro |
| PERCENTAGE | Porcentajes por miembro |

- **Exclusión de miembros**: En split EQUAL, se puede excluir miembros específicos (chips con toggle). El pagador siempre permanece incluido.

### Balances y Liquidación
- Balance neto por miembro (positivo = le deben, negativo = debe)
- Algoritmo greedy de simplificación de deudas (minimiza transacciones)
- **Optimistic updates**: Al liquidar, la deuda desaparece inmediatamente de la UI. Si falla el API call, se hace rollback.
- Card de balance en dashboard (verde "Te deben" / rojo "Debés" / neutro "Registrá tu primer gasto")

### Lista de Gastos
- Agrupados por fecha (Hoy, Ayer, fecha formateada)
- Cada gasto muestra icono de categoría con color, título, quién pagó, monto personal
- Tap para editar (categoría, título, monto, notas, eliminar)

### Empty States
- Sin gastos: "Registrá el primer gasto" con descripción de valor y referencia al botón "Nuevo gasto"

---

## 6. Dashboard — Command Center del Hogar

El dashboard funciona como **command center**: en 3 segundos el usuario entiende el estado del hogar y puede actuar.

### Estructura
```
Greeting + fecha
├── PushOptInBanner (condicional, self-dismissing)
├── Invite card (solo si 1 miembro, dismissable)
├── DailyBriefing (resumen IA del hogar)
├── PlanStatusCard (si IA habilitada) + link "Ver planes"
├── PendingTransfers (si hay)
├── FridgeCalendarView (calendario semanal) o empty state con CTA a crear plan
├── Descubrir previews (2 cards: Planes para hoy + Recetas)
├── Balance rápido (siempre visible: verde/rojo/neutro con link a /balance)
└── Ruleta CTA (card con gradiente)
```

### Briefing Diario con IA
- Resumen diario generado automáticamente
- Saludo personalizado según hora del día
- Highlights del hogar (tareas, actividad reciente)
- Sugerencia del día

### Calendario Semanal
- Vista tipo heladera (fridge calendar) de la semana del hogar
- Solo visible cuando hay un plan APPLIED activo
- Muestra asignaciones de todos los miembros por día
- Color-coded por miembro con avatares
- Completar tareas directamente desde el calendario

---

## 7. Descubrir

Sección unificada que combina actividades culturales y recetas, accesible desde la navegación principal.

### Tab: Planes
Tres secciones basadas en la ubicación del hogar:

| Sección | Contenido |
|---------|-----------|
| Cultura | Cine, teatro, música, museos, galerías |
| Restaurantes | Restaurantes, bares, cafeterías |
| Weekend | Actividades para el fin de semana |

- Generado por IA usando geolocalización del hogar + búsqueda web (Tavily/Serper)
- Datos grounded con Overpass/OSM para lugares reales
- Links externos a eventos/lugares

### Tab: Recetas (IA con visión)
- Subir hasta 3 fotos de ingredientes (heladera, alacena)
- IA analiza imágenes y sugiere recetas
- Selección de tipo de comida según hora del día (Desayuno, Almuerzo, Merienda, Cena)
- Cada receta incluye: dificultad, tiempo, porciones, ingredientes, pasos

---

## 8. Ruleta de Tareas

- Selección aleatoria de tarea (solo tareas marcadas como elegibles)
- Selección aleatoria o manual de miembro
- Rueda animada interactiva
- Crea asignación al confirmar resultado
- Accesible desde card en el dashboard

---

## 9. Modo Niños y Controles Parentales

### Vista Niños (`/kids`)
- Interfaz simplificada con gradiente y colores vibrantes
- Saludo personalizado
- Progreso diario (tareas completadas)
- Lista de misiones pendientes con tiempo estimado

### Controles Parentales (`/parental`, solo adultos)
- Resumen de actividad de niños/teens
- Tareas completadas hoy por menores
- Tareas pendientes de menores
- Verificación de tareas completadas (aprobar o rechazar)

---

## 10. Transferencias de Tareas

- Solicitud de transferencia entre miembros
- Mensaje opcional
- Estados: PENDING | ACCEPTED | REJECTED
- Restricción: no se pueden transferir tareas vencidas

---

## 11. Ausencias y Disponibilidad

### Disponibilidad Semanal
- Configuración por slots: mañana (7-12), tarde (12-18), noche (18-22)
- Diferencia entre días de semana y fin de semana
- Notas opcionales (max 300 chars)
- Respetada por el algoritmo de asignación y los planes de IA
- **Se recoge tanto en onboarding (crear hogar) como en post-join setup (unirse por invite)**

### Ausencias
- Fecha inicio y fin
- Razón: travel | illness | work | other
- Política: AUTO (redistribuir) | SPECIFIC (asignar a alguien) | POSTPONE (posponer)

---

## 12. Notificaciones

### Push Web
- Opt-in con banner en el dashboard
- Usa Web Push API con claves VAPID
- Recordatorios de tareas, alertas de transferencias

### WhatsApp
- Vinculación de número con código de verificación (expira en 10 min)
- Número enmascarado en la UI
- Webhook para mensajes entrantes

---

## 13. Preferencias de Tareas

- Cada miembro marca tareas como: PREFERRED | NEUTRAL | DISLIKED
- PREFERRED: +20 al score de asignación
- DISLIKED: -20 al score de asignación
- Accesible desde `/preferences` (junto con disponibilidad y ausencias)

---

## 14. Rotación Automática de Tareas

- Definir orden de miembros para una tarea
- Frecuencia de rotación: WEEKLY | MONTHLY
- Rotación automática procesada por cron job

---

## 15. Asistente IA (Chat)

- Widget de chat integrado en el layout
- Streaming de respuestas en tiempo real
- Contexto: miembros, tareas, asignaciones recientes, estadísticas
- Preguntas sugeridas:
  - "Quién hizo más tareas esta semana?"
  - "Cómo está la equidad del hogar?"
  - "Qué tareas tengo pendientes?"

---

## 16. Empty States

Todos los empty states siguen una fórmula consistente: **icono motivador + título orientado a la acción + descripción de valor + CTA directo**.

| Sección | Título | CTA |
|---------|--------|-----|
| Mis Tareas (nuevo usuario) | "Empezá a organizar tu hogar" | "Crear mi primer plan" → /plan |
| Mis Tareas (todo completado) | "¡Estás al día!" | Stats + "Generar nuevo plan" |
| Gastos (sin gastos) | "Registrá el primer gasto" | Referencia a "Nuevo gasto" |
| Dashboard balance (sin gastos) | "Registrá tu primer gasto compartido" | Link a /balance |
| Dashboard calendario (sin plan) | "Calendario semanal" | "Crear plan" → /plan |
| Planes historial (vacío) | "Acá vas a ver tus planes pasados" | Descripción de valor |
| Tareas config (sin tareas) | "Configurá las tareas del hogar" | Referencia a "Agregar tareas" |

---

# Features en Background (UI oculta)

> El backend trackea estos datos pero la UI fue ocultada durante el pivote a "copiloto del hogar". Los modelos y APIs existen para activación futura.

- **Logros (Achievements)**: Definiciones y desbloqueos por miembro
- **Competencias**: Leaderboards familiares por período
- **Recompensas**: Sistema de canjeo con puntos (con generación por IA)
- **Niveles y XP**: Tracking de experiencia y niveles
- **Penalidades**: Deducciones automáticas por atrasos

---

# Technical Architecture

## Stack

| Componente | Tecnología |
|------------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Hosting | Vercel |
| Base de Datos | PostgreSQL (Neon) |
| ORM | Prisma |
| Autenticación | NextAuth.js + Google OAuth |
| IA | Multi-provider: OpenRouter / Google Gemini / Anthropic Claude |
| Emails | Resend |
| Estilos | Tailwind CSS + shadcn/ui |
| Validación | Zod |
| Estado Cliente | React Query (TanStack Query) |
| Push | Web Push API (VAPID) |
| WhatsApp | WhatsApp Cloud API |
| Search | Serper / Tavily (para Descubrir) |

## Autenticación

1. "Continuar con Google" (OAuth)
2. Creación de cuenta en DB
3. Si no tiene hogar → Onboarding
4. Si tiene hogar → Dashboard

## Proveedores de IA (por prioridad)
1. OpenRouter (`OPENROUTER_API_KEY`)
2. Google Gemini (`GOOGLE_GENERATIVE_AI_API_KEY`)
3. Anthropic Claude (`ANTHROPIC_API_KEY`)
4. Stub (si ninguno configurado — features de IA deshabilitadas)

## Database Schema (25+ tablas)

### Core
- `users` - Usuarios NextAuth
- `households` - Hogares (timezone, geolocalización, inviteCode, planningDay)
- `members` - Miembros (tipo, availability, isActive)
- `tasks` - Definiciones de tareas
- `assignments` - Instancias asignadas

### Expenses
- `expenses` - Gastos (Decimal 10,2, categoría, splitType)
- `expense_splits` - Splits por miembro (monto, settled, settledAt)

### AI & Planning
- `weekly_plans` - Planes semanales (status, balanceScore, assignments JSON)
- `plan_feedbacks` - Feedback de fin de ciclo (rating 1-5, comentario)
- `relax_suggestions` - Sugerencias cacheadas de Descubrir

### Preferences & Collaboration
- `member_preferences` - Preferencias de tarea
- `member_absences` - Ausencias
- `task_transfers` - Transferencias
- `task_rotations` - Rotaciones automáticas
- `task_reminders` - Recordatorios

### Gamification (background)
- `member_levels` - XP y niveles
- `achievements` / `member_achievements` - Logros
- `household_rewards` / `reward_redemptions` - Recompensas
- `competitions` / `competition_scores` - Competencias
- `penalties` - Penalidades

### Notifications
- `notifications` - Notificaciones in-app
- `push_subscriptions` - Suscripciones push
- `whatsapp_links` - Vinculaciones WhatsApp

### Catalog
- `task_catalog` - Catálogo predefinido de tareas

## Navegación

### 5 tabs (mobile bottom bar + desktop top nav)
Hoy | Tareas | Gastos | Descubrir | Perfil

| Tab | Ruta | Icono | Descripción |
|-----|------|-------|-------------|
| Hoy | `/dashboard` | Home | Command center del hogar |
| Tareas | `/my-tasks` | ClipboardCheck | Mis tareas pendientes + calendario |
| Gastos | `/balance` | Scale | Gastos compartidos y balances |
| Descubrir | `/descubrir` | Compass | Planes + Recetas (IA) |
| Perfil | `/profile` | User | Configuración personal |

### Páginas accesibles desde links internos
- `/plans` - Historial de planes (link desde dashboard)
- `/plan` - Generar/ver plan activo
- `/roulette` - Ruleta (card en dashboard)
- `/preferences` - Preferencias, disponibilidad y ausencias (link desde profile)
- `/tasks` - Gestión de tareas del hogar (catálogo)
- `/rotations` - Rotaciones de tareas

---

# User Flows

## 1. Primer Uso (Crear Hogar)

1. Landing → "Continuar con Google"
2. Onboarding: nombre, tipo, hogar, tareas, disponibilidad
3. Dashboard con banner de invitación (si es único miembro)
4. Compartir código para que se unan los demás

## 2. Unirse a un Hogar

1. Recibir link `/join/[code]`
2. Google OAuth (si no autenticado)
3. Nombre del miembro → "Unirme al hogar"
4. Paso de disponibilidad horaria (skipeable)
5. Dashboard

## 3. Día Típico

1. Abrir app → Dashboard (command center)
2. Ver briefing diario con insights de IA
3. Revisar plan activo y calendario semanal
4. Completar tareas desde calendario o tab Tareas
5. Ver balance de gastos si hay deudas pendientes
6. Explorar recetas o actividades culturales en Descubrir

## 4. Ciclo del Plan

1. "Genera un plan" → IA crea plan con asignaciones
2. Revisar → Aplicar → Calendario se activa en dashboard
3. Completar tareas durante el ciclo (7-21 días)
4. Al completar todas → Auto-finalize → Feedback (rating + comentario)
5. Generar nuevo plan

## 5. Registrar Gasto

1. Tab Gastos → "Nuevo gasto"
2. Título (auto-categoriza), monto, categoría (chip visible), quién pagó
3. Split: EQUAL (con exclusión de miembros opcional) o CUSTOM
4. Ver balances → "Liquidar" cuando se paga (optimistic update)

---

# Future Enhancements

- Lista de compras inteligente (IA)
- Presupuesto del hogar y gastos recurrentes
- Calendario externo (Google Calendar, Apple Calendar)
- Widgets de pantalla de inicio
- Reactivación de gamificación (logros, competencias, recompensas)
- Detección de burnout por IA
- Decisiones familiares (votación en grupo)

---

# Glossary

| Término | Definición |
|---------|------------|
| Hogar | Grupo de personas que comparten tareas y gastos |
| Miembro | Persona dentro de un hogar (ADULT, TEEN o CHILD) |
| Tarea | Actividad recurrente definida para el hogar |
| Asignación | Instancia de tarea asignada a un miembro con fecha de vencimiento |
| Plan | Plan periódico generado por IA con asignaciones balanceadas |
| Gasto | Expense compartido registrado por cualquier miembro |
| Split | División de un gasto entre miembros |
| Balance | Diferencia neta entre lo que le deben y lo que debe un miembro |
| Liquidar | Marcar una deuda como pagada |
| Briefing | Resumen diario generado por IA con insights del hogar |
| Equidad | Score de distribución justa de carga entre miembros |
| Disponibilidad | Slots semanales en que un miembro puede recibir tareas |
| Ruleta | Mecanismo de asignación aleatoria de tareas |
| Copiloto | Concepto central: IA que asiste en la gestión integral del hogar |
| Descubrir | Sección unificada de actividades culturales y recetas |
| Auto-categorización | Detección automática de categoría de gasto basada en keywords del título |
| Command Center | Dashboard que muestra el estado completo del hogar de un vistazo |
