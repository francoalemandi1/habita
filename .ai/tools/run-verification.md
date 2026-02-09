# Tool: Run Verification

## Purpose
Execute verification commands to validate code quality, compilation, and builds.

## Available Commands

### TypeScript Compilation
```bash
bun run typecheck
```
Verifies TypeScript compiles without errors.

### Build
```bash
bun run build
```
Builds the complete project (server + frontend).

### Server Function Test
```bash
dreamer call-server <functionName> '<json-params>'
```
Tests a specific server function.

### Database Query
```bash
dreamer database --query "SELECT * FROM table_name LIMIT 5"
```
Queries the database directly.

### Lint (if configured)
```bash
bun run lint
```

### Test (if configured)
```bash
bun run test
```

## Verification Sequence

For implementation tasks, run in order:

1. `bun run typecheck` — Must pass
2. `bun run build` — Must pass
3. Manual/functional verification — If applicable

## Error Handling

### TypeScript Errors
- Read error message carefully
- Identify file and line number
- Common issues: missing types, wrong imports, null handling

### Build Errors
- Usually follow TypeScript errors
- May include bundling issues

### Runtime Errors
- Check console.log output
- Verify database state
- Check API responses

## When Used By

- **skill-code-implementation**: After writing code
- **agent-feature**: After each task
- **agent-review**: Verifying fixes
