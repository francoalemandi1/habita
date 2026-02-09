# Rule: Input Validation

## Summary
Validate all inputs at system boundaries. Never trust client data.

## DO ✅

### Validate Everything
- Type validation (is it a string, number, etc.)
- Range validation (min/max length, value bounds)
- Format validation (email, date, URL patterns)
- Business rule validation (allowed values, relationships)

### Use TypeBox Schema
- Define schema for all server function params
- Use Type constraints (minLength, maximum, etc.)
- Custom formats for complex validation

### Sanitize for Display
- HTML-encode user content before display
- Use React's default escaping (don't use dangerouslySetInnerHTML)
- Strip or encode special characters in logs

## DON'T ❌

- Trust type assertions alone
- Trust client-provided enums
- Accept unbounded strings
- Accept unbounded arrays
- Display raw user input as HTML

## Examples

### Good ✅
```typescript
import { Type } from '@dev-agents/sdk-shared';

// Comprehensive param validation
export const createTask = serverFunction({
  description: 'Creates a new task',
  params: Type.Object({
    title: Type.String({ 
      minLength: 1, 
      maxLength: 200,
      description: 'Task title' 
    }),
    description: Type.Optional(Type.String({ 
      maxLength: 2000 
    })),
    weight: Type.Optional(Type.Number({ 
      minimum: 1, 
      maximum: 10,
      default: 1 
    })),
    householdId: Type.Number({ minimum: 1 }),
    frequency: Type.Optional(Type.Union([
      Type.Literal('once'),
      Type.Literal('daily'),
      Type.Literal('weekly'),
    ])),
    dueDate: Type.Optional(Type.String({ 
      format: 'date' // YYYY-MM-DD
    })),
  }),
  execute: async (sdk, params) => {
    // Params are validated before reaching here
    const { title, description, weight, householdId, frequency, dueDate } = params;
    
    // Additional business validation
    if (dueDate) {
      const date = new Date(dueDate);
      if (date < new Date()) {
        throw new Error('Due date cannot be in the past');
      }
    }
    
    // Safe to use
    return createTaskInDb({ title, description, weight, householdId, frequency, dueDate });
  },
});

// Validate array items
export const bulkUpdateTasks = serverFunction({
  params: Type.Object({
    updates: Type.Array(
      Type.Object({
        id: Type.Number({ minimum: 1 }),
        title: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
        completed: Type.Optional(Type.Boolean()),
      }),
      { 
        minItems: 1, 
        maxItems: 50 // Prevent huge batches
      }
    ),
  }),
  execute: async (sdk, { updates }) => {
    // Each update is validated
  },
});

// Validate string patterns
const emailSchema = Type.String({
  pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
});

// Validate enums properly
const statusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('active'),
  Type.Literal('completed'),
]);
```

### Bad ❌
```typescript
// No validation
export const createTask = serverFunction({
  params: Type.Object({
    title: Type.String(), // ❌ No length limits
    data: Type.Any(), // ❌ Completely unvalidated
  }),
  execute: async (sdk, { title, data }) => {
    // ❌ title could be 1GB string
    // ❌ data could be anything
  },
});

// Trusting enum from client
export const setStatus = serverFunction({
  params: Type.Object({
    status: Type.String(), // ❌ Should be union of literals
  }),
  execute: async (sdk, { status }) => {
    // ❌ Client could send any string
    await db.update(tasks).set({ status });
  },
});

// No array limits
export const processBatch = serverFunction({
  params: Type.Object({
    items: Type.Array(Type.Object({...})), // ❌ No maxItems
  }),
  execute: async (sdk, { items }) => {
    // ❌ Could receive millions of items
  },
});

// Displaying unescaped input
function Comment({ text }: { text: string }) {
  // ❌ XSS vulnerability
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
}
```

## Common Validation Patterns

```typescript
// ID validation
const idSchema = Type.Number({ minimum: 1 });

// Pagination
const paginationSchema = Type.Object({
  page: Type.Number({ minimum: 1, default: 1 }),
  pageSize: Type.Number({ minimum: 1, maximum: 100, default: 20 }),
});

// Search/filter
const searchSchema = Type.Object({
  query: Type.Optional(Type.String({ maxLength: 100 })),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('createdAt'),
    Type.Literal('title'),
    Type.Literal('dueDate'),
  ])),
  sortOrder: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc'),
  ])),
});

// Date range
const dateRangeSchema = Type.Object({
  start: Type.String({ format: 'date' }),
  end: Type.String({ format: 'date' }),
});
```

## Why This Matters

Input validation prevents:
- Injection attacks (SQL, XSS)
- DoS via large payloads
- Data corruption
- Unexpected crashes
- Business logic bypass
