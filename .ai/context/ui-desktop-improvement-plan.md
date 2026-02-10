# Plan de mejora UI Desktop

Solo aplica a viewport **desktop** (md y superior). Objetivo: unificar contenedores, paddings, márgenes y centrado para una experiencia consistente.

---

## 1. Estado actual y problemas

### 1.1 Header (layout principal)

- **Ubicación:** `src/app/(app)/(main)/layout.tsx`
- **Actual:** `container` + `px-4` (sin `max-width` en `.container` en globals.css).
- **Problemas:**
  - El header ocupa todo el ancho; el contenido interno queda centrado por `margin-inline: auto` pero sin límite, por lo que en pantallas muy anchas el contenido no se alinea con el contenido de las páginas (que sí tienen `max-w-4xl` / `max-w-6xl`).
  - En desktop no hay más padding horizontal que `px-4` (16px); puede quedar poco aire respecto al contenido de la página.

### 1.2 Contenedores de página

| Página        | Wrapper actual                          | max-width desktop | Padding horizontal desktop |
|---------------|-----------------------------------------|-------------------|----------------------------|
| Dashboard     | `container max-w-6xl px-4 py-6 sm:py-8 md:px-8` | 6xl               | 32px (md:px-8) ✓           |
| My-tasks      | `mx-auto max-w-md ... md:max-w-2xl md:px-6`    | 2xl               | 24px (md:px-6)             |
| Profile       | `mx-auto max-w-md px-4 py-6 sm:py-8`          | md (448px)        | 16px (px-4)                |
| Plan          | `container max-w-4xl px-4 py-6 sm:py-8`        | 4xl               | 16px                       |
| Plan history  | `container max-w-4xl px-4 py-6 sm:py-8`        | 4xl               | 16px                       |
| Plans         | `container max-w-4xl px-4 py-6 sm:py-8`        | 4xl               | 16px                       |
| Tasks         | `container max-w-4xl px-4 py-6 sm:py-8`        | 4xl               | 16px                       |
| Rewards       | `container max-w-4xl px-4 py-6 sm:py-8 md:px-8`| 4xl               | 32px ✓                     |
| Preferences   | `container max-w-4xl px-4 py-6 sm:py-8`        | 4xl               | 16px                       |
| Achievements  | `container max-w-4xl px-4 py-6 sm:py-8`        | 4xl               | 16px                       |
| Rotations     | `container max-w-4xl px-4 py-6 sm:py-8`        | 4xl               | 16px                       |
| Competitions  | `container max-w-4xl px-4 py-6 sm:py-8`        | 4xl               | 16px                       |
| Kids          | `container max-w-4xl px-4 py-6 sm:py-8` (interno) | 4xl            | 16px                       |
| Parental      | `container max-w-4xl px-4 py-6 sm:py-8`        | 4xl               | 16px                       |

**Problemas:**

1. **Ancho de contenido desigual:** Profile queda en `max-w-md` en desktop (muy estrecho). My-tasks usa `max-w-2xl` en desktop; el resto usa `max-w-4xl` o `max-w-6xl`. No hay criterio único.
2. **Padding horizontal en desktop:** Solo Dashboard y Rewards usan `md:px-8` (32px). El resto se queda en `px-4` (16px), lo que en desktop suele quedar corto.
3. **Patrón de wrapper distinto:** Unas páginas usan `container` + `max-w-*`, otras `mx-auto` + `max-w-*` sin `container`. Funcionalmente similar pero inconsistente.
4. **Contenido no alineado con el header:** Si el header no tiene el mismo criterio de ancho máximo, la barra y el contenido no “cuadran” visualmente en desktop.

### 1.3 Páginas con estructura especial

- **Kids:** Tiene un wrapper exterior `min-h-screen bg-gradient-to-b ...` y dentro `container max-w-4xl px-4 py-6 sm:py-8`. El contenedor interno está bien; el exterior en desktop podría necesitar que el gradiente o el fondo respeten el mismo ancho lógico si se decide que el contenido no sea full-bleed.
- **Profile:** Contenido muy estrecho en desktop (`max-w-md`); la tarjeta de puntaje y el resto quedan centrados pero con mucho espacio vacío a los lados.

### 1.4 Componentes compartidos

- **Cards / secciones:** Varios usan `CardContent` con `py-4`, `py-3`, `py-8` sin criterio único. En listas (por ejemplo `plans/page`, `plan/history`) los bordes y paddings (`px-4`, `sm:px-5`, `border-t`) están bien; conviene revisar que en desktop no haya bloques que se vean desalineados con el contenedor de la página.
- **Formularios y listas:** Algunos bloques usan `px-3 py-2`, `px-4 py-3`, etc. Sin regla global; el riesgo en desktop es que algunos módulos se vean “apretados” o desalineados respecto al contenedor estándar.
- **Empty states / mensajes centrados:** Varios usan `text-center` y `mx-auto` para iconos; en general correcto. Revisar que en layouts de dos columnas en desktop el centrado siga siendo claro.

