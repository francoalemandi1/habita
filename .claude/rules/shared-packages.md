---
paths:
  - "packages/**/*.ts"
---

# Reglas para paquetes compartidos

- NO importar `@/*` (alias local de la app web)
- NO importar `next/*` (framework web)
- NO importar `react-native` (framework mobile)
- Deben ser platform-agnostic: solo TypeScript puro + dependencias explícitas
- Exportar desde `src/index.ts` (o sub-exports en package.json)
- Typecheck: `pnpm typecheck:all` después de cambios
