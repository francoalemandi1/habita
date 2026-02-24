# Habita - Copiloto del Hogar

## Overview

**Habita** es un copiloto inteligente para la gestión del hogar familiar. Combina distribución equitativa de tareas, gastos compartidos, planificación con IA, asesor de compras, descubrimiento de eventos culturales y herramientas de bienestar en una sola app. Diseñada para familias de cualquier composición — adultos, adolescentes y niños — con interfaces adaptadas a cada tipo de miembro.

## Core Value Proposition

- **Copiloto con IA**: Planes semanales inteligentes, briefings diarios, recetas por foto/voz, eventos culturales reales por ubicación
- **Distribución justa**: Asignación de tareas basada en capacidad, preferencias, disponibilidad y carga actual
- **Gastos compartidos**: Splitting estilo Splitwise con categorías, iconografía, auto-categorización y liquidación optimista
- **Asesor de compras**: Comparación de precios entre supermercados argentinos con catálogo de productos y scoring de tiendas
- **Plataforma de eventos**: Agregación de eventos culturales de múltiples fuentes (Exa, Eventbrite, agenda BA) con descubrimiento on-demand por ciudad
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
- Asignaciones con día de semana + slots horarios (startTime, endTime)

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

---

## 6. Dashboard — Command Center del Hogar

El dashboard funciona como **command center**: en 3 segundos el usuario entiende el estado del hogar y puede actuar.

### Estructura
```
Greeting + fecha
├── PushOptInBanner (condicional, self-dismissing)
├── Invite card (solo si 1 miembro, dismissable)
├── DailyBriefing (resumen determinístico del hogar)
├── PlanStatusCard (si IA habilitada) + link "Ver planes"
├── PendingTransfers (si hay)
├── FridgeCalendarView (calendario semanal) o empty state con CTA a crear plan
├── Descubrir previews (2 cards: Planes para hoy + Recetas)
├── Balance rápido (siempre visible: verde/rojo/neutro con link a /balance)
└── Ruleta CTA (card con gradiente)
```

### Briefing Diario (Determinístico)
- Resumen diario 100% basado en lógica (sin LLM)
- Saludo personalizado según hora del día
- Highlights del hogar: tareas completadas ayer, pendientes hoy, vencidas, stats semanales
- Sugerencia del día basada en workload balance
- 4 highlights priorizados

### Calendario Semanal
- Vista tipo heladera (fridge calendar) de la semana del hogar
- Solo visible cuando hay un plan APPLIED activo
- Muestra asignaciones de todos los miembros por día
- Color-coded por miembro con avatares
- Completar tareas directamente desde el calendario

---

## 7. Descubrir

Sección unificada que combina actividades culturales, restaurantes y recetas, accesible desde la navegación principal.

### Tabs principales: Planes | Recetas

### Tab: Planes (Sub-tabs: Qué hacer | Dónde comer)

#### Sub-tab: Qué hacer (Actividades)
Eventos culturales y actividades basadas en la ubicación del usuario:

| Categoría | Contenido |
|-----------|-----------|
| Cine | Estrenos y cartelera |
| Teatro | Obras en cartel |
| Música | Recitales, conciertos |
| Exposiciones | Muestras, museos, galerías |
| Festivales | Eventos masivos |
| Mercados | Ferias, mercados artesanales |
| Paseos | Caminatas, recorridos |
| Excursiones | Actividades al aire libre |
| Talleres | Workshops, clases |
| Danza | Milongas, espectáculos |
| Literatura | Ferias del libro, lecturas |
| Gastronomía | Festivales gastronómicos |
| Deportes | Eventos deportivos |
| Infantil | Actividades para niños |

#### Sub-tab: Dónde comer (Restaurantes)
Descubrimiento de restaurantes con **awareness temporal**:

| Horario | Categorías destacadas |
|---------|----------------------|
| Desayuno | Cafés |
| Almuerzo | Restaurantes, parrillas, pizzerías, comida rápida |
| Merienda | Cafés, heladerías, cervecerías |
| Cena | Restaurantes, bares, parrillas, cervecerías, pizzerías |

#### Fuente de datos: Estrategia dual

**Plataforma de eventos** (prioridad si hay datos en la DB):
- Eventos reales de la base de datos CulturalEvent
- Alimentada por 3 proveedores (Exa, Eventbrite, Buenos Aires Agenda)
- Full-text search PostgreSQL
- **Descubrimiento on-demand**: Si la ciudad del usuario tiene 0 eventos, se dispara automáticamente una búsqueda Exa en tiempo real, se persisten los resultados, y se retorna al usuario

