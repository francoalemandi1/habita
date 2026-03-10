# Habita - PRD As-Is (Estado Actual)

## 1. Resumen del producto

Habita es una app de coordinacion del hogar para grupos convivientes en Argentina. Disponible en web (Next.js) y mobile (Expo + React Native) con paridad de features. El producto actual combina:

- organizacion de tareas y planes semanales con IA;
- registro, analitica y liquidacion de gastos compartidos;
- comparador de precios entre supermercados y ofertas semanales (Top Ofertas);
- descubrimiento de actividades culturales por ciudad;
- recetas asistidas por IA (texto o foto de heladera);
- notificaciones proactivas y briefings operativos.

El objetivo principal es reducir friccion diaria de coordinacion, reparto y decisiones domesticas, no maximizar gamificacion.

## 2. Publico objetivo actual

### Segmento principal
- hogares compartidos (parejas, familias, convivencias) que necesitan coordinar tareas y gastos;
- usuarios con sensibilidad al precio para compras recurrentes;
- usuarios urbanos que valoran descubrimiento de actividades y recetas practicas.

### Modos de uso vigentes
- **solo**: experiencia individual simplificada (sin flujos de deuda entre miembros);
- **shared**: experiencia colaborativa con miembros, transferencias, balances y fondo comun.

### Plataformas
- **Web**: Next.js App Router, responsive, PWA-ready. Desplegado en Vercel.
- **Mobile**: Expo + React Native con navegacion nativa (tabs + stack). iOS y Android.

## 3. Alcance real del producto (modulos activos)

Navegacion principal actual (web):
- `Planificá` -> `/my-tasks`
- `Registrá` -> `/balance`
- `Ahorrá` -> `/compras`
- `Descubrí` -> `/descubrir`
- `Cociná` -> `/cocina`

Navegacion mobile (tabs):
- Home (Dashboard), Planificá, Registrá, Ahorrá, Más (Descubrí, Cociná)

El dashboard existe como command center (`/dashboard`) y no como tab principal en web.

Sub-features relevantes:
- Top Ofertas (`/grocery-deals`): vista consolidada de mejores descuentos por supermercado con add-to-cart.
- Fondo comun: tab en `/balance` para ahorro compartido con objetivo, aportes y egresos.
- Servicios (`/services`): gestion de servicios recurrentes con import de Gmail.
- Rotaciones (`/rotations`): asignacion round-robin automatica de tareas.

## 4. Matriz de trazabilidad as-is

| Dominio | Pantallas clave | APIs clave | Modelos principales |
|---|---|---|---|
| Onboarding y hogar | `/onboarding`, `/join/[code]`, `/profile` | `/api/households/onboarding`, `/api/households/join`, `/api/households/switch` | `Household`, `Member`, `User` |
| Tareas y asignaciones | `/my-tasks`, `/tasks`, `/rotations`, `/roulette` | `/api/tasks`, `/api/assignments`, `/api/transfers`, `/api/rotations` | `Task`, `Assignment`, `TaskTransfer`, `TaskRotation`, `MemberPreference`, `MemberAbsence` |
| Planes semanales | `/plan`, `/plans`, widgets en `/dashboard` | `/api/ai/preview-plan`, `/api/ai/apply-plan`, `/api/plans/*` | `WeeklyPlan`, `PlanFeedback` |
| Gastos y balances | `/balance` | `/api/expenses`, `/api/expenses/insights`, `/api/expenses/balances`, `/api/expenses/settle-between` | `Expense`, `ExpenseSplit`, `Service`, `Invoice` |
| Fondo comun | Tab en `/balance` | `/api/fund`, `/api/fund/setup`, `/api/fund/allocations`, `/api/fund/contribute`, `/api/fund/expenses` | `SharedFund`, `FundAllocation`, `FundContribution`, `FundExpense` |
| Ahorra (compras) | `/compras`, `/grocery-deals` | `/api/ai/shopping-plan`, `/api/ai/grocery-deals/top`, `/api/promos/*`, `/api/saved-items/deals*` | `SavedCart`, `BankPromo`, `ProductCatalog`, `DealCacheCity`, `PriceCache` |
| Descubrir | `/descubrir` | `/api/events`, `/api/events/refresh`, `/api/ai/relax-suggestions`, `/api/saved-items/events` | `CulturalEvent`, `CulturalVenue`, `EventSource`, `SavedEvent` |
| Cocina | `/cocina` | `/api/ai/cocina`, `/api/saved-items/recipes` | `SavedRecipe` |
| Notificaciones | Header + banner push | `/api/notifications`, `/api/push/subscribe`, `/api/briefing` | `Notification`, `PushSubscription` |

