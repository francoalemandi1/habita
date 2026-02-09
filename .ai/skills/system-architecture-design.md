# Skill: System Architecture Design

## Purpose
Design the technical architecture that defines HOW the system is built. Maps functional requirements to technical components, patterns, and structure.

## When to Use
- After functional specification is complete
- When defining technical patterns for a new project
- Before any implementation begins
- When establishing the technical source of truth

## Input
```yaml
required:
  - .ai/specs/functional-spec.md (entities, rules, flows)
  - Project constraints file (e.g., AGENTS.md, CLAUDE.md)
optional:
  - Existing codebase structure
  - Technology requirements
```

## Output
```yaml
type: Technical architecture document
format: Markdown
location: .ai/specs/architecture-plan.md
```

## Output Structure

### 1. Layer Architecture
Define responsibility of each layer:
```
UI Layer (src/App.tsx)
  - Renders components
  - Manages local UI state
  - Calls server functions

Server Layer (src/server.ts)
  - Business logic
  - Database operations
  - External integrations

Data Layer (src/schema.ts)
  - Database schema
  - Data persistence
```

### 2. Component Map
For each entity in functional spec:
```
Entity: [Name]
  Server Functions:
    - getX: Retrieves X
    - createX: Creates X
    - updateX: Updates X
  Client Components:
    - XList: Displays list of X
    - XItem: Single X display
    - XForm: Create/edit X
  Hooks:
    - useXQuery: Fetches X data
    - useXMutation: Mutates X data
```

### 3. State Management Strategy
- Server state (React Query): What data
- Local state (useState): What UI state
- Optimistic updates: Which mutations

### 4. Data Flow Diagrams
```
User Action → Component → Hook → Server Function → Database
                                      ↓
                              External API (if needed)
```

### 5. Integration Points
- Required tools/APIs
- External services
- Background jobs

### 6. Security Model
- User data isolation strategy
- Authentication requirements
- Input validation approach

### 7. File Structure
```
src/
  App.tsx          # Main UI
  server.ts        # Server functions
  schema.ts        # Database schema
  prompts/         # LLM prompts (if needed)
```

## Reasoning Instructions

You are a senior software architect.

### DO:
- Reference functional spec throughout
- Follow project constraint patterns strictly
- Map every entity to technical components
- Think about data flow end-to-end
- Consider security from the start
- Design for testability

### DO NOT:
- Invent new patterns outside project constraints
- Skip entities from functional spec
- Mix business logic locations
- Ignore security considerations

## Quality Checklist

- [ ] Every entity has server functions defined
- [ ] Every entity has client components defined
- [ ] State management is explicitly decided
- [ ] Data flows are clear
- [ ] Security model is defined
- [ ] File structure is concrete

## Model Recommendation
**Opus** — System design reasoning requires deep analysis.
