# Mobile Core Library

Lógica crítica de auth, API client, y storage para la app mobile.

## Token Refresh (`api.ts`)

### Lock de deduplicación
Un `Promise` compartido (`refreshPromise`) deduplica refreshes concurrentes. Si 5 requests reciben 401 simultáneamente, solo 1 hace refresh — los demás reusan el mismo Promise.
- SIEMPRE usar `refreshMobileTokensWithLock()`, NUNCA `refreshMobileTokens()` directo

### Refresh proactivo
Los tokens se refrescan **5 minutos antes** de expirar, no on-demand.
- Timer inicial: 10 segundos después del boot (para que hidratación complete)
- Si el timer no se programa (ej: `/api/auth/me` falla), los tokens pueden expirar sin refresh
- El buffer de 5 min previene requests con token a punto de morir mid-flight

### Flag `authExpiredEmitted`
Booleano a nivel de módulo que asegura que el evento `auth-expired` se emita solo una vez.
- Se resetea con `resetAuthExpiredFlag()` después de cada exchange exitoso de tokens
- Si no se resetea: el próximo vencimiento real NO disparará el evento
- El `MobileAuthProvider` lo resetea automáticamente en cada exchange

## Storage (`storage.ts`)

### Convención de keys
Todas con prefijo `habita_mobile_`: `_access_token`, `_refresh_token`, `_household_id`, `_device_id`, `_token_expires_at`, `_theme`

### Escritura atómica de tokens
SIEMPRE usar `setMobileTokens()` (usa `AsyncStorage.multiSet`). NUNCA escribir tokens individualmente — si la app crashea entre writes, quedan tokens huérfanos.

### Device ID
- Generado una sola vez con `getOrCreateDeviceId()`, persistente por instalación
- NUNCA borrar `DEVICE_ID_KEY` en logout — solo se borran tokens
- Formato: `device_{timestamp}_{random}`
- Usado en refresh y OAuth exchange para tracking de dispositivo

### `expiresInSeconds`
Si no se provee al guardar tokens, `expiresAt` no se almacena y el refresh proactivo NO se programa.

## Anti-patterns

- NO llamar a `refreshMobileTokens()` directamente (usar `WithLock`)
- NO escribir tokens con `setItem` individual (usar `setMobileTokens`)
- NO borrar device ID en logout
- NO asumir que tokens en storage son válidos (el refresh proactivo los mantiene frescos)
- NO olvidar llamar `resetAuthExpiredFlag()` después de token exchange
