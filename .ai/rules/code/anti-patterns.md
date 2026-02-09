# Rule: Anti-Patterns to Avoid

## Summary
Common mistakes that lead to bugs, poor performance, or maintenance nightmares.

## Anti-Patterns

### 1. Magic Numbers & Strings
❌ **Bad**
```typescript
if (status === 3) { ... }
setTimeout(fn, 86400000);
if (role === 'adm') { ... }
```

✅ **Good**
```typescript
const STATUS_COMPLETED = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ADMIN_ROLE = 'admin';

if (status === STATUS_COMPLETED) { ... }
setTimeout(fn, ONE_DAY_MS);
if (role === ADMIN_ROLE) { ... }
```

### 2. Nested Ternaries
❌ **Bad**
```typescript
const label = status === 'done' ? 'Complete' : status === 'pending' ? 'Waiting' : status === 'failed' ? 'Error' : 'Unknown';
```

✅ **Good**
```typescript
const STATUS_LABELS: Record<string, string> = {
  done: 'Complete',
  pending: 'Waiting', 
  failed: 'Error',
};
const label = STATUS_LABELS[status] ?? 'Unknown';
```

### 3. Mutating Function Arguments
❌ **Bad**
```typescript
function addDefaults(config) {
  config.timeout = config.timeout || 5000;
  config.retries = config.retries || 3;
  return config;
}
```

✅ **Good**
```typescript
function addDefaults(config: Config): Config {
  return {
    timeout: 5000,
    retries: 3,
    ...config, // User values override defaults
  };
}
```

### 4. Using Index as React Key
❌ **Bad**
```tsx
{items.map((item, index) => (
  <Item key={index} data={item} />
))}
```

✅ **Good**
```tsx
{items.map(item => (
  <Item key={item.id} data={item} />
))}
```

### 5. Callback Hell
❌ **Bad**
```typescript
getUser(userId, (user) => {
  getHousehold(user.householdId, (household) => {
    getTasks(household.id, (tasks) => {
      processTasks(tasks, (result) => {
        // ...
      });
    });
  });
});
```

✅ **Good**
```typescript
const user = await getUser(userId);
const household = await getHousehold(user.householdId);
const tasks = await getTasks(household.id);
const result = await processTasks(tasks);
```

### 6. God Objects/Functions
❌ **Bad**
```typescript
class TaskManager {
  createTask() { ... }
  updateTask() { ... }
  deleteTask() { ... }
  assignTask() { ... }
  completeTask() { ... }
  sendNotification() { ... }
  calculateStats() { ... }
  generateReport() { ... }
  syncWithCalendar() { ... }
  exportToCsv() { ... }
  // 50 more methods...
}
```

✅ **Good**
```typescript
// Separate concerns
const taskService = { create, update, delete };
const assignmentService = { assign, unassign, rotate };
const notificationService = { send, schedule };
const reportService = { generate, export };
```

### 7. Premature Optimization
❌ **Bad**
```typescript
// Micro-optimizing before measuring
const len = arr.length;
for (let i = 0; i < len; i++) { ... }

// Caching everything "just in case"
const memoizedGetUser = memoize(getUser);
const memoizedFormat = memoize(formatDate);
const memoizedEverything = memoize(everything);
```

✅ **Good**
```typescript
// Simple first, optimize when needed
for (const item of arr) { ... }

// Memoize only measured bottlenecks
const expensiveCalculation = memoize(calculateFairnessScores);
```

### 8. Copy-Paste Code
❌ **Bad**
```typescript
// In file1.ts
const activeTasks = tasks.filter(t => !t.completed && t.dueDate > new Date());

// In file2.ts (copy-pasted)
const activeTasks = tasks.filter(t => !t.completed && t.dueDate > new Date());

// In file3.ts (copy-pasted, slightly different bug)
const activeTasks = tasks.filter(t => !t.completed && t.dueDate >= new Date());
```

✅ **Good**
```typescript
// In task-utils.ts
export function getActiveTasks(tasks: Task[]): Task[] {
  const now = new Date();
  return tasks.filter(t => !t.completed && t.dueDate > now);
}
```

### 9. Stringly Typed Code
❌ **Bad**
```typescript
function handleAction(action: string, data: any) {
  if (action === 'create') { ... }
  if (action === 'update') { ... }
  if (action === 'delte') { ... } // Typo not caught
}
```

✅ **Good**
```typescript
type Action = 'create' | 'update' | 'delete';

function handleAction(action: Action, data: TaskData) {
  switch (action) {
    case 'create': return createTask(data);
    case 'update': return updateTask(data);
    case 'delete': return deleteTask(data);
  }
}
```

### 10. Boolean Blindness
❌ **Bad**
```typescript
processPayment(amount, true, false, true);
// What do these booleans mean?
```

✅ **Good**
```typescript
processPayment({
  amount,
  saveCard: true,
  sendReceipt: false,
  isSubscription: true,
});
```

## Why These Matter

| Anti-Pattern | Risk |
|-------------|------|
| Magic numbers | Bugs from wrong values, hard to update |
| Nested ternaries | Unreadable, easy to get wrong |
| Mutating arguments | Unexpected side effects |
| Index as key | React re-render bugs |
| Callback hell | Hard to follow, error handling nightmare |
| God objects | Untestable, hard to modify |
| Premature optimization | Wasted time, complex code |
| Copy-paste | Bugs diverge, updates missed |
| Stringly typed | Typos not caught by compiler |
| Boolean blindness | Unreadable call sites |

## When to Break These Rules

- Performance-critical code may need optimization
- External APIs may force stringly-typed interfaces
- Legacy code may require gradual refactoring