**Fallback LLM** (cuando la DB no tiene eventos para la ubicación):
- Búsqueda web via Tavily (primaria) + Serper (fallback)
- Síntesis con LLM (DeepSeek/Gemini)
- Cache en DB de 24 horas
- Para restaurantes, la cache key incluye el período de comida

#### Cada evento muestra
- Imagen banner (lazy loaded)
- Badge de categoría con icono y color
- Badge de urgencia temporal ("Hoy", "Mañana", "Esta semana")
- Título (linkeable si tiene sourceUrl)
- Venue + fecha + precio
- Descripción (3 líneas max)
- Tips (artistas para eventos, sugerencias para restaurantes)
- Link de direcciones (Google Maps)

#### Geolocalización
- Browser geolocation (silenciosa, no-bloqueante, timeout 10s)
- Reverse geocoding via BigDataCloud (idioma español)
- Detección de divisiones administrativas ("Departamento Capital" → ciudad real via locality)
- Fallback a ubicación del hogar si permiso denegado
- Timezone siempre capturado via Intl API

### Tab: Recetas (IA con visión y voz)

#### Métodos de entrada
1. **Texto**: Escribir lista de ingredientes (max 2000 caracteres)
2. **Imágenes**: Subir hasta 3 fotos de ingredientes (heladera, alacena). Redimensionadas a 1024px, JPEG 0.8
3. **Voz**: Dictado por Web Speech API (locale es-AR). Acumula transcripciones en el campo de texto

#### Tipo de comida
- Selección: Almuerzo | Cena | Merienda | Libre
- Auto-detección según hora del día
- Persistido en sessionStorage

#### Cada receta incluye
- Dificultad (Fácil/Media/Difícil con colores)
- Velocidad (Rápida/Media/Elaborada)
- Tiempo de preparación y porciones (adaptadas al tamaño del hogar)
- Ingredientes como pills (colapsables, muestra 6 + "+N más")
- Ingredientes faltantes (pills ámbar)
- Pasos numerados (expandibles)
- Tips del chef

#### Modelo de IA
- **Gemini 2.0 Flash** para análisis de imágenes (multimodal)
- **DeepSeek** fallback para texto puro
- Tono: concreto, coloquial argentino, sin hipérboles

---

## 8. Asesor de Compras

### Ofertas por Categoría (Grocery Deals)

Sistema de comparación de precios que busca las mejores ofertas en supermercados argentinos.

#### 8 categorías de productos
| Categoría | Ejemplo |
|-----------|---------|
| Almacén | Arroz, fideos, aceite, harina |
| Panadería y Dulces | Pan, galletitas, dulce de leche |
| Lácteos | Leche, queso, yogur |
| Carnes | Carne vacuna, pollo, cerdo |
| Frutas y Verduras | Estacionales |
| Bebidas | Agua, gaseosas, jugos, cerveza |
| Limpieza | Detergente, lavandina, desodorante de piso |
| Perfumería | Shampoo, jabón, pañales |

#### Pipeline de datos
1. Carga productos del `ProductCatalog` (200+ productos predefinidos)
2. Construye queries por pares de productos para Tavily (web search)
3. LLM extrae precios solo para productos del catálogo (previene alucinaciones)
4. Post-procesamiento: normalización de precios argentinos ("4.970,00" → 4970), validación (50-15.000 ARS), corrección de inversiones precio actual/regular
5. Clustering por tienda normalizada (30+ variantes → 20 canónicas)
6. **Scoring determinístico** (sin LLM):
   - Cobertura de canasta base (11 items esenciales, 50% del score)
   - Calidad de descuentos (30%)
   - Competitividad de precios vs otras tiendas (20%)
7. Recomendación con nivel de confianza: HIGH (≥60% cobertura), MEDIUM (≥33%), LOW (<33%)

#### Canasta base Habita (11 items)
Leche 1L, Arroz 1kg, Aceite 1.5L, Harina 1kg, Azúcar 1kg, Fideos 500g, Yerba 1kg, Pan lactal, Detergente, Papel higiénico, Agua 1.5L

#### Cache
- 24 horas por combinación de hogar + ubicación + categoría
- Force refresh disponible

### Plan de Compras (Shopping Plan)

Feature de búsqueda manual donde el usuario agrega hasta 30 productos y obtiene comparación de precios.

