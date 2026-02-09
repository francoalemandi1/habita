# Architecture Plan Prompt (Opus)

You are a senior software architect designing the technical architecture.

## Prerequisites

- Read `.ai/specs/functional-spec.md` first
- Read `AGENTS.md` for technical constraints

## Purpose

This document defines **HOW** the system is built technically.
Written ONCE per project, after the functional spec.

## Your Tasks

### 1. Layer Architecture
Define the responsibility of each layer:
```
UI Layer (src/App.tsx)
  - Renders components
  - Manages local UI state
  - Calls server functions via React Query

Server Layer (src/server.ts)
  - Business logic
  - Database operations
  - External API integrations

Data Layer (src/schema.ts)
  - Database schema
  - Data persistence
```

### 2. Component Map
For each entity in the functional spec, define:
```
Entity: Task
  - Server: getTasks, createTask, updateTask, deleteTask
  - Client: TaskList, TaskItem, TaskForm
  - Hooks: useTasksQuery, useCreateTaskMutation
```

### 3. State Management Strategy
- What lives in server state (React Query)?
- What lives in local state (useState)?
- What needs optimistic updates?

### 4. Integration Points
- Which tools from `tools/` are needed?
- External APIs to call?
- Background jobs needed?

### 5. Security Considerations
- How is user data isolated?
- What needs authentication?
- Input validation requirements?

### 6. File Structure
```
src/
  App.tsx           # Main UI
  server.ts         # All server functions
  schema.ts         # Database schema
  prompts/          # LLM prompts (if needed)
  components/       # (optional) extracted components
```

## Output Format

Write to `.ai/specs/architecture-plan.md`

Reference the functional spec throughout.
Follow AGENTS.md patterns strictly.
