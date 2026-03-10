# Mobile Providers

Providers de React Context para la app mobile. Orden y comportamiento críticos.

## MobileAuthProvider (`mobile-auth-provider.tsx`)

### Hydration order
1. Lee tokens de AsyncStorage
2. Si hay accessToken → fetch `/api/auth/me`
3. Si no hay householdId almacenado → fallback al primer household del user
4. Programa refresh proactivo DESPUÉS del fetch exitoso de `/api/auth/me`

Si `/api/auth/me` falla, NO se programa refresh timer → tokens pueden expirar silenciosamente.

### Auth-expired event
Cuando se recibe `auth-expired` del runtime: limpia estado (me=null, household=null). NO hace navegación imperativa — el `<Redirect>` en `(app)/_layout.tsx` se encarga.

### Logout
Best-effort: intenta notificar al server, pero si falla, limpia estado local igual. Orden: server call → clear local state. No invertir.

## ThemeProvider (`theme-provider.tsx`)

### Flash prevention
Retorna `null` hasta que la preferencia de tema se carga de AsyncStorage (`isLoaded`). Sin esto, la app muestra un flash del tema del sistema antes de aplicar la preferencia del usuario.

### Memoización
`colors` y `typography` están memoizados por `resolvedMode`. NO inlinear `getThemeColors()` o `createTypography()` — causa re-renders masivos y rompe memoización downstream.

### Modo sistema
Si `mode === "system"`, se resuelve con `useColorScheme()`. Cambios del OS (toggle dark mode) propagan automáticamente.

## QueryProvider (`query-provider.tsx`)

### Defaults mobile-specific
- `retry: 1` (no 3 como web) — fail fast en mobile
- `staleTime: 30_000` (30s) — más agresivo que web para evitar datos stale entre pantallas
- `gcTime`: default (5 min) — suficiente para mobile

No asumir que los defaults de React Query web aplican acá.
