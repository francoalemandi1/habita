# Skill: Debug mobile auth

## Cuándo usar
Cuando el usuario reporta problemas de autenticación en la app mobile (login fallido, sesión expirada, requests 401, etc.).

## Flujo de auth mobile

```
1. Login screen
   └─ Google OAuth via expo-auth-session (PKCE flow)
   └─ Obtiene idToken o authCode

2. Token exchange
   └─ POST /api/auth/mobile/exchange
   └─ Server: valida con Google → crea/vincula User → issue token pair
   └─ Response: { accessToken (mob_at_*), refreshToken (mob_rt_*), expiresInSeconds }

3. Token storage
   └─ AsyncStorage: habita_mobile_access_token, habita_mobile_refresh_token

4. API requests
   └─ mobileApi auto-inyecta: Authorization: Bearer <accessToken>
   └─ También: x-habita-household-id: <householdId>

5. Token refresh (automático)
   └─ Proactivo: 2 min antes de exp (decodifica JWT sin librería)
   └─ Reactivo: en 401, POST /api/auth/mobile/refresh
   └─ Server: valida refresh token → revoca viejo → issue nuevo par

6. Token family security
   └─ Cada par pertenece a un tokenFamilyId
   └─ Si se detecta reuso de refresh token → revoca TODA la familia
   └─ Protege contra token theft
```

## Puntos de diagnóstico

### A. Login no funciona
1. Verificar client IDs en env:
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
2. Verificar `EXPO_PUBLIC_OAUTH_BASE_URL` (debe ser HTTPS, ej. `https://habita.casa`)
3. Verificar `EXPO_PUBLIC_API_BASE_URL` (apunta al server correcto)
4. Revisar que el redirect URI esté configurado en Google Cloud Console

### B. Requests fallan con 401
1. Access token expirado (TTL: 1 hora):
   - ¿Se está llamando al refresh endpoint?
   - Revisar `apps/mobile/src/lib/api.ts` → `refreshAccessToken()`
2. Refresh token expirado (TTL: 30 días):
   - Forzar re-login
3. Token family revocada:
   - Ocurre si se detectó reuso de refresh token
   - Forzar re-login
4. Verificar en DB: `MobileAuthSession` → buscar por `userId`, verificar `revokedAt`, `expiresAt`

### C. Sesión se pierde
1. AsyncStorage no persiste (raro pero posible en dev):
   - Verificar keys: `habita_mobile_access_token`, `habita_mobile_refresh_token`
2. Proactive refresh falla silenciosamente:
   - Revisar `scheduleProactiveRefresh()` en `api.ts`
3. `onAuthFailure` no retorna `true`:
   - Si retorna `false`, el request no se reintenta

### D. Household context incorrecto
1. Header `x-habita-household-id` no se envía:
   - Verificar `habita_mobile_household_id` en AsyncStorage
2. Server usa `getCurrentMember()` que lee el header:
   - Si header vacío, usa `findFirst()` → puede elegir household incorrecto

## Queries útiles en DB
```sql
-- Sesiones activas de un usuario
SELECT * FROM "MobileAuthSession"
WHERE "userId" = '<id>'
AND "revokedAt" IS NULL
AND "expiresAt" > NOW()
ORDER BY "createdAt" DESC;

-- Detectar token families comprometidas
SELECT "tokenFamilyId", COUNT(*), MAX("revokedAt")
FROM "MobileAuthSession"
WHERE "userId" = '<id>'
GROUP BY "tokenFamilyId";
```

## Archivos clave
- `src/lib/mobile-auth.ts` — Token issue/rotate/revoke (server)
- `src/lib/session.ts` — `getCurrentUserId()` resuelve Bearer tokens
- `apps/mobile/src/lib/api.ts` — `mobileApi` client + refresh logic
- `apps/mobile/src/lib/storage.ts` — AsyncStorage keys + helpers
- `apps/mobile/src/providers/mobile-auth-provider.tsx` — Auth context + hydration
- `src/app/api/auth/mobile/` — Exchange, refresh, logout endpoints