### 1.5 Utilidad `.container` (globals.css)

- Solo define `margin-inline: auto`; no hay `max-width` ni breakpoints. En Tailwind v4 el `container` no tiene por defecto `max-width`, por lo que cada página lo combina con `max-w-*`. Para desktop, tener un único “contenedor de lectura” (por ejemplo con `max-width` en CSS o con una clase compartida) ayudaría a alinear header y contenido.

---

## 2. Estándar propuesto (solo desktop)

### 2.1 Ancho máximo del contenido

- **Páginas “anchas” (dashboard):** `max-w-6xl` (72rem).
- **Páginas “normales” (listas, formularios, detalle):** `max-w-4xl` (56rem).
- **Páginas “estrechas” por diseño (p. ej. formularios simples):** si se desea mantener una columna más estrecha, usar como mínimo `max-w-2xl` en desktop, no `max-w-md`, para no dejar demasiado espacio vacío.

Propuesta concreta:

- **Profile:** de `max-w-md` a `max-w-2xl` en desktop (p. ej. `md:max-w-2xl`), manteniendo centrado.
- **My-tasks:** ya usa `md:max-w-2xl`; unificar padding con el resto (ver abajo).

### 2.2 Padding horizontal en desktop

- **Estándar:** `md:px-8` (32px) para el contenedor principal de cada página.
- Aplicar a todas las páginas que hoy solo tienen `px-4` en desktop: Plan, Plan history, Plans, Tasks, Preferences, Achievements, Rotations, Competitions, Kids (contenedor interno), Parental.

### 2.3 Padding vertical en desktop

- Mantener `py-6 sm:py-8` como está (ya consistente).
- Opcional: en desktop usar `md:py-10` si se quiere más aire arriba/abajo; solo si se valida en diseño.

### 2.4 Header

- Opción A (recomendada): Hacer que el contenido del header comparta el mismo ancho máximo que el contenido de la página. Por ejemplo:
  - Misma clase de contenedor que las páginas “normales”: `container max-w-4xl` (o un contenedor “site”) y `px-4 md:px-8`.
  - Así la barra superior y el contenido quedan alineados en desktop.
- Opción B: Dejar el header a ancho completo y solo aumentar padding horizontal en desktop, p. ej. `md:px-6` o `md:px-8` dentro del `container` actual.

### 2.5 Patrón único de wrapper de página

- Usar siempre el mismo patrón para el contenedor principal:
  - `className="container max-w-<tamaño> px-4 py-6 sm:py-8 md:px-8"` (y opcionalmente `mx-auto` si no se usa `container`).
- Donde hoy se usa solo `mx-auto max-w-*`, reemplazar por `container max-w-*` + mismo padding para unificar con el resto y con el header si se aplica 2.4.

---

## 3. Checklist de implementación (solo desktop)

### 3.1 Layout y header

- [ ] **layout (main):** Añadir al header `max-w-4xl` (o el contenedor estándar) y `md:px-8` para alinear y dar aire en desktop.
- [ ] **globals.css (opcional):** Si se quiere un “site container” único, definir una clase (p. ej. `.page-container`) con `max-width` y usarla en header + páginas.

### 3.2 Páginas – ancho y padding

- [ ] **dashboard:** Ya tiene `max-w-6xl` y `md:px-8`. Revisar que el header (si usa max-w-4xl) o la decisión de “dashboard más ancho” quede documentada.
- [ ] **my-tasks:** Añadir `md:px-8` (sustituir o unificar con `md:px-6`). Opcional: cambiar a `container` + `max-w-2xl` para consistencia.
- [ ] **profile:** Añadir `md:max-w-2xl md:px-8` (y quitar o ampliar `max-w-md` solo móvil si hace falta).
- [ ] **plan, plan/history, plans, tasks:** Añadir `md:px-8` al wrapper.
- [ ] **rewards:** Ya tiene `md:px-8`. Sin cambios de padding.
- [ ] **preferences, achievements, rotations, competitions:** Añadir `md:px-8` al wrapper.
- [ ] **kids:** Al contenedor interno (`container max-w-4xl ...`) añadir `md:px-8`.
- [ ] **parental:** Añadir `md:px-8` al wrapper.

### 3.3 Componentes (revisión en desktop)

