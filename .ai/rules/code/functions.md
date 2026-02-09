# Rule: Function Design

## Summary
Functions should do one thing, be small, and have clear inputs and outputs.

## DO ✅

### Size & Focus
- Keep functions under 20 lines (ideally under 10)
- Do ONE thing per function
- Extract complex conditions into named functions
- Extract repeated code into helper functions

### Parameters
- Maximum 3 parameters (use objects for more)
- Put required params first, optional last
- Use destructuring for object params
- Default values at the call site, not deep in code

### Return Values
- Return early for error/edge cases
- Be consistent: always return same type
- Return meaningful values, not `void` when useful
- Use discriminated unions for multiple outcomes

### Pure Functions
- Prefer pure functions (same input = same output)
- No side effects unless function name indicates it
- Mutations should be explicit (`mutateArray`, `updateInPlace`)

## DON'T ❌

- Functions longer than screen height
- Functions that do multiple unrelated things
- Boolean parameters (use options object or separate functions)
- Output parameters (return values instead)
- Nested callbacks more than 2 levels

## Examples

### Good ✅
```typescript
// Single responsibility
function calculateFairnessScore(completedTasks: Task[]): number {
  if (completedTasks.length === 0) return 0;
  
  const weights = completedTasks.map(t => t.weight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  return totalWeight / completedTasks.length;
}

// Object params for many values
interface CreateTaskParams {
  title: string;
  householdId: string;
  frequency?: string;
  weight?: number;
}

async function createTask(params: CreateTaskParams): Promise<Task> {
  const { title, householdId, frequency = 'once', weight = 1 } = params;
  // ...
}

// Early returns
function getNextAssignee(members: Member[], lastAssigneeId?: string): Member | null {
  if (members.length === 0) return null;
  if (members.length === 1) return members[0];
  
  const lastIndex = members.findIndex(m => m.id === lastAssigneeId);
  const nextIndex = (lastIndex + 1) % members.length;
  return members[nextIndex];
}

// Discriminated union for outcomes
type AssignmentResult = 
  | { success: true; assignment: Assignment }
  | { success: false; reason: 'no_members' | 'task_not_found' | 'already_assigned' };
```

### Bad ❌
```typescript
// Too many responsibilities
async function processTask(taskId: string, assign: boolean, notify: boolean) {
  const task = await getTask(taskId);
  if (assign) {
    const member = await getNextMember(task.householdId);
    await assignTask(taskId, member.id);
    if (notify) {
      await sendNotification(member.id, 'Task assigned');
    }
  }
  await updateTaskStatus(taskId, 'processed');
  await logAction('task_processed', taskId);
  return task;
}

// Boolean parameter (hard to read at call site)
await processTask(taskId, true, false); // What do true/false mean?

// Deep nesting
async function doThing(data) {
  if (data) {
    if (data.items) {
      for (const item of data.items) {
        if (item.active) {
          if (item.value > 0) {
            // actual logic buried here
          }
        }
      }
    }
  }
}
```

## Why This Matters

- Small functions are easier to test
- Single responsibility makes bugs obvious
- Clear signatures document usage
- Pure functions are predictable

## Exceptions

- Event handlers may coordinate multiple actions
- Migration scripts may be longer for clarity
- Some algorithms are inherently complex
