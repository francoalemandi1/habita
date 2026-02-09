# Rule: TypeScript Strict Mode

## Summary
This project uses strict TypeScript settings. Know how to work with them.

## Active Strict Settings

### `noUncheckedIndexedAccess: true`
Array/object indexed access returns `T | undefined`.

```typescript
const arr = [1, 2, 3];
const first = arr[0]; // number | undefined, not number

// Handle with:
if (arr[0] !== undefined) { /* narrowed */ }
const first = arr[0]!; // Assert when certain
const first = arr[0] ?? defaultValue; // Default value
```

### `verbatimModuleSyntax: true`
Must use `import type` for type-only imports.

```typescript
// ✅ Correct
import { serverFunction } from '@dev-agents/sdk-server';
import type { ServerSdk } from '@dev-agents/sdk-server';

// ❌ Wrong - type imported as value
import { serverFunction, ServerSdk } from '@dev-agents/sdk-server';
```

### `strictNullChecks: true`
`null` and `undefined` are distinct types.

```typescript
function greet(name: string | null) {
  // ❌ Error: name might be null
  return `Hello ${name.toUpperCase()}`;
  
  // ✅ Correct
  return `Hello ${name?.toUpperCase() ?? 'Guest'}`;
}
```

### `strictPropertyInitialization: true`
Class properties must be initialized.

```typescript
class Task {
  // ❌ Error: not initialized
  title: string;
  
  // ✅ Correct options:
  title: string = '';
  title!: string; // Definite assignment assertion
  title?: string; // Optional
}
```

## Common Patterns

### Optional Chaining
```typescript
// Safe nested access
const city = user?.address?.city;
const first = items?.[0];
const result = obj?.method?.();
```

### Nullish Coalescing
```typescript
// Use ?? for null/undefined only (not falsy)
const name = input ?? 'default';     // Only null/undefined trigger default
const name = input || 'default';     // '', 0, false also trigger default
```

### Type Narrowing
```typescript
// TypeScript narrows type after checks
function process(value: string | null) {
  if (value === null) {
    return; // value is null here
  }
  // value is string here
  console.log(value.toUpperCase());
}

// Type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
```

### Exhaustive Checks
```typescript
type Status = 'pending' | 'active' | 'completed';

function handleStatus(status: Status): string {
  switch (status) {
    case 'pending': return 'Waiting';
    case 'active': return 'In Progress';
    case 'completed': return 'Done';
    default:
      // This ensures all cases are handled
      const _exhaustive: never = status;
      return _exhaustive;
  }
}
```

## Why This Matters

Strict mode catches bugs like:
- Accessing properties on null/undefined
- Missing switch cases
- Wrong import syntax
- Uninitialized variables
- Array index out of bounds

These bugs are caught at compile time, not in production.