#### Flujo
1. Usuario agrega términos de búsqueda (ej: "queso cremoso 200g", "pan bimbo")
2. Búsqueda paralela en 11 supermercados via VTEX API
3. Fuzzy matching: token overlap (70%) + length ratio (30%)
4. Mejor match + hasta 3 alternativas por término/tienda
5. Carts por tienda rankeados por completitud + precio

#### UI
- Agregar/quitar términos (max 30, persistidos en localStorage)
- Tiendas rankeadas por completitud y precio total
- Swap de productos por alternativas
- Marcar productos como removidos (recalcula total)
- Badge "más barato" por producto

#### Exclusiones del hogar
- `HouseholdProductExclusion` permite excluir productos no deseados del catálogo
- Personalización por hogar

---

## 9. Plataforma de Eventos Culturales

### Arquitectura de ingesta

Sistema de agregación multi-proveedor que alimenta la base de datos de eventos culturales.

#### Proveedores (3 activos)

| Proveedor | Source Name | Tipo | Cobertura |
|-----------|------------|------|-----------|
| Exa | exa-web | WEB_DISCOVERY | Nacional (23 query templates rotativas) |
| Eventbrite | eventbrite | API | 6 ciudades principales (50km radio) |
| Buenos Aires Agenda | ba-agenda | AGENDA | Buenos Aires (agenda oficial) |

#### Programación cron (Vercel)
| Proveedor | Horario | Frecuencia |
|-----------|---------|------------|
| exa-web | 6:00 y 18:00 | 2x/día |
| eventbrite | 8:00 y 20:00 | 2x/día |
| ba-agenda | 10:00 y 22:00 | 2x/día |

#### Orquestador de ingesta
1. Carga EventSource de DB (verifica isActive)
2. Lee cursor persistido en `source.config` para paginación
3. Llama al proveedor con AbortController (50s timeout)
4. Por cada evento:
   - Descarta si no tiene título o fecha pasada
   - Normaliza ciudad (fuzzy matching a CulturalCity)
   - Verifica duplicados (scoring Levenshtein: título 40pts, venue 20pts, fecha 20pts, artistas 20pts; threshold ≥60)
   - Si duplicado: merge enriqueciendo el registro existente
   - Si nuevo: auto-categoriza, genera slug único, persiste
5. Actualiza health del source (lastFetchedAt, errorCount)
6. Log en EventIngestionLog

#### Deduplicación inteligente
- Candidatos: ventana de ±12 horas + misma ciudad + status ACTIVE
- Score de similaridad (0-100): título (Levenshtein normalizado), venue, proximidad temporal, overlap de artistas
- Merge: preferencia al source con mayor reliabilityScore, unión de tags/artistas

#### Descubrimiento on-demand
Cuando un usuario busca eventos para una ciudad sin resultados en la DB:
1. Se construyen 2 queries Exa específicas para la ciudad
2. Búsqueda paralela en Exa (neural search)
3. Extracción paralela via LLM (DeepSeek/Gemini)
4. Persistencia inmediata (con dedup)
5. Se retorna al usuario (~30s total)

#### 15 categorías de eventos
CINE, TEATRO, MUSICA, EXPOSICIONES, FESTIVALES, MERCADOS, PASEOS, EXCURSIONES, TALLERES, DANZA, LITERATURA, GASTRONOMIA, DEPORTES, INFANTIL, OTRO

#### Búsqueda
- PostgreSQL full-text search (tsvector + ts_rank, idioma español)
- Filtros: ciudad, categoría, rango de fechas, texto libre
- Paginación (limit/offset, default 20, max 50)
- Endpoint de eventos del fin de semana (viernes-domingo actual o próximo)

---

## 10. Ruleta de Tareas

- Selección aleatoria de tarea (solo tareas marcadas como elegibles)
- Selección aleatoria o manual de miembro
- Rueda animada interactiva
- Crea asignación al confirmar resultado
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
- Notas opcionales (max 300 chars)
- Respetada por el algoritmo de asignación y los planes de IA
- **Se recoge tanto en onboarding (crear hogar) como en post-join setup (unirse por invite)**

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

### Tipos de notificación
TRANSFER_REQUEST, TRANSFER_ACCEPTED, TRANSFER_REJECTED, TASK_OVERDUE, ACHIEVEMENT_UNLOCKED, LEVEL_UP, REMINDER_DUE, PLAN_READY, PLAN_APPLIED, REWARD_REDEEMED

---

## 15. Preferencias de Tareas

