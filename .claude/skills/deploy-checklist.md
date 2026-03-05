# Skill: Deploy checklist

## Cuándo usar
Antes de pushear código a producción.

## Checklist

### 1. Migraciones (si hay cambios en schema.prisma)
```bash
# ¿Hay cambios pendientes en schema.prisma?
git diff prisma/schema.prisma
```
Si hay cambios: seguir skill `prisma-migration.md` ANTES de pushear.
La migración en producción debe aplicarse ANTES de que el código nuevo llegue.

### 2. Type check
```bash
pnpm typecheck        # Mínimo: web
pnpm typecheck:all    # Ideal: web + packages + mobile
```

### 3. Build
```bash
pnpm build
```
Verificar que no hay errores de compilación.

### 4. Crons
Si se modificaron rutas en `src/app/api/cron/`:
- Verificar `vercel.json` — los 5 crons definidos deben seguir válidos
- Las rutas de cron están protegidas por `CRON_SECRET`
- Cuidado con side effects (envío de emails, creación de notificaciones, generación de planes)

### 5. Variables de entorno
Si se agregó una nueva variable de entorno:
- Agregar en `.env.example` con valor placeholder
- Configurar en Vercel dashboard (Settings → Environment Variables)
- Si es `EXPO_PUBLIC_*`: también en la config de Expo/EAS

### 6. Migraciones en producción
```bash
# Solo si hay migración nueva
mv .env.local .env.local.bak
pnpm db:deploy
mv .env.local.bak .env.local
```

### 7. Push
```bash
git push origin <branch>
```
Vercel auto-deploys en push. No hay CI/CD separado.

## Orden crítico
```
Migración en prod → Push código → Vercel build automático
```
NUNCA al revés. Si el código llega antes que la migración, Prisma falla al intentar acceder a columnas/tablas que no existen.
