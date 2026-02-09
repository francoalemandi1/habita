# Rule: Query Performance

## Summary
Efficient queries prevent slow pages, database strain, and poor user experience. Optimize data fetching at both client and database levels.

## DO ✅

### Database Queries
- Index frequently queried columns
- Use pagination for large result sets
- Select only needed columns
- Use JOINs instead of N+1 queries
- Add LIMIT to prevent unbounded results

### Client Queries (React Query)
- Set appropriate staleTime
- Use query keys for proper caching
- Dedupe concurrent requests
- Prefetch predictable navigations
- Handle loading/error states

### Optimization
- Cache expensive computations
- Batch related requests
- Use database-level filtering, not client
- Profile slow queries

## DON'T ❌

- Fetch entire tables
- Select * when you need specific columns
- Execute queries in loops (N+1)
- Forget indexes on WHERE/JOIN columns
- Cache everything forever
- Ignore query timing

## Examples

### Good ✅
```typescript
// ✅ Pagination with limit
async function getTasks(page: number, limit = 20) {
  return db.select()
    .from(tasks)
    .where(eq(tasks.ownerId, userId))
    .orderBy(desc(tasks.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

// ✅ Select specific columns
async function getTaskTitles() {
  return db.select({
    id: tasks.id,
    title: tasks.title,
  }).from(tasks);
  // Not: db.select().from(tasks) // Returns all columns
}

// ✅ JOIN instead of N+1
async function getTasksWithAssignees() {
  return db.select({
    task: tasks,
    assignee: users,
  })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id));
  // Single query instead of 1 + N queries
}

// ✅ Index definition
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  ownerIdx: index("owner_idx").on(table.ownerId),
  statusIdx: index("status_idx").on(table.status),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

// ✅ React Query with proper caching
function useTasks(filter: TaskFilter) {
  return useQuery({
    queryKey: ['tasks', filter], // Cache key includes filter
    queryFn: () => fetchTasks(filter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// ✅ Prefetch on hover
function TaskListItem({ task }: { task: Task }) {
  const queryClient = useQueryClient();

  const prefetchDetails = () => {
    queryClient.prefetchQuery({
      queryKey: ['task', task.id],
      queryFn: () => fetchTaskDetails(task.id),
      staleTime: 60 * 1000,
    });
  };

  return (
    <Link
      to={`/tasks/${task.id}`}
      onMouseEnter={prefetchDetails}
    >
      {task.title}
    </Link>
  );
}

// ✅ Batch multiple queries
async function getDashboardData(userId: string) {
  const [tasks, stats, notifications] = await Promise.all([
    getRecentTasks(userId, 5),
    getTaskStats(userId),
    getUnreadNotifications(userId, 10),
  ]);

  return { tasks, stats, notifications };
}

// ✅ Filter at database level
async function getActiveTasks(userId: string) {
  return db.select()
    .from(tasks)
    .where(and(
      eq(tasks.ownerId, userId),
      eq(tasks.status, 'active')
    ));
  // Not: tasks.filter(t => t.status === 'active') after fetching all
}
```

### Bad ❌
```typescript
// ❌ N+1 query problem
async function getTasksWithAssignees() {
  const allTasks = await db.select().from(tasks);

  // N additional queries!
  for (const task of allTasks) {
    task.assignee = await db.select()
      .from(users)
      .where(eq(users.id, task.assigneeId));
  }

  return allTasks;
}

// ❌ Fetching all rows
async function getAllTasks() {
  return db.select().from(tasks); // Could be millions of rows!
}

// ❌ SELECT * when only id needed
async function getTaskIds() {
  const tasks = await db.select().from(tasks); // Fetches all columns
  return tasks.map(t => t.id);
  // Should use: db.select({ id: tasks.id }).from(tasks)
}

// ❌ Client-side filtering large datasets
function FilteredTasks({ tasks }: { tasks: Task[] }) {
  // Bad: filtering 10,000 tasks in browser
  const active = tasks.filter(t => t.status === 'active');
  // Should filter in database query
}

// ❌ No staleTime - refetches constantly
useQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  // Missing staleTime - refetches on every focus
});

// ❌ Missing index on frequently filtered column
export const tasks = sqliteTable("tasks", {
  status: text("status").notNull(), // No index!
});
// Queries filtering by status will be slow
```

## Query Patterns

### Cursor Pagination (better for large datasets)
```typescript
async function getTasksAfter(cursor: string | null, limit = 20) {
  const query = db.select()
    .from(tasks)
    .orderBy(desc(tasks.createdAt))
    .limit(limit);

  if (cursor) {
    query.where(lt(tasks.createdAt, cursor));
  }

  return query;
}
```

### Optimistic Updates
```typescript
const mutation = useMutation({
  mutationFn: updateTask,
  onMutate: async (newTask) => {
    await queryClient.cancelQueries({ queryKey: ['tasks'] });
    const previous = queryClient.getQueryData(['tasks']);

    queryClient.setQueryData(['tasks'], (old: Task[]) =>
      old.map(t => t.id === newTask.id ? { ...t, ...newTask } : t)
    );

    return { previous };
  },
  onError: (err, newTask, context) => {
    queryClient.setQueryData(['tasks'], context?.previous);
  },
});
```

## Performance Monitoring

```typescript
// Log slow queries
const start = performance.now();
const result = await db.select().from(tasks);
const duration = performance.now() - start;

if (duration > 100) {
  console.warn(`Slow query: ${duration}ms`);
}
```

## Why This Matters

- Slow queries = slow UI
- N+1 queries multiply with data size
- Missing indexes cause table scans
- Unbounded queries can crash databases
- Proper caching reduces server load