- Cada miembro marca tareas como: PREFERRED | NEUTRAL | DISLIKED
- PREFERRED: +20 al score de asignación
- DISLIKED: -20 al score de asignación
- Accesible desde `/preferences` (junto con disponibilidad y ausencias)

---

## 16. Rotación Automática de Tareas

- Definir orden de miembros para una tarea
- Frecuencia de rotación: WEEKLY | MONTHLY
- Rotación automática procesada por cron job (diario a las 8:00)

---

## 17. Asistente IA (Chat)

- Widget de chat integrado en el layout
- Streaming de respuestas en tiempo real via DeepSeek
- Contexto inyectado: miembros, tareas, asignaciones recientes, estadísticas semanales, ubicación, timezone
- Preguntas sugeridas:
  - "Quién hizo más tareas esta semana?"
  - "Cómo está la equidad del hogar?"
  - "Qué tareas tengo pendientes?"

---

## 18. Recompensas con IA

- Generación automática de recompensas post-plan basadas en performance
- Adaptadas culturalmente al tipo de hogar (familia, pareja, grupo)
- Escalamiento por rendimiento:
  - >80% completado: Premium (cine, restaurante, espectáculo)
  - 50-80%: Intermedio (parque, helado, café)
  - <50%: Hogar (noche de película, no cocinar, desayuno en la cama)
- Categorías: OUTING | GASTRONOMY | OUTDOOR | HOME
- Action URLs para reservas/compras

---

## 19. Empty States

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
| Descubrir sin ubicación | "Activá la geolocalización" | Solicitud de permiso |
| Descubrir sin resultados | "Sin sugerencias" | "Probá actualizar más tarde" |

---

# Features en Background (UI oculta)

> El backend trackea estos datos pero la UI fue ocultada durante el pivote a "copiloto del hogar". Los modelos y APIs existen para activación futura.

- **Logros (Achievements)**: Definiciones y desbloqueos por miembro
- **Competencias**: Leaderboards familiares por período
- **Niveles y XP**: Tracking de experiencia y niveles
- **Penalidades**: Deducciones automáticas por atrasos

---

# Technical Architecture

## Stack

| Componente | Tecnología |
|------------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Runtime | React 19 |
| Hosting | Vercel |
| Base de Datos | PostgreSQL (Neon Serverless) |
| ORM | Prisma 6 |
| Autenticación | NextAuth.js v5 (beta) + Google OAuth |
| IA (LLM) | Multi-provider: DeepSeek / Google Gemini (via Vercel AI SDK v6) |
| IA (Vision) | Google Gemini 2.0 Flash |
| Web Search | Tavily (primaria) + Serper (fallback) |
| Event Discovery | Exa API (neural search) + Eventbrite v3 API |
| Emails | Resend |
| Estilos | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| Validación | Zod |
| Estado Cliente | React Query (TanStack Query v5) |
| Push | Web Push API (VAPID) |
| WhatsApp | WhatsApp Cloud API |
| Testing | Vitest |
| Paquetes | pnpm |

## Autenticación

1. "Continuar con Google" (OAuth)
2. Creación de cuenta en DB
3. Si no tiene hogar → Onboarding
4. Si tiene hogar → Dashboard

## Proveedores de IA (por prioridad)

| Prioridad | Proveedor | Variable | Uso principal |
|-----------|-----------|----------|---------------|
| 1 | DeepSeek | `DEEPSEEK_API_KEY` | Texto, chat, planificación, extracción |
| 2 | Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | Multimodal (imágenes), fallback texto |
| 3 | Stub | (ninguna) | Features de IA deshabilitadas gracefully |

> **Nota**: Los proveedores Anthropic y OpenRouter fueron removidos. El sistema actual usa DeepSeek como primario y Gemini como fallback/multimodal.

### Modelos por feature

| Feature | Modelo | Capacidad |
|---------|--------|-----------|
| Chat streaming | DeepSeek Chat | streamText |
| Planificación semanal | DeepSeek/Gemini 1.5 Flash | generateObject |
| Briefing diario | Ninguno (determinístico) | Lógica pura |
| Recetas (texto) | DeepSeek | generateObject |
| Recetas (imágenes) | Gemini 2.0 Flash | generateObject (multimodal) |
| Actividades/Restaurantes | DeepSeek/Gemini 1.5 Flash | generateObject |
| Extracción de eventos | DeepSeek/Gemini | generateObject |
| Grocery deals | DeepSeek/Gemini 1.5 Flash | generateObject |
| Recompensas | DeepSeek/Gemini 1.5 Flash | generateObject |
| Recomendaciones | DeepSeek | generateObject |

