# Data Model: Household Task Manager

## Prerequisites

- Based on: `.ai/specs/functional-spec.md` (entities, rules)
- Based on: `.ai/specs/architecture-plan.md` (technical mapping)
- Constrained by: `AGENTS.md` (Drizzle ORM patterns)

---

## 1. Entity to Table Mapping

| Entity (Functional Spec) | Table | Purpose |
|--------------------------|-------|---------|
| Household | `households` | Group of people sharing tasks |
| Member | `members` | Person in a household |
| Task | `tasks` | Recurring chore definition |
| Assignment | `assignments` | Task instance assigned to member |

---

## 2. Table Definitions

### households

Stores household groups. One household per living situation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PK, auto-increment | Unique identifier |
| `owner` | text | not null | Creator's email (per AGENTS.md) |
| `name` | text | not null | Household name (e.g., "Apartment 4B") |
| `inviteCode` | text | not null, unique | 8-char code for joining |
| `createdAt` | integer (timestamp) | not null | Creation timestamp |

**Indexes:**
- `inviteCode` (unique) — for join lookup

---

### members

Stores people belonging to households. Links SDK user to household.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PK, auto-increment | Unique identifier |
| `owner` | text | not null | Member's email (sdk.getUser().email) |
| `householdId` | integer | not null, FK → households.id | Which household |
| `name` | text | not null | Display name |
| `createdAt` | integer (timestamp) | not null | Join timestamp |

**Indexes:**
- `owner` — for getCurrentMember lookup
- `householdId` — for listing household members

**Constraints:**
- One member per email per household (unique: owner + householdId)

---

### tasks

Stores recurring task definitions. Tasks are never deleted, only deactivated.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PK, auto-increment | Unique identifier |
| `householdId` | integer | not null, FK → households.id | Which household |
| `name` | text | not null | Task name (e.g., "Wash dishes") |
| `frequency` | text | not null | 'daily', 'weekly', 'biweekly', 'monthly' |
| `isActive` | integer (boolean) | not null, default true | Soft delete flag |
| `createdAt` | integer (timestamp) | not null | Creation timestamp |

**Indexes:**
- `householdId` + `isActive` — for listing active tasks

---

### assignments

Stores task instances assigned to members. Created by rotation algorithm.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PK, auto-increment | Unique identifier |
| `taskId` | integer | not null, FK → tasks.id | Which task |
| `memberId` | integer | not null, FK → members.id | Assigned to whom |
| `status` | text | not null, default 'pending' | 'pending' or 'completed' |
| `dueDate` | integer (timestamp) | not null | When task is due |
| `completedAt` | integer (timestamp) | nullable | When marked complete |
| `createdAt` | integer (timestamp) | not null | Assignment creation |

**Indexes:**
- `memberId` + `status` — for getMyAssignments
- `taskId` + `status` — for finding current assignment

---

## 3. Relationships

```
households (1) ──────< (many) members
     │
     │
     └──────< (many) tasks
                       │
                       │
                       └──────< (many) assignments
                                        │
                                        │
                               members >┘
```

**Cardinality:**
- Household has many Members (min 1, practical max 20)
- Household has many Tasks (min 0, practical max 100)
- Task has many Assignments (one active at a time)
- Member has many Assignments

---

## 4. Drizzle Schema Code

```typescript
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// Households - groups of people sharing tasks
export const households = sqliteTable("households", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  owner: text("owner").notNull(), // Creator's email
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Members - people in households
export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  owner: text("owner").notNull(), // Member's email
  householdId: integer("household_id").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  uniqueMemberPerHousehold: unique().on(table.owner, table.householdId),
}));

// Tasks - recurring chores
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id").notNull(),
  name: text("name").notNull(),
  frequency: text("frequency").notNull(), // 'daily' | 'weekly' | 'biweekly' | 'monthly'
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Assignments - task instances assigned to members
export const assignments = sqliteTable("assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  memberId: integer("member_id").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'completed'
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

---

## 5. Query Patterns

### Get current member (used by all functions)

```typescript
const member = await db
  .select()
  .from(members)
  .where(eq(members.owner, sdk.getUser().email))
  .limit(1);
