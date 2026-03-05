# Skill: Feature completa (web + mobile)

## Cuándo usar
Cuando se implementa una feature nueva que debe existir en ambas plataformas.

## Orden de implementación

### 1. Contract
`packages/contracts/src/<feature>.ts`:
- Input schemas (request body)
- Response schemas (API response)
- Exportar desde `packages/contracts/src/index.ts`

### 2. Schema Prisma (si necesita modelo nuevo)
- Editar `prisma/schema.prisma`
- Campo `householdId` con relación a `Household`
- Campos nuevos: nullable o con default
- `pnpm db:push` para desarrollo local
- Ver skill `prisma-migration.md` para migración formal

### 3. API route
`src/app/api/<feature>/route.ts`:
- Ver skill `new-api-endpoint.md`
- `requireMember()` + filtrar por `householdId`
- Validar con Zod schema del contract

### 4. Web
- Página: `src/app/(app)/(main)/<feature>/page.tsx` (server component)
- Componentes: `src/components/features/<feature>-*.tsx`
- Hook (si client-side): `src/hooks/use-<feature>.ts`
- Query key: agregar en `src/lib/query-keys.ts`
- Nav: agregar link en `app-nav.tsx` y `app-nav-mobile.tsx`
- Ver skill `new-web-page.md`

### 5. Mobile
- Pantalla: `apps/mobile/app/(app)/<feature>.tsx`
- Componentes: `apps/mobile/src/components/features/<feature>-*.tsx`
- Hook: `apps/mobile/src/hooks/use-<feature>.ts`
- Layout: registrar en `apps/mobile/app/(app)/_layout.tsx`
- Ver skill `new-mobile-screen.md`

### 6. Verificación
```bash
pnpm typecheck:all    # Web + packages + mobile
pnpm build            # Verificar build completo
```

## Checklist de paridad

- [ ] Contract compartido (mismos schemas para web y mobile)
- [ ] API route con data isolation
- [ ] Web: server + client components
- [ ] Mobile: screen + theme + safe area
- [ ] Empty states en ambas plataformas
- [ ] Error handling en ambas
- [ ] Loading/skeleton states en ambas
- [ ] Textos idénticos (español argentino)
- [ ] Dark mode funcional en ambas
- [ ] Si usa first-visit guide: implementar en ambas (`localStorage` web, `AsyncStorage` mobile)

## Anti-patrones
- NO duplicar lógica de negocio — ponerla en `packages/domain/`
- NO duplicar schemas — usar `packages/contracts/`
- NO duplicar colores/tokens — usar `packages/design-tokens/`
- NO implementar solo en una plataforma sin considerar la otra
