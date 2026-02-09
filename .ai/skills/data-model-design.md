# Skill: Data Model Design

## Purpose
Design the database schema and data relationships. Maps domain entities to tables with proper typing, relationships, and constraints.

## When to Use
- After architecture plan is complete
- When defining database schema for a new project
- Before any data layer implementation
- When persistence strategy needs documentation

## Input
```yaml
required:
  - .ai/specs/functional-spec.md (entities, business rules)
  - .ai/specs/architecture-plan.md (technical context)
  - Project constraints file (ORM patterns)
```

## Output
```yaml
type: Data model specification
format: Markdown with code examples
location: .ai/specs/data-model.md
```

## Output Structure

### 1. Entity to Table Mapping
```
Entity: [Name] (from functional spec)
Table: [table_name]
  Columns:
    - id: integer, primary key, auto-increment
    - owner: text, not null (user isolation)
    - [field]: [type], [constraints]
    - createdAt: integer (timestamp)
    - updatedAt: integer (timestamp)
```

### 2. Relationships
```
[table_a] (1) → (many) [table_b]
  Foreign key: table_b.table_a_id → table_a.id
```

### 3. Indexes
```
Index: [table]_[columns]_idx
  Purpose: [What query this optimizes]
  Columns: [column1, column2]
```

### 4. Constraints
From business rules:
```
- [Constraint description]
  Implementation: [How enforced in schema]
```

### 5. Schema Code
Complete, working schema code:
```typescript
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const tableName = sqliteTable("table_name", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  owner: text("owner").notNull(),
  // ... all columns
}, (table) => ({
  // ... constraints
}));
```

### 6. Migration Considerations
- Safe to add later
- Requires data migration
- Breaking changes

## Reasoning Instructions

You are a senior data architect.

### DO:
- Map every entity from functional spec to a table
- Include owner column for user data isolation
- Add proper timestamps (createdAt, updatedAt where needed)
- Define relationships explicitly
- Include working schema code
- Consider query patterns for indexes

### DO NOT:
- Skip entities from functional spec
- Forget user isolation (owner column)
- Leave relationships implicit
- Use raw SQL patterns when ORM is available
- Ignore business rule constraints

## Quality Checklist

- [ ] Every entity has a table
- [ ] Owner column present on user data tables
- [ ] Relationships properly defined
- [ ] Indexes support expected queries
- [ ] Business rules enforced via constraints
- [ ] Schema code is valid and complete

## Model Recommendation
**Opus** — Schema design requires full context understanding.
