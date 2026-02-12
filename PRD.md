# Habita - Copiloto del Hogar

## Overview

**Habita** es un copiloto inteligente para la gestión del hogar familiar. Combina distribución equitativa de tareas, gastos compartidos, planificación con IA y herramientas de bienestar en una sola app. Diseñada para familias de cualquier composición — adultos, adolescentes y niños — con interfaces adaptadas a cada tipo de miembro.

## Core Value Proposition

- **Copiloto con IA**: Planes semanales inteligentes, briefings diarios, recetas por foto, actividades culturales por ubicación
- **Distribución justa**: Asignación de tareas basada en capacidad, preferencias, disponibilidad y carga actual
- **Gastos compartidos**: Splitting estilo Splitwise con balances y liquidación de deudas
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

### Checklist Diario (Dashboard)
- Tareas pendientes del día para el miembro actual
- Completado rápido con tap en checkbox
- Contador de completadas hoy
- Timezone-aware según zona horaria del hogar

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

---

## 5. Gastos Compartidos

### Registro de Gastos
- Cualquier miembro puede registrar un gasto
- Campos: título, monto, categoría, quién pagó, fecha, notas
- Moneda por defecto: ARS

### Categorías
GROCERIES | UTILITIES | RENT | FOOD | TRANSPORT | HEALTH | ENTERTAINMENT | EDUCATION | HOME | OTHER

### Tipos de Split
| Tipo | Descripción |
|------|-------------|
| EQUAL | División equitativa entre todos los miembros activos |
| CUSTOM | Montos personalizados por miembro |
| PERCENTAGE | Porcentajes por miembro |

### Balances y Liquidación
- Balance neto por miembro (positivo = le deben, negativo = debe)
- Algoritmo greedy de simplificación de deudas (minimiza transacciones)
- Liquidación con confirmación
- Card de balance en dashboard (verde "Te deben" / rojo "Debés")

---

## 6. Briefing Diario con IA

- Resumen diario generado automáticamente
- Saludo personalizado según hora del día
- Highlights del hogar (tareas, actividad reciente)
- Sugerencia del día
- Mostrado en la parte inferior del dashboard

---

## 7. Cocina (IA con visión)

- Subir hasta 3 fotos de ingredientes (heladera, alacena)
- IA analiza imágenes y sugiere recetas
- Selección de tipo de comida (Almuerzo, Cena, Merienda, Libre)
- Cada receta incluye: dificultad, tiempo, porciones, ingredientes, pasos
- Accesible desde la navegación principal

---

## 8. Relax (IA + ubicación)

Tres tabs basados en la ubicación del hogar:

| Tab | Contenido |
|-----|-----------|
| Cultura | Cine, teatro, música, museos, galerías |
| Restaurantes | Restaurantes, bares, cafeterías |
| Weekend | Actividades para el fin de semana |

- Generado por IA usando la geolocalización del hogar
- Sugerencias cacheadas en DB para eficiencia
- Links externos a eventos/lugares

---

## 9. Ruleta de Tareas

- Selección aleatoria de tarea (solo tareas marcadas como elegibles)
- Selección aleatoria o manual de miembro
- Rueda animada interactiva
- Crea asignación al confirmar resultado
- Accesible desde card en el dashboard

---

## 10. Calendario Semanal

- Vista tipo heladera (fridge calendar) de la semana del hogar
- Muestra asignaciones de todos los miembros por día
- Color-coded por miembro
- Indicadores de estado (pendiente, en progreso, completada)
- Accesible desde card en el dashboard

---

## 11. Modo Niños y Controles Parentales

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

## 12. Transferencias de Tareas

- Solicitud de transferencia entre miembros
- Mensaje opcional
- Estados: PENDING | ACCEPTED | REJECTED
- Restricción: no se pueden transferir tareas vencidas

---

## 13. Ausencias y Disponibilidad

### Disponibilidad Semanal
- Configuración por slots: mañana (7-12), tarde (12-18), noche (18-22)
- Diferencia entre días de semana y fin de semana
- Notas opcionales
- Respetada por el algoritmo de asignación y los planes de IA

### Ausencias
- Fecha inicio y fin
- Razón: travel | illness | work | other
- Política: AUTO (redistribuir) | SPECIFIC (asignar a alguien) | POSTPONE (posponer)

---

## 14. Notificaciones

### Push Web
- Opt-in con banner en el dashboard
- Usa Web Push API con claves VAPID
- Recordatorios de tareas, alertas de transferencias

### WhatsApp
- Vinculación de número con código de verificación (expira en 10 min)
- Número enmascarado en la UI
- Webhook para mensajes entrantes

---

## 15. Preferencias de Tareas

- Cada miembro marca tareas como: PREFERRED | NEUTRAL | DISLIKED
- PREFERRED: +20 al score de asignación
- DISLIKED: -20 al score de asignación
- Accesible desde `/preferences`

---

## 16. Rotación Automática de Tareas

- Definir orden de miembros para una tarea
- Frecuencia de rotación: WEEKLY | MONTHLY
- Rotación automática procesada por cron job

---

## 17. Asistente IA (Chat)

- Widget de chat integrado en el layout
- Streaming de respuestas en tiempo real
- Contexto: miembros, tareas, asignaciones recientes, estadísticas
- Preguntas sugeridas:
  - "Quién hizo más tareas esta semana?"
  - "Cómo está la equidad del hogar?"
  - "Qué tareas tengo pendientes?"

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
| Search | Serper / Tavily (para Relax) |

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
- `relax_suggestions` - Sugerencias cacheadas de Relax

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

### Mobile (bottom bar flotante, 6 tabs)
Hogar | Tareas | Gastos | Relaja | Cocina | Perfil

### Desktop (sidebar, 5 items)
Hogar | Tareas | Relaja | Cocina | Perfil

> Nota: Gastos está en mobile pero no en desktop nav (accesible desde dashboard card).

### Páginas accesibles desde links internos
- `/plans` - Historial de planes (link desde dashboard)
- `/calendar` - Calendario semanal (card en dashboard)
- `/roulette` - Ruleta (card en dashboard)
- `/preferences` - Preferencias (link desde profile)
- `/kids` - Modo niños
- `/parental` - Controles parentales (solo adultos)
- `/rotations` - Rotaciones de tareas

---

# User Flows

## 1. Primer Uso

1. Landing → "Continuar con Google"
2. Onboarding: nombre, tipo, hogar, tareas, disponibilidad
3. Dashboard con banner de invitación (si es único miembro)
4. Compartir código para que se unan los demás

## 2. Día Típico

1. Abrir app → Dashboard
2. Ver briefing diario con insights de IA
3. Revisar plan activo y progreso
4. Completar tareas desde el checklist
5. Ver balance de gastos si hay deudas pendientes
6. Explorar recetas o actividades culturales

## 3. Ciclo del Plan

1. "Genera un plan" → IA crea plan con asignaciones
2. Revisar → Aplicar
3. Completar tareas durante el ciclo (7-21 días)
4. Al completar todas → Feedback (rating + comentario)
5. Generar nuevo plan

## 4. Registrar Gasto

1. Nav → Gastos → "Agregar gasto"
2. Título, monto, categoría, quién pagó
3. Split (EQUAL por defecto)
4. Ver balances → "Liquidar" cuando se paga

## 5. Unirse a un Hogar

1. Recibir link `/join/[code]` o código de 8 caracteres
2. Google OAuth
3. Nombre y tipo de miembro
4. Acceso al hogar

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
