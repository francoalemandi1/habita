# Feature Breakdown Prompt (Opus)

You are breaking down a feature into implementable tasks.

## Prerequisites (READ ALL BEFORE PROCEEDING)

1. `.ai/specs/functional-spec.md` - System definition
2. `.ai/specs/architecture-plan.md` - Technical architecture  
3. `.ai/specs/data-model.md` - Database schema
4. `.ai/context/feature.yaml` - Feature to implement
5. `AGENTS.md` - Technical patterns

## Feature Reference

- **Feature**: {{FEATURE_NAME}}
- **Description**: {{FEATURE_DESC}}
- **User Story**: {{USER_STORY}}
- **Acceptance Criteria**: {{ACCEPTANCE_CRITERIA}}

## Your Tasks

Break down into ordered, small, verifiable steps.

### Task Requirements

Each task must:
- Affect 1-2 files maximum
- Be independently verifiable
- Follow architecture-plan.md patterns
- Use schema from data-model.md
- Respect AGENTS.md constraints

### Ordering (ALWAYS)

1. Schema changes (if any)
2. Server functions (data layer)
3. Client components (UI layer)
4. Integration and polish

## Output Format

```
## Task 1: [Title]
**Files**: src/schema.ts
**Action**: Add/modify table X
**Pattern**: Reference from architecture-plan.md
**Verification**: `bun run typecheck`

## Task 2: [Title]
**Files**: src/server.ts
**Action**: Add serverFunction Y
**Pattern**: Reference from architecture-plan.md
**Verification**: `dreamer call-server functionName '{}'`

## Task 3: [Title]
**Files**: src/App.tsx
**Action**: Add component Z
**Pattern**: Reference from architecture-plan.md
**Verification**: UI renders, data loads
```

**DO NOT write code.** Only the task breakdown.
