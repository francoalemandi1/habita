# Tool: Write Code

## Purpose
Write or modify source code files in the codebase.

## Actions

### Create New File
Write complete file contents to a new location.

### Modify Existing File
Edit specific sections of an existing file while preserving context.

### Append to File
Add content to the end of an existing file.

## Safety Rules

1. **Read before write**: Always read the current file state before modifying
2. **Preserve formatting**: Match existing code style
3. **No destructive overwrites**: Confirm before replacing large sections
4. **Backup awareness**: Changes can be reverted via git

## Verification After Write

```bash
# TypeScript compilation
bun run typecheck

# Build verification
bun run build
```

## File Patterns

### Server Functions (src/server.ts)
```typescript
export const functionName = serverFunction({
  description: "...",
  params: Type.Object({...}),
  execute: async (sdk: ServerSdk, params) => {
    // Implementation
  },
});
```

### React Components (src/App.tsx)
```tsx
function ComponentName({ props }: { props: Type }) {
  // Hooks
  // Logic
  return (
    <div>...</div>
  );
}
```

### Database Schema (src/schema.ts)
```typescript
export const tableName = sqliteTable("table_name", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // columns
});
```

## When Used By

- **agent-feature**: Implementing new features
- **skill-code-implementation**: Executing implementation tasks
