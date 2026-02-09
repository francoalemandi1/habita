# Rule: Database Schema Design

## Summary
Design schemas for data integrity, query efficiency, and maintainability.

## DO ✅

### Table Design
- Every table has `id` primary key (auto-increment)
- Use `owner` column for user data (multi-tenant isolation)
- Include `createdAt` timestamp
- Consider `updatedAt` for mutable data
- Use foreign keys for relationships

### Naming
- Table names: plural, snake_case (`household_members`)
- Column names: snake_case (`created_at`)
- Foreign keys: `{referenced_table}_id` (`household_id`)
- Boolean columns: `is_` prefix (`is_active`)

### Data Types
- Use appropriate types (don't store numbers as strings)
- Use `integer` with `mode: 'timestamp'` for dates
- Use `integer` with `mode: 'boolean'` for booleans
- Consider storage size for large text

## DON'T ❌

- Tables without primary key
- Missing foreign key constraints
- Storing computed values (calculate instead)
- Over-normalizing (join complexity)
- Under-normalizing (data duplication)

## Examples

### Good ✅
```typescript
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// User-scoped table with all standard columns
export const households = sqliteTable('households', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  owner: text('owner').notNull(), // User email for isolation
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Related table with foreign key
export const members = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  householdId: integer('household_id')
    .notNull()
    .references(() => households.id),
  name: text('name').notNull(),
  email: text('email'),
  isActive: integer('is_active', { mode: 'boolean' })
    .notNull()
    .default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Many-to-many with junction table
export const taskAssignments = sqliteTable('task_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id),
  assignedAt: integer('assigned_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});
```

### Bad ❌
```typescript
// Missing owner column - can't isolate user data
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // No owner column!
  title: text('title'),
});

// Storing computed value
export const members = sqliteTable('members', {
  // ...
  taskCount: integer('task_count'), // Should be calculated
  lastTaskDate: integer('last_task_date'), // Should be queried
});

// Missing foreign key
export const assignments = sqliteTable('assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id'), // No reference - can have orphans
  memberId: integer('member_id'), // No reference
});

// Wrong data types
export const events = sqliteTable('events', {
  date: text('date'), // Should be integer with timestamp mode
  isActive: text('is_active'), // Should be integer with boolean mode
  amount: text('amount'), // Should be integer or real
});
```

## Schema Patterns

### Soft Deletes
```typescript
export const tasks = sqliteTable('tasks', {
  // ...
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// Query active only
const activeTasks = await db.select()
  .from(tasks)
  .where(isNull(tasks.deletedAt));
```

### Audit Trail
```typescript
export const taskHistory = sqliteTable('task_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').notNull().references(() => tasks.id),
  action: text('action').notNull(), // 'created' | 'updated' | 'completed'
  changedBy: text('changed_by').notNull(),
  changedAt: integer('changed_at', { mode: 'timestamp' }).notNull(),
  previousValue: text('previous_value'), // JSON string
  newValue: text('new_value'), // JSON string
});
```

## Why This Matters

- Foreign keys prevent orphaned data
- Proper types enable validation
- Owner column enables multi-tenant
- Timestamps enable debugging