## 5. Flujos criticos end-to-end

## 5.1 Onboarding, join y cambio de hogar
- Usuario autenticado sin membresia entra a `/onboarding`.
- Puede crear hogar nuevo o unirse con codigo.
- Setup contempla contexto de ubicacion para features con geografia.
- Usuario puede pertenecer a mas de un hogar y alternar contexto con switcher.

## 5.2 Tareas, asignaciones y transferencias
- Administracion de tareas del hogar con catalogo + alta custom.
- Asignaciones semanales visibles en lista y calendario.
- Completar, deshacer completado y verificar (segun permisos).
- Transferencias entre miembros con solicitud y respuesta.
- Rotaciones y ruleta disponibles como herramientas de distribucion.

## 5.3 Planes semanales con IA
- Usuario genera vista previa en `/plan`.
- Puede aplicar plan para materializar asignaciones.
- Seguimiento del estado en dashboard y en historial `/plans`.
- Cierre de ciclo con feedback.
- Si IA no esta habilitada por provider/key, el modulo se degrada o se oculta.

## 5.4 Gastos, deudas, fondo y servicios
- Registro de gastos con categorias y subcategorias inferidas.
- Edicion/borrado de gasto, filtros y agrupaciones.
- Balances y liquidacion entre miembros.
- Fondo compartido con configuracion de objetivos, aportes y egresos.
- Gestion de servicios recurrentes con opcion de escaneo/import de Gmail.
- Insights financieros con historico mensual, tips y severidad.

## 5.5 Ahorra (comparador de compras y ofertas)
- Construccion de lista (manual + catalogo + custom).
- Busqueda por multiples supermercados (Coto, Jumbo, Disco, Vea, Carrefour, Dia, etc.).
- Ajuste de cantidades por item.
- Overrides por item: swap, removido, ya agregado, sin stock.
- Recomendacion de reemplazos scoped por producto.
- Guardado y refresh de carritos guardados.
- Tab de promos bancarias por supermercado.
- Top Ofertas: vista cross-category con los mejores descuentos reales scrapeados via VTEX APIs. On-demand con cache de 24hs. Add-to-cart directo al carrito de compras.

## 5.6 Descubrir y Cocina
- Descubrir: sugerencias de actividades/lugares por ciudad con filtros.
- Pipeline de eventos con refresh on-demand y estado de pipeline.
- Cocina: recetas asistidas por IA con entrada textual, foto de heladera y guardado de recetas.
- Guardado transversal de items para reutilizacion.

## 5.7 Notificaciones y briefing
- Dropdown de notificaciones con polling y estado leido/no leido.
- Banner para opt-in de push web.
- Push notifications mobile via Expo Push.
- Notificaciones proactivas: SERVICE_DUE_SOON, TASK_REMINDER, EXPENSE_WEEKLY_SUMMARY, CULTURAL_RECOMMENDATION, DEAL_ALERT.
- Briefing diario como resumen operativo del hogar.

## 6. Capacidades IA reales (por modulo)

### Planificacion
- generacion de planes y razonamiento de asignacion;
- previsualizacion y aplicacion del plan.

### Finanzas y compras
- insights de gasto y recomendaciones accionables;
- categorizacion automatica de gastos (categoria + subcategoria);
- sugerencias y reemplazos en comparador de compras.

### Descubrir y cocina
- sugerencias de actividades cuando no hay datos frescos;
- generacion de recetas desde texto o foto de heladera.

### Regla de disponibilidad
- IA depende de provider configurado (DeepSeek o Gemini);
- modulo se degrada de manera explicita cuando IA no esta habilitada.

## 7. Arquitectura funcional actual

### Monorepo
- pnpm workspaces con packages compartidos:
  - `@habita/contracts` — Zod schemas compartidos web+mobile
  - `@habita/design-tokens` — colores, spacing, radius (light + dark)
  - `@habita/api-client` — cliente HTTP con auth, retry, refresh
  - `@habita/domain` — logica de negocio platform-agnostic

### Web (backend + frontend)
- Next.js App Router (UI + BFF + jobs en el mismo repo).
- APIs como route handlers bajo `src/app/api/*`.
- Prisma como capa de acceso a PostgreSQL.
- React Query para datos dinamicos.
- Wrappers de API con manejo centralizado de errores y 401.

