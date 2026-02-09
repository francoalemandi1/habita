# Data Model Prompt (Opus)

You are a senior data architect designing the persistence layer.

## Prerequisites

- Read `.ai/specs/functional-spec.md` for entities and business rules
- Read `.ai/specs/architecture-plan.md` for technical context
- Read `AGENTS.md` for Drizzle ORM patterns

## Purpose

This document defines the database schema and data relationships.
Written ONCE per project, after architecture plan.

## Your Tasks

### 1. Entity to Table Mapping
For each entity in functional spec:
```
Entity: Task (from functional spec)
Table: tasks
  - id: integer, primary key, auto-increment
  - owner: text, not null (user email for isolation)
  - title: text, not null
  - completed: integer (boolean), default false
  - projectId: integer, foreign key to projects
  - createdAt: integer (timestamp)
  - updatedAt: integer (timestamp)
```

### 2. Relationships
```
projects (1) → (many) tasks
users (implicit via owner column)
```

### 3. Indexes
What queries need to be fast?
```
- tasks by owner (filtering user data)
- tasks by projectId (listing project tasks)
- tasks by completed status (filtering)
```

### 4. Constraints
From business rules:
```
- owner is required on all user tables
- title cannot be empty
- projectId must reference existing project
```

### 5. Migration Safety
- What's safe to add later?
- What requires data migration?

### 6. Sample Schema Code
```typescript
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  owner: text("owner").notNull(),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  projectId: integer("project_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

## Output Format

Write to `.ai/specs/data-model.md`

Include both conceptual model and Drizzle schema code.
Follow AGENTS.md database patterns.