## Database Schema (37 modelos)

### Core
- `User` - Usuarios NextAuth
- `Account`, `Session`, `VerificationToken` - NextAuth internals
- `Household` - Hogares (timezone, geolocalización, inviteCode, planningDay)
- `Member` - Miembros (tipo, availability, isActive)
- `Task` - Definiciones de tareas
- `Assignment` - Instancias asignadas (con suggestedStartTime/EndTime)

### Expenses
- `Expense` - Gastos (Decimal 10,2, categoría, splitType)
- `ExpenseSplit` - Splits por miembro (monto, settled, settledAt)

### AI & Planning
- `WeeklyPlan` - Planes semanales (status, balanceScore, assignments JSON)
- `PlanFeedback` - Feedback de fin de ciclo (rating 1-5, comentario)
- `RelaxSuggestion` - Sugerencias cacheadas de Descubrir (24h TTL)

### Events Platform
- `CulturalCity` - Ciudades con aliases, coordenadas, población
- `CulturalVenue` - Venues con slug, dirección, contacto
- `CulturalEvent` - Eventos completos con tsvector para FTS, 15 categorías
- `EventSource` - Sources con reliabilityScore (0-100), health tracking
- `EventIngestionLog` - Audit trail de ingestas

### Grocery
- `ProductCatalog` - 200+ productos predefinidos (8 categorías)
- `DealCache` - Cache de ofertas por ubicación/categoría (24h TTL)
- `PriceCache` - Cache de planes de compra
- `HouseholdProductExclusion` - Productos excluidos por hogar

### Preferences & Collaboration
- `MemberPreference` - Preferencias de tarea
- `MemberAbsence` - Ausencias
- `TaskTransfer` - Transferencias
- `TaskRotation` - Rotaciones automáticas
- `TaskReminder` - Recordatorios

### Gamification (background)
- `MemberLevel` - XP y niveles
- `Achievement` / `MemberAchievement` - Logros
- `HouseholdReward` / `RewardRedemption` - Recompensas
- `Competition` / `CompetitionScore` - Competencias

### Notifications
- `Notification` - Notificaciones in-app (10 tipos)
- `PushSubscription` - Suscripciones push
- `WhatsAppLink` - Vinculaciones WhatsApp

### Catalog
- `TaskCatalog` - Catálogo predefinido de tareas

## Navegación

### 5 tabs (mobile bottom bar + desktop top nav)
Hoy | Tareas | Gastos | Descubrir | Perfil

| Tab | Ruta | Icono | Descripción |
|-----|------|-------|-------------|
| Hoy | `/dashboard` | Home | Command center del hogar |
| Tareas | `/my-tasks` | ClipboardCheck | Mis tareas pendientes + calendario |
| Gastos | `/balance` | Scale | Gastos compartidos, balances y asesor de compras |
| Descubrir | `/descubrir` | Compass | Eventos + Restaurantes + Recetas (IA) |
| Perfil | `/profile` | User | Configuración personal |

### Páginas accesibles desde links internos
- `/plans` - Historial de planes (link desde dashboard)
- `/plan` - Generar/ver plan activo
- `/roulette` - Ruleta (card en dashboard)
- `/preferences` - Preferencias, disponibilidad y ausencias (link desde profile)
- `/tasks` - Gestión de tareas del hogar (catálogo)
- `/rotations` - Rotaciones de tareas

## Cron Jobs (Vercel)

| Job | Ruta | Horario | Descripción |
|-----|------|---------|-------------|
| Process | `/api/cron/process` | 9:00 diario | Procesamiento general |
| Weekly Plan | `/api/cron/weekly-plan` | 7:00 lunes | Auto-generación de planes |
| Rotations | `/api/rotations/process` | 8:00 diario | Rotación automática de tareas |
| Weekly Insights | `/api/cron/weekly-insights` | 20:00 domingo | Insights semanales |
| Exa Ingest | `/api/cron/events/ingest?provider=exa-web` | 6:00, 18:00 | Ingesta Exa (nacional) |
| Eventbrite Ingest | `/api/cron/events/ingest?provider=eventbrite` | 8:00, 20:00 | Ingesta Eventbrite (6 ciudades) |
| BA Agenda Ingest | `/api/cron/events/ingest?provider=ba-agenda` | 10:00, 22:00 | Ingesta BA Agenda |

## Caching Strategy

