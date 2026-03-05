# Skill: Nuevo paquete compartido

## Cuándo usar
Cuando se necesita compartir lógica, tipos, o utilidades entre web y mobile.

## Paquetes existentes
- `packages/contracts/` — Zod schemas (API contracts)
- `packages/design-tokens/` — Colores, spacing, radius, shadows
- `packages/api-client/` — HTTP client factory
- `packages/domain/` — Lógica de negocio (expense subcategories, unit parser)

## Crear paquete nuevo

### 1. Estructura de archivos
```
packages/<nombre>/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

### 2. package.json
```json
{
  "name": "@habita/<nombre>",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```
Si necesita sub-exports:
```json
"exports": {
  ".": "./src/index.ts",
  "./<sub>": "./src/<sub>.ts"
}
```

### 3. tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src"]
}
```

### 4. Registrar en el monorepo

**Root `tsconfig.json`** — agregar path alias:
```json
"paths": {
  "@habita/<nombre>": ["./packages/<nombre>/src/index.ts"]
}
```

**`next.config.ts`** — agregar a transpilePackages:
```typescript
transpilePackages: [
  // ... existentes
  "@habita/<nombre>",
]
```

**`vitest.config.ts`** — agregar alias:
```typescript
"@habita/<nombre>": path.resolve(__dirname, "packages/<nombre>/src/index.ts")
```

**Mobile `apps/mobile/package.json`** — agregar dependencia:
```json
"@habita/<nombre>": "workspace:*"
```

### 5. Instalar
```bash
pnpm install
```

### 6. Checklist

- [ ] NO importar `@/*` (app-local alias)
- [ ] NO importar `next/*` (framework web)
- [ ] NO importar `react-native` (framework mobile)
- [ ] Debe ser platform-agnostic
- [ ] Dependencias externas: solo las mínimas necesarias
- [ ] `pnpm typecheck:all` al finalizar
