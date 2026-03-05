# Skill: Nueva pantalla mobile

## Cuándo usar
Cuando se agrega una nueva pantalla en `apps/mobile/app/`.

## Estructura base

### 1. Crear archivo de pantalla
`apps/mobile/app/(app)/<nombre>.tsx`:

```typescript
import { useMemo, useState } from "react";
import { ScrollView, RefreshControl, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { ScreenHeader } from "@/components/features/screen-header";
import { fontFamily, spacing, radius } from "@/theme";

import type { ThemeColors } from "@/theme";

export default function NombreScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // refetch queries
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Contenido */}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: 100 },
  });
}
```

### 2. Registrar en layout (si es necesario)
Si es pantalla de tab: agregar en `apps/mobile/app/(app)/_layout.tsx` → `TAB_CONFIG`.
Si es pantalla oculta (push): agregar en el `<Stack.Screen>` con `href: null`.

### 3. Checklist de patrones

- [ ] `useThemeColors()` — nunca hex hardcodeados
- [ ] `createStyles(colors)` con `useMemo` — factory function al final del archivo
- [ ] `SafeAreaView` como wrapper
- [ ] `ScreenHeader` arriba del scroll
- [ ] `ScrollView` con `RefreshControl` (no `FlatList` si hay scroll padre)
- [ ] Listas: `.map()` con `ScrollView nestedScrollEnabled`, NO `FlatList`
- [ ] Textos en español argentino
- [ ] Si usa datos: React Query hook (ej. `useMyAssignments()`)
- [ ] Si usa auth: `useMobileAuth()` para household context
- [ ] Animaciones: `useFadeIn`, `usePressAnimation`, `useStaggerItem`
- [ ] `pnpm typecheck:all` al finalizar

### 4. Bottom sheets
Para modales, usar `BottomSheet` de `@/components/ui/bottom-sheet`:
```typescript
<BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title="Título">
  {/* contenido */}
</BottomSheet>
```

### 5. Empty states
```typescript
import { EmptyState } from "@/components/ui/empty-state";

<EmptyState
  icon={<Icon size={48} color={colors.mutedForeground} />}
  title="Sin datos"
  subtitle="Descripción"
  steps={[{ label: "Paso 1" }, { label: "Paso 2" }]}
  actionLabel="Acción"
  onAction={() => {}}
/>
```
