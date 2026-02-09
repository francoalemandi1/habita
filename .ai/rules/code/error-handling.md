# Rule: Error Handling

## Summary
Handle errors explicitly, fail fast, and provide useful context.

## DO ✅

### General Principles
- Fail fast: detect errors early
- Be explicit: don't swallow errors silently
- Provide context: what operation failed and why
- Log for debugging, display for users

### Try-Catch Usage
- Catch specific errors when possible
- Always log caught errors
- Re-throw with context if not handling
- Use finally for cleanup

### Async Operations
- Always handle promise rejections
- Use try-catch with async/await
- Consider retry logic for transient failures
- Set timeouts for external calls

### Error Messages
- Be specific: "Task with ID 123 not found" not "Not found"
- Include actionable info when possible
- Don't expose internal details to users
- Log full details, show safe summary

## DON'T ❌

- Empty catch blocks
- `catch (e) { return null }` without logging
- Throwing strings instead of Error objects
- Catching errors just to re-throw without context
- Ignoring promise rejections
- Generic "Something went wrong" without logging specifics

## Examples

### Good ✅
```typescript
// Specific error handling
async function getTaskById(taskId: string): Promise<Task> {
  try {
    const results = await db.select().from(tasks).where(eq(tasks.id, taskId));
    
    if (!results[0]) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    return results[0];
  } catch (error) {
    console.error('Failed to get task', { taskId, error });
    throw error;
  }
}

// Handling external API errors
async function fetchWeatherData(location: string): Promise<Weather | null> {
  try {
    const response = await fetch(`/api/weather?loc=${location}`, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (!response.ok) {
      console.error('Weather API error', { 
        status: response.status, 
        location 
      });
      return null; // Graceful degradation
    }
    
    return response.json();
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.warn('Weather API timeout', { location });
    } else {
      console.error('Weather API failed', { location, error });
    }
    return null;
  }
}

// Retry logic for transient failures
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt}/${maxAttempts} failed`, { error });
      
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
}

// Result type for expected failures
type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

async function validateAssignment(taskId: string, memberId: string): Promise<Result<Assignment, string>> {
  const task = await getTask(taskId);
  if (!task) {
    return { ok: false, error: 'Task not found' };
  }
  
  const member = await getMember(memberId);
  if (!member) {
    return { ok: false, error: 'Member not found' };
  }
  
  if (task.householdId !== member.householdId) {
    return { ok: false, error: 'Member not in task household' };
  }
  
  return { ok: true, value: { taskId, memberId, assignedAt: new Date() } };
}
```

### Bad ❌
```typescript
// Silent failure
async function getUser(id: string) {
  try {
    return await db.query(`SELECT * FROM users WHERE id = ${id}`);
  } catch {
    return null; // Error swallowed, no logging, potential SQL injection
  }
}

// Generic error
function processData(data: unknown) {
  if (!data) {
    throw new Error('Error'); // What error? What data?
  }
}

// Ignoring promise rejection
async function loadData() {
  fetchUserData(); // No await, no catch - rejection goes nowhere
  fetchSettings(); // Same problem
}

// Re-throw without context
async function saveTask(task: Task) {
  try {
    await db.insert(tasks).values(task);
  } catch (error) {
    throw error; // Why bother catching? No added value
  }
}
```

## Why This Matters

- Silent failures cause hard-to-debug issues
- Good error messages speed up debugging
- Graceful degradation improves UX
- Logging enables production debugging

## Exceptions

- `catch` with intentional ignore: comment why
- Validation errors may not need logging
- Hot paths may skip detailed logging for performance