- [ ] **Cards en listas (plans, history, etc.):** Verificar que los `px-4 sm:px-5` y `border-t` no generen desalineación con el nuevo `md:px-8` del contenedor.
- [ ] **ProfileSettings / formularios:** Revisar que bloques con `px-3 py-2` o `px-4 py-3` no queden visualmente “flotando” en desktop; si hace falta, alinear con un mismo padding lateral (p. ej. que el formulario respete el mismo margen que el título de la página).
- [ ] **Empty states (MyAssignmentsList, Leaderboard, etc.):** Comprobar en viewport md+ que los `rounded-[24px]`, `px-6 py-10`, etc. se vean centrados y proporcionados dentro del contenedor.

### 3.4 Verificación final

- [ ] Recorrer en viewport **solo desktop** (md y lg): Dashboard, My-tasks, Profile, Plan, Plans, Tasks, Rewards, Preferences, Achievements, Rotations, Competitions, Kids, Parental.
- [ ] Comprobar: mismo “margen” visual izquierdo/derecho (vía padding), títulos y contenido alineados con el header, y que no haya bloques que se salgan o queden desalineados.

---

## 4. Resumen de cambios por archivo (referencia)

| Archivo | Cambio propuesto (solo desktop) |
|---------|---------------------------------|
| `(main)/layout.tsx` | Header: añadir `max-w-4xl` (o clase común) y `md:px-8`. |
| `dashboard/page.tsx` | Ninguno (ya ok). |
| `my-tasks/page.tsx` | `md:px-8` (unificar con resto); opcional `container` + `max-w-2xl`. |
| `profile/page.tsx` | `md:max-w-2xl md:px-8` y ajustar max-width en móvil si aplica. |
| `plan/plan-page-client.tsx` | Añadir `md:px-8` al wrapper. |
| `plan/history/page.tsx` | Añadir `md:px-8` al wrapper. |
| `plans/page.tsx` | Añadir `md:px-8` al wrapper. |
| `tasks/page.tsx` | Añadir `md:px-8` al wrapper. |
| `rewards/page.tsx` | Sin cambio. |
| `preferences/page.tsx` | Añadir `md:px-8` al wrapper. |
| `achievements/page.tsx` | Añadir `md:px-8` al wrapper. |
| `rotations/page.tsx` | Añadir `md:px-8` al wrapper. |
| `competitions/page.tsx` | Añadir `md:px-8` al wrapper. |
| `kids/page.tsx` | Al div interno `container max-w-4xl ...` añadir `md:px-8`. |
| `parental/page.tsx` | Añadir `md:px-8` al wrapper. |

---

## 5. Criterios de “hecho” (solo desktop)

- Todas las páginas principales usan el mismo padding horizontal en desktop (`md:px-8`).
- El header comparte el mismo ancho máximo y/o padding que el contenido (o queda definido y documentado si se mantiene full width).
- Profile y My-tasks no quedan con un ancho excesivamente estrecho en desktop (mínimo `max-w-2xl` donde corresponda).
- Una pasada visual en viewport md/lg no muestra contenido desalineado ni márgenes desiguales entre páginas.

Este plan se puede usar como checklist en `.ai/context/task-breakdown.md` o como referencia en issues/PRs; las modificaciones son solo clases Tailwind en contenedores, sin tocar lógica ni móvil.

---

## 6. Mejoras adicionales Desktop (Fase 2)

Después de aplicar la Fase 1 (contenedores y padding), se pueden abordar estas mejoras **solo en viewport desktop**:

### 6.1 Dashboard: layout en dos columnas (lg+)

- **Problema:** El dashboard es una sola columna larga (banners, briefing, checklist, plan, stats, achievements). En desktop hay espacio para aprovechar.
- **Propuesta:** En `lg:` usar un grid de 2 columnas: columna principal (briefing + checklist + plan status + achievements) y columna secundaria (stats cards + posible sidebar con resumen o CTA). El skeleton (`loading-skeletons.tsx`) ya sugiere `lg:grid-cols-3` con 2+1; se puede inspirar en eso (por ejemplo: contenido principal 2/3, sidebar 1/3 con stats + logros recientes).
- **Archivos:** `src/app/(app)/(main)/dashboard/page.tsx`, opcionalmente `DashboardSkeleton` para que coincida.

### 6.2 Navegación desktop: indicador de página activa

- **Problema:** En `AppNav` los links no indican la ruta actual; el usuario no ve “dónde está” a simple vista.
- **Propuesta:** Usar `usePathname()` y aplicar una clase distinta al item activo (p. ej. `bg-primary/10 text-primary` o `font-semibold text-foreground`).
- **Archivos:** `src/components/features/app-nav.tsx`.

### 6.3 Diálogos: ancho en desktop