### Mobile
- Expo + React Native con Expo Router (tabs + stack).
- Theme system: `useThemeColors()` + `createStyles(colors)` factory.
- API client compartido (`@habita/api-client`) con Bearer token + refresh rotation.
- Push notifications via Expo Push Notifications.
- ~95% paridad de features con web.

### Autenticacion y contexto
- Web: NextAuth + JWT (cookie, 30 dias).
- Mobile: Bearer tokens (`mob_at_*` / `mob_rt_*`) con refresh rotation.
- Middleware para proteger rutas privadas.
- Resolucion de miembro/hogar activo en server side.

## 8. Integraciones externas vigentes

- Google OAuth (auth principal).
- Gmail OAuth + scanner/extractor para servicios/facturas.
- Tavily y Serper para descubrimiento de eventos.
- Firecrawl para scraping/extraccion de eventos.
- VTEX APIs (Coto, Jumbo, Disco, Vea) para precios de supermercados.
- Integraciones custom (Carrefour, Dia) para catalogos adicionales.
- Resend para email.
- Web Push (VAPID) para notificaciones web.
- Expo Push Notifications para mobile.
- Open-Meteo para clima.

## 9. Seguridad y aislamiento de datos

Patrones implementados:
- scoping por `householdId` en consultas de datos de dominio;
- helpers de sesion (`requireAuth`, `requireMember`);
- validacion de input con Zod en endpoints de escritura;
- permisos por tipo de miembro (`ADULT`, `TEEN`, `CHILD`);
- endpoints cron protegidos por `CRON_SECRET`.

Limitaciones a vigilar:
- algunos endpoints del fondo comun tienen enforcement de permisos menos estricto que el resto;
- varios flujos dependen de heuristicas (matching de productos/promos, parsing de emails).

## 10. Operacion y jobs

### Crons (consolidados, Vercel Hobby: 2 slots)
- `/api/cron/process` (diario 7am UTC): redistribucion de ausencias, limpieza de notificaciones, facturacion de servicios, expiracion de eventos, cleanup de sesiones mobile, notificaciones proactivas, rotaciones. Dispara `events/ingest` y `grocery-deals` via `after()` fire-and-forget.
- `/api/cron/weekly-plan` (lunes 7am UTC): generacion automatica de planes semanales.

### AI background jobs
Operaciones AI async usan patron fire-and-forget con polling:
`markJobRunning()` → `after()` ejecuta → `completeJob()` → cliente pollea `/api/ai/job-status`.
Hook compartido: `useAiJobStatus()` (web y mobile).

### Otros pipelines
- Ingesta de eventos culturales (pipeline multi-ciudad con self-invocations).
- Scraping de precios de supermercados (on-demand con cache de 24hs).
- Escaneo de Gmail para deteccion de servicios.

## 11. Restricciones y deuda tecnica reconocida

- cache en memoria para ciertos conectores (no distribuido entre instancias);
- uso de JSON en algunas entidades de planificacion, con costo de evolucion de esquema;
- varias integraciones externas con riesgo de calidad variable de datos;
- parte de listados y consultas aun sin paginacion estricta.

## 12. Funcionalidades diferidas o no shippeadas

No considerar como alcance actual:
- modo kids dedicado con interfaz separada;
- dashboard parental dedicado;
- asistente conversacional general dentro de la app;
- flujos de WhatsApp como canal primario de producto;
- rewards/gamificacion como superficie principal de uso.

Estas piezas pueden existir parcialmente en schema/copy historica, pero no son eje funcional visible hoy.

## 13. Criterios de exito del estado actual

Habita cumple su objetivo actual cuando:
- el hogar puede operar semana a semana desde dashboard + tareas + planes;
- gastos y balances reflejan deuda real y facilitan liquidacion;
- compras ayudan a decidir mejor precio y alternativas reales;
- Top Ofertas muestra descuentos verificables que generan ahorro tangible;
- descubrir/cocina aportan valor complementario sin romper flujo principal;
- la experiencia es consistente entre web y mobile;
- el sistema mantiene aislamiento por hogar y experiencia consistente por tipo de miembro.

## 14. Fuente de verdad documental

Este PRD reemplaza descripciones historicas que no reflejan implementacion vigente.
Cuando haya discrepancia entre documentos, prevalece:

1. comportamiento observable en rutas y componentes actuales;
2. APIs y validaciones en `src/app/api/*` y `src/lib/validations/*`;
3. modelo Prisma en `prisma/schema.prisma`.
