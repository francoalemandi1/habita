# Rule: Comments & Documentation

## Summary
Code should be self-documenting. Comments explain WHY, not WHAT.

## DO ✅

### When to Comment
- **Why** something is done a certain way
- **Business rules** that aren't obvious from code
- **Workarounds** for known issues or limitations
- **Warnings** about non-obvious gotchas
- **TODO/FIXME** with context and ticket reference
- **Public API** documentation for exported functions

### Comment Style
- Keep comments up to date (or delete them)
- Use full sentences for explanations
- Reference tickets/issues when relevant
- Put comments on the line ABOVE the code

## DON'T ❌

### What NOT to Comment
- WHAT the code does (the code shows that)
- Obvious operations
- Every function and variable
- Commented-out code (use git instead)
- Change logs in files (use git history)

### Bad Comment Patterns
- Comments that duplicate the code
- Comments that become outdated
- Comments instead of better naming
- Excessive decorative comments

## Examples

### Good ✅
```typescript
// Business rule: Tasks assigned on weekends count as Monday for fairness calculation
// See: https://linear.app/team/issue/TAS-123
const effectiveDate = isWeekend(assignedDate) 
  ? getNextMonday(assignedDate) 
  : assignedDate;

// WORKAROUND: React Query doesn't invalidate correctly when optimistic update fails
// Remove after upgrading to v5: https://github.com/tanstack/query/issues/1234
queryClient.resetQueries({ queryKey: ['tasks'] });

// WARNING: This query can be slow with >10k tasks. Consider pagination for large households.
const allTasks = await db.select().from(tasks).where(eq(tasks.householdId, id));

/**
 * Calculates fairness score for a household member.
 * Score is based on weighted sum of completed tasks divided by days active.
 * 
 * @param memberId - The member to calculate score for
 * @returns Score between 0-100, where higher is more work done
 * @throws If member not found
 */
export async function calculateFairnessScore(memberId: string): Promise<number> {
  // ...
}

// TODO(TAS-456): Extract to shared utility after design review
function formatTaskDate(date: Date): string {
  // ...
}
```

### Bad ❌
```typescript
// Get user
const user = getUser(id);

// Loop through items
for (const item of items) {
  // Check if item is active
  if (item.active) {
    // Process the item
    processItem(item);
  }
}

// Increment counter
count++;

// This function returns the sum of two numbers
function add(a: number, b: number): number {
  return a + b; // Return the sum
}

// ============================================
// TASK MANAGEMENT FUNCTIONS
// ============================================
// Created by: John Doe
// Created on: 2024-01-15
// Modified by: Jane Smith  
// Modified on: 2024-02-20
// ============================================

// Old implementation
// function oldCalculation(x) {
//   return x * 2;
// }
```

## Self-Documenting Code

Instead of commenting, improve the code:

❌ **Comment + Bad Code**
```typescript
// Check if task is due today and not completed
if (t.date.getDate() === new Date().getDate() && !t.done) { ... }
```

✅ **Self-Documenting**
```typescript
const isDueToday = isSameDay(task.dueDate, new Date());
const isPending = !task.completed;

if (isDueToday && isPending) { ... }
```

❌ **Comment + Bad Code**
```typescript
// Get tasks for household excluding deleted ones sorted by due date
const tasks = await db.query(`SELECT * FROM tasks WHERE household_id = ? AND deleted_at IS NULL ORDER BY due_date`, [id]);
```

✅ **Self-Documenting**
```typescript
const activeTasks = await getActiveTasksForHousehold(householdId, {
  orderBy: 'dueDate',
});
```

## JSDoc for Public APIs

Use JSDoc for exported functions that others will use:

```typescript
/**
 * Creates a new task and assigns it to the next member in rotation.
 * 
 * @param params - Task creation parameters
 * @param params.title - Task title (1-100 characters)
 * @param params.householdId - Household to create task in
 * @param params.weight - Optional weight for fairness calculation (default: 1)
 * @returns Created task with assignment info
 * @throws {ValidationError} If title is empty or too long
 * @throws {NotFoundError} If household doesn't exist
 * 
 * @example
 * const task = await createAndAssignTask({
 *   title: 'Take out trash',
 *   householdId: 'hh-123',
 *   weight: 2,
 * });
 */
export async function createAndAssignTask(params: CreateTaskParams): Promise<TaskWithAssignment> {
  // ...
}
```

## Why This Matters

- Good comments save debugging time
- Bad comments waste time and mislead
- Self-documenting code is easier to maintain
- Up-to-date comments are valuable, stale ones are harmful
