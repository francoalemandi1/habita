# Rule: TypeScript Types

## Summary
Use TypeScript's type system to catch errors at compile time, not runtime.

## DO ✅

### Type Everything
- Explicit return types on exported functions
- Typed function parameters
- No implicit `any`
- Use `unknown` instead of `any` when type is truly unknown

### Use Type Inference
- Let TypeScript infer when obvious
- `const x = 5` not `const x: number = 5`
- `const arr = [1, 2, 3]` not `const arr: number[] = [1, 2, 3]`

### Prefer Interfaces for Objects
- Use `interface` for object shapes (extendable)
- Use `type` for unions, intersections, primitives
- Be consistent within a project

### Use Discriminated Unions
- For type-safe handling of variants
- Each variant has a literal `type` or `kind` property
- TypeScript narrows type automatically

### Const Assertions
- Use `as const` for literal types
- Prevents widening: `'admin' as const` vs `'admin'` (string)

## DON'T ❌

- `any` type (use `unknown` and narrow)
- Type assertions without validation (`as Type`)
- Non-null assertions (`!`) without certainty
- `// @ts-ignore` without explanation
- Overly complex conditional types (keep simple)

## Examples

### Good ✅
```typescript
// Discriminated union for type safety
type TaskStatus = 
  | { status: 'pending' }
  | { status: 'assigned'; assigneeId: string; assignedAt: Date }
  | { status: 'completed'; completedAt: Date; completedBy: string };

function handleTaskStatus(task: TaskStatus) {
  switch (task.status) {
    case 'pending':
      return 'Waiting for assignment';
    case 'assigned':
      return `Assigned to ${task.assigneeId}`; // TypeScript knows assigneeId exists
    case 'completed':
      return `Done on ${task.completedAt}`; // TypeScript knows completedAt exists
  }
}

// Type guards for narrowing
function isTask(value: unknown): value is Task {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value
  );
}

// Utility types
type PartialTask = Partial<Task>;
type RequiredTask = Required<Task>;
type TaskKeys = keyof Task;
type ReadonlyTask = Readonly<Task>;

// Generic constraints
async function findById<T extends { id: string }>(
  items: T[],
  id: string
): Promise<T | undefined> {
  return items.find(item => item.id === id);
}

// Const assertion for literal types
const ROLES = ['admin', 'member', 'guest'] as const;
type Role = typeof ROLES[number]; // 'admin' | 'member' | 'guest'

// Explicit return type for public API
export async function getTaskById(id: string): Promise<Task | null> {
  const results = await db.select().from(tasks).where(eq(tasks.id, id));
  return results[0] ?? null;
}
```

### Bad ❌
```typescript
// any type
function processData(data: any) {
  return data.something.nested.value; // No safety
}

// Unsafe type assertion
const user = response.data as User; // What if it's not a User?

// Non-null assertion without certainty
const firstTask = tasks[0]!; // What if array is empty?

// Overly complex types
type DeepPartialReadonlyWithOptionalKeys<T, K extends keyof T> = 
  Omit<Readonly<Partial<T>>, K> & Pick<T, K> extends infer U ? { [P in keyof U]: U[P] } : never;

// ts-ignore without explanation
// @ts-ignore
const result = brokenFunction();
```

## Type vs Interface

```typescript
// Use INTERFACE for object shapes (can be extended)
interface User {
  id: string;
  name: string;
}

interface AdminUser extends User {
  permissions: string[];
}

// Use TYPE for unions, intersections, primitives
type Status = 'pending' | 'active' | 'completed';
type StringOrNumber = string | number;
type TaskWithUser = Task & { user: User };
```

## Handling `noUncheckedIndexedAccess`

This project has `noUncheckedIndexedAccess: true`, meaning array access returns `T | undefined`:

```typescript
const tasks = await db.select().from(tasks).limit(1);

// ❌ Bad - TypeScript error
return tasks[0].title;

// ✅ Good - Truthy check
if (tasks[0]) {
  return tasks[0].title; // Narrowed to Task
}

// ✅ Good - Non-null assertion when certain
const inserted = await db.insert(tasks).values({...}).returning();
return inserted[0]!; // We know insert returns the row

// ✅ Good - Explicit check
const task = tasks[0];
if (!task) throw new Error('Task not found');
return task.title;
```

## Why This Matters

- Catches bugs at compile time, not production
- Self-documents code intent
- Enables better IDE support
- Makes refactoring safer
