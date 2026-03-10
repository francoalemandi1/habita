---
paths:
  - "apps/mobile/**/*.tsx"
  - "apps/mobile/**/*.ts"
---

# Reglas para código mobile (Expo/React Native)

- Colores: SIEMPRE `useThemeColors()`. NUNCA hex hardcodeados
- Estilos: `createStyles(colors)` factory al final del archivo, envuelta en `useMemo`
- Layout: `SafeAreaView` como wrapper, `ScreenHeader` arriba del scroll
- Listas: `ScrollView` con `.map()`. NUNCA `FlatList` dentro de `ScrollView` (VirtualizedList error)
- Refresh: `ScrollView` con `RefreshControl` (tintColor: `colors.primary`)
- Modales: usar `BottomSheet` de `@/components/ui/bottom-sheet`
- Empty states: `EmptyState` de `@/components/ui/empty-state`
- API: usar `mobileApi` de `@/lib/api` (auto-inyecta Bearer token + household header)
- Auth context: `useMobileAuth()` para household/member info
- Animaciones: `useFadeIn`, `usePressAnimation`, `useStaggerItem`
- Storage keys: prefijo `habita_mobile_` para tokens/config, `habita_first_visit:` para guides
- Textos en español argentino
- Typecheck: `pnpm typecheck:all` (incluye mobile)
