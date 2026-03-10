# Skill: Nueva página web

## Cuándo usar
Cuando se agrega una nueva página en `src/app/`.

## Estructura

### 1. Página server component (data fetching)
`src/app/(app)/(main)/<nombre>/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { spacing } from "@/lib/design-tokens";
import { MiIcon } from "lucide-react";

export default async function NombrePage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const data = await prisma.model.findMany({
    where: { householdId: member.householdId },
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <PageHeader
        title="Título"
        subtitle="Subtítulo"
        icon={MiIcon}
        actions={<Button>Acción</Button>}
      />

      <div className={spacing.sectionGap}>
        <NombreClient data={serializedData} />
      </div>
    </div>
  );
}
```

### 2. Client component (interactividad)
`src/components/features/<nombre>-client.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NombreClientProps {
  data: SerializedData[];
}

export function NombreClient({ data }: NombreClientProps) {
  // State, mutations, etc.
  return (
    <Card>
      <CardContent>
        {/* contenido */}
      </CardContent>
    </Card>
  );
}
```

### 3. Agregar a navegación
- Desktop: `src/components/features/app-nav.tsx`
- Mobile: `src/components/features/app-nav-mobile.tsx`

### 4. Checklist

- [ ] Server component para data fetching, client para interactividad
- [ ] `getCurrentMember()` + redirect si no autenticado
- [ ] Filtrar por `householdId` en queries
- [ ] Serializar `Date` → `.toISOString()` y `Decimal` → `.toNumber()` antes de pasar a client components
- [ ] Design tokens de `@/lib/design-tokens` para spacing/layout
- [ ] Tailwind classes (dark mode automático via CSS variables)
- [ ] Loading states: skeleton o `loading.tsx` en la carpeta
- [ ] Textos en español argentino
- [ ] `pnpm typecheck` al finalizar

### 5. Empty states
```typescript
import { EmptyState } from "@/components/ui/empty-state";
import { MiIcon } from "lucide-react";

// Con ícono Lucide
<EmptyState icon={MiIcon} title="Sin datos" description="Descripción de qué hacer">
  <Button>Acción</Button>
</EmptyState>

// Con emoji
<EmptyState emoji="🎉" title="Sin datos" description="..." />
```

### 6. Loading state
Crear `src/app/(app)/(main)/<nombre>/loading.tsx` con skeleton que refleje el layout de la página.

### 7. Si necesita React Query (client-side fetching)
Crear hook en `src/hooks/use-<feature>.ts`:
```typescript
"use client";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
```
Query keys compartidos con mobile → `packages/contracts/src/query-keys.ts`.
Query keys web-only → `src/lib/query-keys.ts`.
