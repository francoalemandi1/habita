---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/*.tsx"
---

# Reglas para componentes web

- Server components para data fetching, client components (`"use client"`) para interactividad
- Headers de página: usar `PageHeader` de `@/components/ui/page-header`
- Empty states: usar `EmptyState` de `@/components/ui/empty-state`
- Spacing/layout: tokens de `@/lib/design-tokens` (`spacing.pageHeader`, `spacing.sectionGap`)
- Dark mode: automático via CSS variables (`.dark` en globals.css). NO estilos condicionales manuales
- Serializar `Decimal` → `.toNumber()` y `Date` → `.toISOString()` antes de pasar a client components
- Textos en español argentino