- **Problema:** `DialogContent` tiene `max-w-lg` fijo. Algunos contenidos (lista de tareas, plan preview, catálogo) podrían beneficiarse de `md:max-w-xl` o `md:max-w-2xl` cuando se pasen esas clases desde el uso.
- **Propuesta:** No cambiar el componente base; en los usos que muestren mucho contenido (p. ej. `TaskCatalogPicker` con `sm:max-w-lg`, `PlanStatusCard` con `sm:max-w-md`) valorar añadir `md:max-w-xl` o `md:max-w-2xl` en desktop para mejor lectura.
- **Archivos:** Usos de `DialogContent` en `task-catalog-picker.tsx`, `plan-status-card.tsx`, `notifications-dropdown.tsx`, etc.

### 6.4 Dropdown de notificaciones: ancho y posición

- **Problema:** El panel de notificaciones puede quedar estrecho o corto en desktop.
- **Propuesta:** Añadir `md:min-w-[380px]` o `md:max-w-md` al contenido del dropdown para que en desktop sea más legible; asegurar que el anclaje (position) no se salga del viewport en pantallas grandes.
- **Archivos:** `src/components/features/notifications-dropdown.tsx`.

### 6.5 Perfil: secciones en grid (md+)

- **Problema:** En profile todo va en una columna (nombre, hogar, ubicación, notificaciones, WhatsApp, miembros). En desktop se podría agrupar en 2 columnas para reducir scroll.
- **Propuesta:** En `md:` envolver bloques lógicos (p. ej. “Cuenta” + “Hogar” en una fila; “Notificaciones” + “WhatsApp” en otra) con `grid grid-cols-1 md:grid-cols-2 gap-6` o similar.
- **Archivos:** `src/app/(app)/(main)/profile/page.tsx` (estructura) y/o `src/components/features/profile-settings.tsx`.

### 6.6 Lista de planes (Plans): cards más densas en desktop

- **Problema:** Las cards de planes son anchas; en pantallas grandes podrían mostrarse 2 columnas en `lg:` para ver más planes sin scroll.
- **Propuesta:** En la lista de planes (activos + pasados), usar `grid grid-cols-1 lg:grid-cols-2 gap-4` para que en desktop se vean dos cards por fila.
- **Archivos:** `src/app/(app)/(main)/plans/page.tsx`.

### 6.7 Recompensas: grid de “recompensas anteriores”

- **Problema:** La sección “Recompensas anteriores” ya usa `sm:grid-cols-2 md:grid-cols-3`; en pantallas muy anchas (xl) podría permitir 4 columnas si el contenido lo permite.
- **Propuesta:** Opcional `xl:grid-cols-4` en esa grid para aprovechar espacio en monitores grandes.
- **Archivos:** `src/app/(app)/(main)/rewards/page.tsx`.

### 6.8 Títulos de página: consistencia

- **Problema:** Algunas páginas usan `text-2xl sm:text-3xl`, otras `text-3xl` fijo, otras `text-xl sm:text-3xl`; el ícono del título a veces `h-6 w-6`, otras `h-7 w-7`, `h-8 w-8`.
- **Propuesta:** Definir un estándar (por ejemplo: título principal `text-2xl font-bold tracking-tight sm:text-3xl`, subtítulo `mt-1 text-sm text-muted-foreground`; ícono `h-6 w-6` o `h-7 w-7`) y aplicarlo en todas las páginas de la app para que se sientan consistentes en desktop.
- **Archivos:** Todas las páginas en `(main)/` que tengan un `<h1>` principal.

### 6.9 Espaciado entre secciones (mb-6 vs mb-8)

- **Problema:** Mezcla de `mb-6` y `mb-8` entre bloques sin regla clara.
- **Propuesta:** Convención simple: `mb-6` entre cards/bloques relacionados, `mb-8` entre secciones mayores. Revisar dashboard, profile, rewards, preferences para unificar.
- **Archivos:** Páginas principales que usen `mb-6` / `mb-8`.

### 6.10 Resumen priorizado (Fase 2)

| Prioridad | Mejora | Impacto | Esfuerzo |
|-----------|--------|---------|----------|
| Alta | 6.2 Navegación: indicador de página activa | Claridad de dónde está el usuario | Bajo |
| Alta | 6.1 Dashboard: dos columnas en lg | Mejor uso del espacio, menos scroll | Medio |
| Media | 6.4 Notificaciones: ancho dropdown desktop | Legibilidad | Bajo |
| Media | 6.6 Plans: dos columnas en lg | Ver más planes de un vistazo | Bajo |
| Media | 6.8 Títulos consistentes | Consistencia visual | Bajo |
| Baja | 6.3 Diálogos más anchos donde haga falta | Mejor lectura en modales con mucho contenido | Bajo |
| Baja | 6.5 Perfil: grid 2 columnas | Menos scroll en pantallas grandes | Medio |
| Baja | 6.7 Recompensas: 4 columnas en xl | Aprovechar monitores muy anchos | Muy bajo |
| Baja | 6.9 Espaciado entre secciones | Pulido visual | Bajo |