```

### Get household with member count

```typescript
const household = await db
  .select()
  .from(households)
  .where(eq(households.id, member.householdId))
  .limit(1);

const memberCount = await db
  .select({ count: count() })
  .from(members)
  .where(eq(members.householdId, member.householdId));
```

### Get my pending assignments with task info

```typescript
const myAssignments = await db
  .select({
    assignment: assignments,
    task: tasks,
  })
  .from(assignments)
  .innerJoin(tasks, eq(assignments.taskId, tasks.id))
  .where(
    and(
      eq(assignments.memberId, member.id),
      eq(assignments.status, "pending")
    )
  )
  .orderBy(assignments.dueDate);
```

### Get all tasks with current assignee

```typescript
const tasksWithAssignee = await db
  .select({
    task: tasks,
    assignment: assignments,
    assigneeName: members.name,
  })
  .from(tasks)
  .leftJoin(
    assignments,
    and(
      eq(assignments.taskId, tasks.id),
      eq(assignments.status, "pending")
    )
  )
  .leftJoin(members, eq(assignments.memberId, members.id))
  .where(
    and(
      eq(tasks.householdId, member.householdId),
      eq(tasks.isActive, true)
    )
  );
```

### Get member completion stats (this week)

```typescript
const weekStart = dayjs().startOf('week').toDate();

const stats = await db
  .select({
    memberId: assignments.memberId,
    completedCount: count(),
  })
  .from(assignments)
  .innerJoin(members, eq(assignments.memberId, members.id))
  .where(
    and(
      eq(members.householdId, member.householdId),
      eq(assignments.status, "completed"),
      gte(assignments.completedAt, weekStart)
    )
  )
  .groupBy(assignments.memberId);
```

### Assignment algorithm: find next member

```typescript
// Get pending counts per member
const pendingCounts = await db
  .select({
    memberId: members.id,
    pendingCount: count(assignments.id),
  })
  .from(members)
  .leftJoin(
    assignments,
    and(
      eq(assignments.memberId, members.id),
      eq(assignments.status, "pending")
    )
  )
  .where(eq(members.householdId, householdId))
  .groupBy(members.id)
  .orderBy(asc(count(assignments.id)));

// First member has lowest count - assign to them
const nextMemberId = pendingCounts[0]?.memberId;
```

---

## 6. Due Date Calculation

Per functional spec, due dates are calculated from task frequency:

```typescript
function calculateDueDate(frequency: string): Date {
  const now = dayjs().tz(getUserTimeZone());
  
  switch (frequency) {
    case 'daily':
      return now.endOf('day').toDate();
    case 'weekly':
      return now.add(7, 'day').endOf('day').toDate();
    case 'biweekly':
      return now.add(14, 'day').endOf('day').toDate();
    case 'monthly':
      return now.add(30, 'day').endOf('day').toDate();
    default:
      return now.endOf('day').toDate();
  }
}
```

---

## 7. Migration Safety

### Safe to add later (additive)
- New columns with defaults
- New tables
- New indexes

### Requires careful migration
- Renaming columns (will be treated as drop + add)
- Changing column types
- Removing columns (data loss)

### MVP schema is final for MVP
- No planned changes during MVP development
- Future features (gamification, preferences) will add new tables

---

## 8. Constraints Validation

| Functional Spec Rule | Database Implementation |
|---------------------|------------------------|
| Task name non-empty | Application validation (not null) |
| Task name max 100 chars | Application validation |
| Household name max 50 chars | Application validation |
| Max 20 members | Application validation |
| Max 100 tasks | Application validation |
| Unique member per household | Unique constraint on (owner, householdId) |
| Unique invite code | Unique constraint on inviteCode |

---

## Summary

**4 tables**, following AGENTS.md patterns:
- `owner` column on `households` and `members` for isolation
- Timestamps as integers with mode: "timestamp"
- Boolean as integer with mode: "boolean"
- No foreign key constraints (SQLite limitation in Drizzle)

**Key design decisions:**
- Soft delete for tasks (`isActive` flag)
- Assignment status as text enum
- Due date stored as timestamp for sorting
- Stats calculated via queries (no denormalization)

Next step: Feature Definition → Implementation
