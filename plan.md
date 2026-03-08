# Plan: Parity gaps + Navbar redesign

## Finding: The 7 "missing" web pages already exist

All 7 pages I identified as gaps are actually already fully implemented as untracked files:

| Page | Route | Component | Linked from |
|------|-------|-----------|-------------|
| Progreso | `/progress` | `progress-view.tsx` | Dashboard week card |
| Notificaciones | `/notifications` | `notifications-page.tsx` | Notifications dropdown |
| Servicios | `/services` | `services-page.tsx` | Expenses view header |
| Insights gastos | `/expense-insights` | `expense-insights-view.tsx` | Expenses view header |
| Sugerir tareas | `/suggest-tasks` | `suggest-tasks-view.tsx` | My tasks page |
| Ofertas | `/grocery-deals` | `grocery-deals-view.tsx` | Compras page |
| Fondo Común | `/fund` | `fund-page.tsx` | Fund is embedded inline in expenses view; standalone page exists at `/fund` |

**No hay código nuevo que escribir para paridad.** Las páginas existen, están completas, y tienen links desde sus secciones padre.

## Reverse gaps (Web tiene, Mobile no tiene)

- **Historial de planes** (`/plans`): Web tiene una vista de historial de planes semanales pasados. Mobile no tiene esta pantalla pero no es crítico porque mobile accede a plan actual desde tasks.
- **Roulette**: Web tiene `/roulette`, mobile tiene `/rotations` que es la misma feature con distinto nombre.

**Estos gaps son menores y no requieren acción inmediata.**

## Propuesta: Navbar redesign (el tema original)

Dado que todos los features ya existen, el problema real es **descubribilidad**. Tu propuesta original de reorganizar la navbar lo resuelve directamente.

### Propuesta concreta

**Web mobile navbar** (`app-nav-mobile.tsx`) — 5 items → 5 items con overflow:

```
[Habita]  [Planificá]  [Registrá]  [Ahorrá]  [⋯ Más]
```

- **Habita** (Home icon) → `/dashboard`
- **Planificá** → `/my-tasks`
- **Registrá** → `/balance`
- **Ahorrá** → `/compras`
- **Más** (MoreHorizontal icon) → abre un bottom sheet/popover con:
  - Descubrí → `/descubrir`
  - Cociná → `/cocina`

**Web desktop navbar** (`app-nav.tsx`) — sin cambios, los 5 tabs siguen visibles porque hay espacio.

**Mobile native tab bar** (`_layout.tsx`) — misma estructura:

```
[Habita]  [Planificá]  [Registrá]  [Ahorrá]  [⋯ Más]
```

- Mismos 4 tabs principales + "Más" que abre un bottom sheet nativo
- El bottom sheet de "Más" lista: Descubrí, Cociná (y opcionalmente links a progress, services, etc.)

### Implementación

#### Paso 1: Web mobile navbar con "Más"
- Modificar `app-nav-mobile.tsx`:
  - Reemplazar los 5 items por: Home, Planificá, Registrá, Ahorrá, Más
  - "Más" abre un popover/dropdown con Descubrí y Cociná
  - Home usa icono `Home` de lucide y va a `/dashboard`

#### Paso 2: Mobile native tab bar con "Más"
- Modificar `_layout.tsx`:
  - Cambiar `TAB_CONFIG` a 4 tabs: tasks, balance, compras + "more"
  - "more" tab no navega a una pantalla sino que abre un bottom sheet (Modal o custom sheet)
  - El bottom sheet lista: Descubrí, Cociná
  - Agregar icono Habita/Home como primer tab que navega a dashboard

#### Paso 3: Verificación
- Typecheck
- Verificar que todas las rutas siguen funcionando
- Verificar que el "Más" sheet se abre/cierra correctamente

### Consideraciones

- El bottom sheet de "Más" podría incluir links directos a subpáginas populares (Progress, Servicios, etc.) para mejorar la descubribilidad
- No tocar desktop navbar — tiene espacio de sobra para los 5 items

### Archivos a modificar
1. `src/components/features/app-nav-mobile.tsx` — web mobile navbar
2. `apps/mobile/app/(app)/_layout.tsx` — mobile native tab bar
