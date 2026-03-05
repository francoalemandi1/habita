# Skill: Migración Prisma

## Cuándo usar
Cuando se modifica `prisma/schema.prisma` y el cambio debe llegar a producción.

## Contexto
Neon (PostgreSQL serverless) timeoutea advisory locks durante `prisma migrate deploy` si se corre en build. Por eso las migraciones se aplican **manualmente antes de cada deploy**.

- `DATABASE_URL` — pooled (hostname con `-pooler`), para runtime
- `DATABASE_URL_UNPOOLED` — direct (sin `-pooler`), para migraciones

## Reglas inquebrantables
- **NUNCA** commitear cambios a `schema.prisma` sin crear la migración primero
- **NUNCA** correr `pnpm db:push` en producción
- Campos nuevos: SIEMPRE `?` (nullable) o `@default(valor)`. Sin esto, la migración falla con datos existentes
- Migración en prod ANTES de pushear código que la use

## Procedimiento paso a paso

### 1. Desarrollo local
```bash
# Editar schema.prisma
# Sincronizar con DB local (sin migración formal)
pnpm db:push
# Desarrollar y testear
```

### 2. Crear migración formal
```bash
# Crear shadow DB temporal en Neon dashboard (o local)
# Apuntar DATABASE_URL_UNPOOLED a la shadow DB
# Sincronizar shadow DB con migraciones existentes: npx prisma migrate deploy
# Generar SQL diff (from=DB actual, to=schema deseado)
npx prisma migrate diff \
  --from-url "$DATABASE_URL_UNPOOLED" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migration.sql

# Crear directorio de migración
mkdir -p prisma/migrations/YYYYMMDDHHMMSS_descripcion_breve

# Mover el SQL
mv migration.sql prisma/migrations/YYYYMMDDHHMMSS_descripcion_breve/migration.sql

# Marcar como aplicada en la shadow DB
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_descripcion_breve

# Verificar drift cero
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-migrations prisma/migrations \
  --exit-code

# Limpiar shadow DB (borrarla del dashboard)
```

### 3. Aplicar en producción
```bash
# Backup del .env.local (tiene DATABASE_URL pooled)
mv .env.local .env.local.bak

# Asegurar que DATABASE_URL apunte al unpooled (direct)
# Aplicar migración
pnpm db:deploy

# Restaurar
mv .env.local.bak .env.local
```

### 4. Verificación
```bash
pnpm typecheck
pnpm build
```

## Formato del nombre de migración
`YYYYMMDDHHMMSS_descripcion_snake_case`

Ejemplos:
- `20260305120000_add_saved_recipe_table`
- `20260305120000_add_city_to_household`
