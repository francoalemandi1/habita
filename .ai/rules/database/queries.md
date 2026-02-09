# Rule: Database Queries

## Summary
Write efficient, safe, readable queries using Drizzle ORM.

## DO ✅

### Query Patterns
- Always filter by `owner` for user data
- Select only needed columns for large tables
- Use pagination for unbounded lists
- Use transactions for multi-step operations

### Safety
- Use parameterized queries (Drizzle does this)
- Validate inputs before querying
- Handle empty results gracefully

### Performance
- Add indexes for frequent query columns
- Avoid N+1 queries (use joins)
- Limit result sets
- Consider caching for expensive queries

## DON'T ❌

- Query without owner filter on user tables
- Select * on large tables
- Unbounded queries (no limit)
- Raw SQL without parameterization
- N+1 query patterns

## Examples

### Good ✅
```typescript
// Always filter by owner
export const getTasks = serverFunction({
  params: Type.Object({}),
  execute: async (sdk) => {
    const user = sdk.getUser();
    const db = sdk.db<typeof schema>();
    
    return db.select()
      .from(tasks)
      .where(eq(tasks.owner, user.email))
      .orderBy(desc(tasks.createdAt))
      .limit(100);
  },
});

// Select specific columns for efficiency
export const getTaskTitles = serverFunction({
  params: Type.Object({ householdId: Type.Number() }),
  execute: async (sdk, { householdId }) => {
    const db = sdk.db<typeof schema>();
    
    return db.select({
      id: tasks.id,
      title: tasks.title,
    })
      .from(tasks)
      .where(eq(tasks.householdId, householdId));
  },
});

// Join instead of N+1
export const getTasksWithAssignees = serverFunction({
  params: Type.Object({ householdId: Type.Number() }),
  execute: async (sdk, { householdId }) => {
    const db = sdk.db<typeof schema>();
    
    // One query with join instead of task + member queries
    return db.select({
      task: tasks,
      assignee: members,
    })
      .from(tasks)
      .leftJoin(members, eq(tasks.assigneeId, members.id))
      .where(eq(tasks.householdId, householdId));
  },
});

// Transaction for related operations
export const createTaskWithAssignment = serverFunction({
  params: Type.Object({
    title: Type.String(),
    householdId: Type.Number(),
    assigneeId: Type.Number(),
  }),
  execute: async (sdk, { title, householdId, assigneeId }) => {
    const db = sdk.db<typeof schema>();
    
    return db.transaction(async (tx) => {
      // Insert task
      const [task] = await tx.insert(tasks)
        .values({ title, householdId, owner: sdk.getUser().email })
        .returning();
      
      // Insert assignment
      await tx.insert(assignments)
        .values({ taskId: task!.id, memberId: assigneeId });
      
      return task;
    });
  },
});

// Pagination
export const getTasksPaginated = serverFunction({
  params: Type.Object({
    page: Type.Number({ default: 1 }),
    pageSize: Type.Number({ default: 20 }),
  }),
  execute: async (sdk, { page, pageSize }) => {
    const db = sdk.db<typeof schema>();
    const offset = (page - 1) * pageSize;
    
    const [items, [countResult]] = await Promise.all([
      db.select()
        .from(tasks)
        .where(eq(tasks.owner, sdk.getUser().email))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(eq(tasks.owner, sdk.getUser().email)),
    ]);
    
    return {
      items,
      totalCount: countResult?.count ?? 0,
      page,
      pageSize,
    };
  },
});
```

### Bad ❌
```typescript
// Missing owner filter
export const getTasks = serverFunction({
  execute: async (sdk) => {
    // ❌ Returns ALL users' tasks
    return sdk.db().select().from(tasks);
  },
});

// N+1 query pattern
export const getTasksWithMembers = serverFunction({
  execute: async (sdk) => {
    const allTasks = await sdk.db().select().from(tasks);
    
    // ❌ One query per task
    return Promise.all(allTasks.map(async (task) => {
      const member = await sdk.db().select().from(members)
        .where(eq(members.id, task.assigneeId));
      return { ...task, assignee: member[0] };
    }));
  },
});

// Unbounded query
export const getAllTasks = serverFunction({
  execute: async (sdk) => {
    // ❌ No limit - could return millions
    return sdk.db().select().from(tasks);
  },
});

// Raw SQL without parameterization
export const unsafeQuery = serverFunction({
  params: Type.Object({ search: Type.String() }),
  execute: async (sdk, { search }) => {
    // ❌ SQL injection vulnerability
    return sdk.db().run(sql`SELECT * FROM tasks WHERE title LIKE '%${search}%'`);
  },
});
```

## Why This Matters

- Owner filter prevents data leaks
- Efficient queries improve performance
- Transactions ensure data consistency
- Parameterization prevents SQL injection
