# Rule: Naming Conventions

## Summary
Use clear, consistent, descriptive names that reveal intent.

## DO ✅

### Variables & Functions
- Use `camelCase` for variables and functions
- Use verbs for functions: `getUser`, `calculateTotal`, `validateInput`
- Use nouns for variables: `user`, `totalAmount`, `validationResult`
- Be specific: `userEmailAddress` not `email`, `taskCompletionDate` not `date`
- Use full words: `household` not `hh`, `member` not `mem`

### Booleans
- Prefix with `is`, `has`, `can`, `should`: `isCompleted`, `hasMembers`, `canEdit`
- Never use negatives: `isEnabled` not `isNotDisabled`

### Constants
- Use `SCREAMING_SNAKE_CASE` for true constants
- Use `camelCase` for configuration that could change

### Files
- Use `kebab-case` for file names: `task-list.tsx`, `user-service.ts`
- Match component name to file: `TaskList` in `task-list.tsx`

## DON'T ❌

- Single letter names (except `i`, `j` in short loops)
- Abbreviations that aren't universally known
- Generic names: `data`, `info`, `temp`, `result`, `item`
- Hungarian notation: `strName`, `arrItems`, `objUser`
- Meaningless prefixes: `myTask`, `theUser`, `aHousehold`
- Numbers in names: `task1`, `handler2`

## Examples

### Good ✅
```typescript
// Clear intent
const activeHouseholdMembers = members.filter(m => m.isActive);
const taskAssignmentHistory = await getAssignmentHistory(taskId);

// Function names reveal what they do
async function calculateFairnessScore(memberId: string): Promise<number>
async function assignTaskToNextMember(taskId: string): Promise<Assignment>

// Boolean clarity
const isTaskOverdue = task.dueDate < new Date();
const hasUnassignedTasks = tasks.some(t => !t.assigneeId);
```

### Bad ❌
```typescript
// Vague names
const data = await getData();
const result = process(items);
const temp = user.name;

// Abbreviations
const hh = getHousehold();
const mem = hh.members[0];
const tsk = createTask();

// Misleading names
const userList = getUser(); // Returns single user, not list
const isNotEmpty = arr.length === 0; // Logic inverted from name
```

## Why This Matters

- Code is read 10x more than written
- Good names reduce need for comments
- Makes refactoring safer (can search for specific terms)
- Reduces bugs from misunderstanding

## Exceptions

- Loop counters: `i`, `j`, `k` are acceptable in short loops
- Coordinates: `x`, `y`, `z` are acceptable
- Standard abbreviations: `id`, `url`, `api`, `db`
- Matching external APIs: If an API uses `usr`, keep it in that layer
