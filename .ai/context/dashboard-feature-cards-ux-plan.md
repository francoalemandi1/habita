# Plan: Efectos en cards de Genera tu plan, Ruleta y Calendario

## Problema actual

Las tres áreas comparten efectos muy similares y generan confusión:

| Elemento | Efectos actuales | Ubicación |
|----------|------------------|------------|
| **Genera tu plan** (PlanStatusCard) | `feature-card-shimmer` + `animate-glow-breathe` (primary) | Bloque full-width arriba |
| **Ruleta de tareas** | `feature-card-shimmer` + `animate-glow-breathe` (violet) + hover scale 1.02 + shadow | Card en grid 2 cols |
| **Calendario semanal** | `feature-card-shimmer` + `animate-glow-breathe` (sky, delay 1.5s) + mismo hover | Card en grid 2 cols |

- **Shimmer**: barrido de luz idéntico en los tres (mismo gradiente, 6s).
- **Glow-breathe**: sombra que pulsa igual en los tres (solo cambia color y delay).
- **Hover**: Ruleta y Calendario comparten exactamente scale 1.02, shadow-lg, chevron translate.

Resultado: se percibe como “todo brilla y late igual”; no hay jerarquía ni personalidad por card.

---

## Principios UX y estética

1. **Jerarquía clara**: La CTA principal (Plan) debe leerse como acción prioritaria; las de acceso rápido (Ruleta, Calendario) como secundarias pero distinguibles entre sí.
2. **Un efecto distintivo por card**: Evitar que las tres usen shimmer + glow a la vez. Asignar a cada una un rol visual único.
3. **Menos movimiento constante**: Reducir animaciones “siempre activas” para no competir con el contenido y respetar `prefers-reduced-motion`.
4. **Hover como feedback**: Usar hover para refuerzo de interactividad, no como duplicado del efecto de reposo.

---

## Propuesta por componente

### 1. Genera tu plan (PlanStatusCard — estado “no plan”)

- **Rol**: CTA principal, no decorativa. Debe ser legible y directa.
- **Cambios**:
  - **Quitar** `feature-card-shimmer` y `animate-glow-breathe`.
  - Mantener fondo suave (`bg-primary/5`), borde discreto si se desea.
  - Hover: solo transición suave de borde o sombra (sin scale), para no competir con el botón “Generar”.
- **Resultado**: Card estática, clara; el botón lleva el peso visual.

### 2. Ruleta de tareas

- **Rol**: Acceso a una feature “juguetona” (azar, suerte). Puede tener un toque más dinámico.
- **Cambios**:
  - **Quitar** `feature-card-shimmer` (evitar barrido igual que Plan/Calendario).
  - **Quitar** `animate-glow-breathe` en reposo (evitar pulso constante).
  - **Mantener** paleta violet/fuchsia y estructura (icono, título, subtítulo, chevron).
  - **Hover**: efecto claro y distintivo — p. ej. `hover:scale-[1.02]`, `hover:shadow-lg`, `hover:border-violet-400/50`, y chevron `group-hover:translate-x-0.5`. Opcional: ligero refuerzo del gradiente del icono en hover.
- **Resultado**: Card tranquila en reposo; al pasar el mouse se siente “clickeable” y con personalidad violeta.

### 3. Calendario semanal

- **Rol**: Acceso a organización/vista de la semana. Debe transmitir orden y calma.
- **Cambios**:
  - **Quitar** `feature-card-shimmer` y `animate-glow-breathe`.
  - Mantener paleta sky/teal y estructura actual.
  - **Hover**: más sutil que Ruleta — p. ej. `hover:shadow-md`, `hover:border-sky-400/40`, sin scale o scale muy leve (1.01). Chevron con el mismo `group-hover:translate-x-0.5` para consistencia de “es un link”.
- **Resultado**: Card estática y ordenada; hover suave, sin sensación de “juego”.

---

## Resumen de efectos después del plan

| Elemento        | Reposo                    | Hover                                      |
|-----------------|---------------------------|--------------------------------------------|
| Genera tu plan  | Estático, sin shimmer/glow | Borde/sombra suave (opcional)             |
| Ruleta          | Estático, sin shimmer/glow | Scale 1.02, shadow-lg, borde, chevron     |
| Calendario      | Estático, sin shimmer/glow | Shadow-md, borde suave, chevron; scale 1.01 opcional |

---

## Accesibilidad

- El proyecto ya tiene en `globals.css` un `@media (prefers-reduced-motion: reduce)` que reduce duración e iteraciones de animaciones. Los cambios mantienen ese respeto.
- Al quitar animaciones constantes (shimmer, glow-breathe), se reduce carga visual y movimiento innecesario para todos los usuarios.

---

## Implementación técnica

1. **PlanStatusCard** (`src/components/features/plan-status-card.tsx`): En el bloque “no plan” (y en cualquier otro que use `feature-card-shimmer`/`animate-glow-breathe`), eliminar esas clases y el `style` de `--glow-color`. Ajustar hover si se añade en el contenedor (p. ej. solo en el `Link` o en el wrapper).
2. **Dashboard** (`src/app/(app)/(main)/dashboard/page.tsx`): En las cards de Ruleta y Calendario, quitar `feature-card-shimmer`, `animate-glow-breathe` y el `style` con `--glow-color`/`animationDelay`. Ajustar clases de hover: Ruleta con scale + shadow + borde; Calendario con shadow/borde más suaves.
3. **CSS**: Las clases `.feature-card-shimmer` y `.animate-glow-breathe` pueden quedar definidas en `globals.css` por si se reutilizan en otro lugar; si no se usan en ningún otro componente, opcionalmente eliminarlas en una segunda pasada para mantener el código limpio.

---

## Orden sugerido de tareas

1. Quitar shimmer y glow en PlanStatusCard (estado “no plan”).
2. Quitar shimmer y glow en cards Ruleta y Calendario; definir hover diferenciado (Ruleta más marcado, Calendario más sutil).
3. Revisar en navegador y con `prefers-reduced-motion` que no queden efectos molestos.
4. (Opcional) Eliminar o marcar como deprecated las utilidades de shimmer/glow en CSS si ya no se usan.
