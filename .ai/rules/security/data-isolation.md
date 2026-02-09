# Rule: Data Isolation

## Summary
Every user's data must be isolated. Users must never see other users' data.

## DO ✅

### Owner Column
- Every user-scoped table has `owner` column
- Query filters include `owner = currentUser.email`
- Insert statements set `owner` to current user

### Server-Side Enforcement
- Validate ownership on EVERY query
- Validate ownership on EVERY mutation
- Never trust client-provided IDs alone

### Access Checks
- Check user can access resource before returning
- Check user can modify resource before updating
- Check relationships (user owns household that owns task)

## DON'T ❌

- Query without owner filter
- Trust client to send correct owner
- Expose internal IDs that could be guessed
- Return data without ownership verification
- Allow update without ownership check

## Examples

### Good ✅
```typescript
// Read with owner filter
export const getTasks = serverFunction({
  execute: async (sdk) => {
    const user = sdk.getUser();
    const db = sdk.db<typeof schema>();
    
    return db.select()
      .from(tasks)
      .where(eq(tasks.owner, user.email)); // Always filter
  },
});

// Create with owner assignment
export const createTask = serverFunction({
  params: Type.Object({
    title: Type.String(),
    householdId: Type.Number(),
  }),
  execute: async (sdk, { title, householdId }) => {
    const user = sdk.getUser();
    const db = sdk.db<typeof schema>();
    
    // First verify user owns the household
    const household = await db.select()
      .from(households)
      .where(and(
        eq(households.id, householdId),
        eq(households.owner, user.email) // Verify ownership
      ))
      .limit(1);
    
    if (!household[0]) {
      throw new Error('Household not found');
    }
    
    // Then create with owner
    return db.insert(tasks)
      .values({
        title,
        householdId,
        owner: user.email, // Set owner
      })
      .returning();
  },
});

// Update with ownership verification
export const updateTask = serverFunction({
  params: Type.Object({
    taskId: Type.Number(),
    title: Type.String(),
  }),
  execute: async (sdk, { taskId, title }) => {
    const user = sdk.getUser();
    const db = sdk.db<typeof schema>();
    
    // Verify ownership AND update in one query
    const result = await db.update(tasks)
      .set({ title })
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.owner, user.email) // Critical: verify ownership
      ))
      .returning();
    
    if (!result[0]) {
      throw new Error('Task not found');
    }
    
    return result[0];
  },
});

// Delete with ownership verification
export const deleteTask = serverFunction({
  params: Type.Object({ taskId: Type.Number() }),
  execute: async (sdk, { taskId }) => {
    const user = sdk.getUser();
    const db = sdk.db<typeof schema>();
    
    const result = await db.delete(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.owner, user.email)
      ))
      .returning();
    
    if (!result[0]) {
      throw new Error('Task not found');
    }
  },
});
```

### Bad ❌
```typescript
// Missing owner filter
export const getTasks = serverFunction({
  execute: async (sdk) => {
    // ❌ Returns ALL tasks, not just user's
    return sdk.db().select().from(tasks);
  },
});

// Trusting client-provided ID
export const getTask = serverFunction({
  params: Type.Object({ taskId: Type.Number() }),
  execute: async (sdk, { taskId }) => {
    // ❌ User could request any task ID
    return sdk.db().select().from(tasks)
      .where(eq(tasks.id, taskId));
  },
});

// Trusting client-provided owner
export const createTask = serverFunction({
  params: Type.Object({
    title: Type.String(),
    owner: Type.String(), // ❌ Never accept owner from client
  }),
  execute: async (sdk, { title, owner }) => {
    return sdk.db().insert(tasks).values({ title, owner });
  },
});

// Delete without ownership check
export const deleteTask = serverFunction({
  params: Type.Object({ taskId: Type.Number() }),
  execute: async (sdk, { taskId }) => {
    // ❌ Any user could delete any task
    return sdk.db().delete(tasks).where(eq(tasks.id, taskId));
  },
});
```

## Related Data Access

When accessing related data, verify the chain:

```typescript
// User → Household → Task → Assignment
// Verify user owns household that owns task

export const getTaskDetails = serverFunction({
  params: Type.Object({ taskId: Type.Number() }),
  execute: async (sdk, { taskId }) => {
    const user = sdk.getUser();
    const db = sdk.db<typeof schema>();
    
    // Join to verify ownership through household
    const result = await db.select()
      .from(tasks)
      .innerJoin(households, eq(tasks.householdId, households.id))
      .where(and(
        eq(tasks.id, taskId),
        eq(households.owner, user.email) // Verify via relationship
      ));
    
    if (!result[0]) {
      throw new Error('Task not found');
    }
    
    return result[0].tasks;
  },
});
```

## Why This Matters

Data isolation failures are:
- Privacy violations
- Potential legal issues (GDPR, etc.)
- Trust-destroying for users
- Often discovered publicly