| Dato | Capa | TTL | Key |
|------|------|-----|-----|
| Eventos (React Query) | Cliente | staleTime 10min, gcTime 30min | `events.list(city)` |
| Relax suggestions | DB (RelaxSuggestion) | 24h | `householdId:lat:lng:section[:mealPeriod]` |
| Grocery deals | DB (DealCache) | 24h | `householdId:lat:lng:category` |
| Shopping plan | DB (PriceCache) | 24h | `householdId:lat:lng` |
| Web search | In-memory | 2h | Query string |
| Recetas | Mutation cache (React Query) | gcTime 30min | Mutation key |

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
2. Ver briefing diario con insights del hogar
3. Revisar plan activo y calendario semanal
4. Completar tareas desde calendario o tab Tareas
5. Ver balance de gastos si hay deudas pendientes
6. Explorar eventos culturales o recetas en Descubrir

## 4. Ciclo del Plan

1. "Genera un plan" → IA crea plan con asignaciones + slots horarios
2. Revisar → Aplicar → Calendario se activa en dashboard
3. Completar tareas durante el ciclo (7-21 días)
4. Al completar todas → Auto-finalize → Feedback (rating + comentario)
5. Generar nuevo plan (feedback mejora planes futuros)

## 5. Registrar Gasto

1. Tab Gastos → "Nuevo gasto"
2. Título (auto-categoriza), monto, categoría (chip visible), quién pagó
3. Split: EQUAL (con exclusión de miembros opcional) o CUSTOM
4. Ver balances → "Liquidar" cuando se paga (optimistic update)

## 6. Descubrir Eventos

1. Tab Descubrir → Planes → Qué hacer
2. Geolocalización detecta ciudad (ej: Córdoba)
3. Si hay eventos en DB → muestra resultados con FTS
4. Si 0 eventos → dispara descubrimiento on-demand (Exa search + LLM ~30s)
5. Filtra por categoría via pills horizontales
6. Tap en evento → detalles + link a Google Maps

## 7. Buscar Ofertas

1. Tab Gastos → Ofertas → Seleccionar categoría (ej: Lácteos)
2. Si cache <24h → muestra resultados cacheados
3. Si cache expirada → web search + LLM extraction (~15s)
4. Ver tiendas rankeadas por score (cobertura + descuentos + competitividad)
5. Recomendación con confianza (alta/media/baja)

## 8. Plan de Compras

1. Tab Gastos → Plan de compras
2. Agregar productos manualmente (ej: "queso cremoso", "pan bimbo")
3. Buscar precios → 11 supermercados en paralelo
4. Ver carts por tienda, rankeados por completitud + precio
5. Swap/remove productos, comparar alternativas

---

# Future Enhancements

- Calendario externo (Google Calendar, Apple Calendar)
- Widgets de pantalla de inicio
- Reactivación de gamificación (logros, competencias, leaderboards)
- Detección de burnout por IA
- Decisiones familiares (votación en grupo)
- Favoritos/guardado de eventos
- Notificaciones/recordatorios de eventos
- Historial de recetas
- Presupuesto del hogar y gastos recurrentes

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
| Briefing | Resumen diario determinístico con insights del hogar |
| Equidad | Score de distribución justa de carga entre miembros |
| Disponibilidad | Slots semanales en que un miembro puede recibir tareas |
| Ruleta | Mecanismo de asignación aleatoria de tareas |
| Copiloto | Concepto central: IA que asiste en la gestión integral del hogar |
| Descubrir | Sección unificada de eventos culturales, restaurantes y recetas |
| Auto-categorización | Detección automática de categoría de gasto basada en keywords del título |
| Command Center | Dashboard que muestra el estado completo del hogar de un vistazo |
| Evento Cultural | Evento agregado de múltiples fuentes (Exa, Eventbrite, BA Agenda) |
| Ingesta | Proceso cron de descubrimiento y persistencia de eventos en la DB |
| On-demand Discovery | Búsqueda Exa en tiempo real cuando una ciudad no tiene eventos en DB |
| Deduplicación | Score de similaridad (Levenshtein) para evitar eventos duplicados |
| Canasta Base | 11 items esenciales usados para scoring de supermercados |
| Grocery Deals | Ofertas de supermercados encontradas via web search + LLM extraction |
| Shopping Plan | Comparación de precios manual entre 11 supermercados via VTEX |
| EventSource | Proveedor de datos de eventos con tracking de confiabilidad |
| tsvector | Full-text search de PostgreSQL usado para búsqueda de eventos |
