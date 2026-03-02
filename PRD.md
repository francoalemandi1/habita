# Habita - PRD As-Is (Estado Actual)

## 1. Resumen del producto

Habita es una app de coordinacion del hogar para grupos convivientes en Argentina. El producto actual combina:

- organizacion de tareas y planes semanales;
- registro y analitica de gastos compartidos;
- modulo de ahorro en supermercados;
- descubrimiento de actividades;
- recetas asistidas;
- notificaciones y briefings operativos.

El objetivo principal es reducir friccion diaria de coordinacion, reparto y decisiones domesticas, no maximizar gamificacion.

## 2. Publico objetivo actual

### Segmento principal
- hogares compartidos (parejas, familias, convivencias) que necesitan coordinar tareas y gastos;
- usuarios con sensibilidad al precio para compras recurrentes;
- usuarios urbanos que valoran descubrimiento de actividades y recetas practicas.

### Modos de uso vigentes
- **solo**: experiencia individual simplificada (sin flujos de deuda entre miembros);
- **shared**: experiencia colaborativa con miembros, transferencias, balances y fondo comun.

## 3. Alcance real del producto (modulos activos)

Navegacion principal actual:
- `Planificá` -> `/my-tasks`
- `Registrá` -> `/balance`
- `Ahorrá` -> `/compras`
- `Descubrí` -> `/descubrir`
- `Cociná` -> `/cocina`

El dashboard existe como command center (`/dashboard`) y no como tab principal.

## 4. Matriz de trazabilidad as-is

| Dominio | Pantallas clave | APIs clave | Modelos principales |
|---|---|---|---|
| Onboarding y hogar | `/onboarding`, `/join/[code]`, `/profile` | `/api/households/onboarding`, `/api/households/join`, `/api/households/switch` | `Household`, `Member`, `User` |
| Tareas y asignaciones | `/my-tasks`, `/tasks`, `/rotations`, `/roulette` | `/api/tasks`, `/api/assignments`, `/api/transfers`, `/api/rotations` | `Task`, `Assignment`, `TaskTransfer`, `TaskRotation`, `MemberPreference`, `MemberAbsence` |
| Planes semanales | `/plan`, `/plans`, widgets en `/dashboard` | `/api/ai/preview-plan`, `/api/ai/apply-plan`, `/api/plans/*` | `WeeklyPlan`, `PlanFeedback` |
| Gastos y balances | `/balance` | `/api/expenses`, `/api/expenses/insights`, `/api/expenses/balances`, `/api/expenses/settle-between` | `Expense`, `ExpenseSplit`, `Service`, `Invoice` |
| Fondo comun | Tab en `/balance` | `/api/fund`, `/api/fund/setup`, `/api/fund/allocations`, `/api/fund/contribute`, `/api/fund/expenses` | `SharedFund`, `FundAllocation`, `FundContribution`, `FundExpense` |
| Ahorra (compras) | `/compras` | `/api/ai/shopping-plan`, `/api/ai/shopping-plan/alternatives`, `/api/promos/*`, `/api/saved-items/deals*` | `SavedCart`, `BankPromo`, `ProductCatalog`, `DealCache`, `PriceCache` |
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

## 5.5 Ahorra (comparador de compras)
- Construccion de lista (manual + catalogo + custom).
- Busqueda por multiples supermercados.
- Ajuste de cantidades por item.
- Overrides por item: swap, removido, ya agregado, sin stock.
- Recomendacion de reemplazos scoped por producto.
- Guardado y refresh de carritos guardados.
- Tab de promos bancarias por supermercado.

## 5.6 Descubrir y Cocina
- Descubrir: sugerencias de actividades/lugares por ciudad con filtros.
- Pipeline de eventos con refresh on-demand y estado de pipeline.
- Cocina: recetas asistidas por IA con entrada textual y guardado de recetas.
- Guardado transversal de items para reutilizacion.

## 5.7 Notificaciones y briefing
- Dropdown de notificaciones con polling y estado leido/no leido.
- Banner para opt-in de push web.
- Briefing diario como resumen operativo del hogar.

## 6. Capacidades IA reales (por modulo)

### Planificacion
- generacion de planes y razonamiento de asignacion;
- previsualizacion y aplicacion del plan.

### Finanzas y compras
- insights de gasto y recomendaciones accionables;
- sugerencias y reemplazos en comparador de compras.

### Descubrir y cocina
- sugerencias de actividades cuando no hay datos frescos;
- generacion de recetas.

### Regla de disponibilidad
- IA depende de provider configurado (DeepSeek o Gemini);
- modulo se degrada de manera explicita cuando IA no esta habilitada.

## 7. Arquitectura funcional actual

### App y backend
- Monolito Next.js App Router (UI + BFF + jobs en el mismo repo).
- APIs como route handlers bajo `src/app/api/*`.
- Prisma como capa de acceso a PostgreSQL.

### Estado y consumo en cliente
- React Query para datos dinamicos.
- Wrappers de API con manejo centralizado de errores y 401.

### Autenticacion y contexto
- NextAuth + Prisma Adapter.
- Middleware para proteger rutas privadas.
- Resolucion de miembro/hogar activo en server side.

## 8. Integraciones externas vigentes

- Google OAuth (auth principal).
- Gmail OAuth + scanner/extractor para servicios/facturas.
- Tavily y Serper para descubrimiento web.
- Firecrawl para scraping/extraccion.
- Integraciones supermarket (VTEX y proveedores locales).
- Resend para email.
- Web Push (VAPID) para notificaciones.
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

Jobs y pipelines relevantes:
- plan semanal automatizado;
- insights semanales;
- proceso recurrente de servicios/facturas;
- ingesta de eventos;
- escaneo de Gmail;
- refresh de promos y refresh de eventos on-demand.

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
- descubrir/cocina aportan valor complementario sin romper flujo principal;
- el sistema mantiene aislamiento por hogar y experiencia consistente por tipo de miembro.

## 14. Fuente de verdad documental

Este PRD reemplaza descripciones historicas que no reflejan implementacion vigente.
Cuando haya discrepancia entre documentos, prevalece:

1. comportamiento observable en rutas y componentes actuales;
2. APIs y validaciones en `src/app/api/*` y `src/lib/validations/*`;
3. modelo Prisma en `prisma/schema.prisma`.
