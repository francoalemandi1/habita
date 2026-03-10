# Core Library (src/lib/)

Funciones fundacionales: sesión, errores, API response, notificaciones.

## Session (`session.ts`)

### Auth dual
Resuelve autenticación de ambas plataformas en un solo punto:
1. Intenta NextAuth cookie (web) → `getServerSession()`
2. Si no hay cookie, intenta Bearer token `mob_at_*` (mobile) → valida JWT
3. Ambos resuelven a `CurrentMember` con `householdId`

### householdId resolution
- Web: cookie `habita-household-id` (set por household switcher)
- Mobile: header `x-habita-household-id` (inyectado por mobileApi)
- Fallback: si ninguno presente, usa `findFirst()` → puede elegir household incorrecto

### requireMember() vs requireAuth()
- `requireMember()`: necesita session + household activo. Falla con 401 si no hay session, 403 si no tiene household
- `requireAuth()`: solo necesita session (userId). Para rutas que no dependen de household (ej: `/api/auth/me`)
- `requirePermission(perm)`: llama a `requireMember()` + verifica MemberType tiene el permiso

### getCurrentMember()
Versión no-throwing. Retorna `null` si no hay session. Usada en server components para redirect condicional.

## Errors (`errors.ts`)

### Jerarquía
```
AppError (base, statusCode + code)
├── BadRequestError (400)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
└── ConflictError (409)
```

### Mapeo automático
- `mapPrismaError()`: P2002 → ConflictError, P2025 → NotFoundError, P2003 → ConflictError, P2014 → ConflictError
- `mapSessionError()`: errores de NextAuth/token → UnauthorizedError o ForbiddenError

SIEMPRE usar clases de AppError para errores controlados. NUNCA `throw new Error("algo")` en API routes.

## API Response (`api-response.ts`)

### handleApiError(error, context)
Handler centralizado. Orden de resolución:
1. `AppError` → responde con su statusCode + message
2. Session error → mapea a 401/403
3. Prisma error → mapea código P* a HTTP
4. JSON parse error → 400
5. Desconocido → 500 genérico

En producción: errores < 500 no loguean stack trace (son esperados). Errores 500 siempre se loguean completos.

## Notificaciones (`notification-service.ts`)

### Fire-and-forget
Las notificaciones NUNCA propagan errores. Se loguean pero no cambian el flujo.
- NO wrappear en try/catch que altere el response
- NO await si no es necesario (usar `void deliverNotification(...)`)

### Retención
- Read: 30 días → cleanup automático en cron
- Unread: 90 días → cleanup automático en cron
