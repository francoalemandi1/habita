# Skill: Code Implementation

## Purpose
Implement a specific task from a task breakdown. Write production-ready code that follows established patterns and passes verification.

## When to Use
- Implementing a task from task-breakdown.md
- Writing code that must follow specific patterns
- When context from specs is required
- Executing one step of a larger feature

## Input
```yaml
required:
  - Task description (from task-breakdown.md)
  - .ai/specs/functional-spec.md
  - .ai/specs/architecture-plan.md
  - .ai/specs/data-model.md
  - Project constraints file
optional:
  - Existing code context
  - Previous task implementations
```

## Output
```yaml
type: Production code changes
format: TypeScript/TSX files
location: As specified in task (typically src/)
```

## Implementation Process

### Before Writing Code

1. **Read the task requirements**
   - What files to modify
   - What action to take
   - What pattern to follow

2. **Read relevant existing files**
   - Understand current state
   - Identify insertion points
   - Note existing patterns

3. **Identify the exact pattern**
   - From architecture-plan.md
   - From project constraints
   - From existing similar code

### While Writing Code

1. **Follow patterns strictly**
   - Use existing naming conventions
   - Match existing code style
   - Follow project constraints

2. **Write production-ready code**
   - Proper TypeScript types (no `any`)
   - Error handling where appropriate
   - Console.log for debugging

3. **Handle edge cases**
   - Per business rules from functional-spec
   - Null/undefined handling
   - Error states

### After Writing Code

1. **Verify**
   - Run typecheck: `bun run typecheck`
   - Run build: `bun run build`
   - Test manually if needed

## Code Quality Rules

### MUST:
- Use proper TypeScript types
- Follow naming conventions from specs
- Handle edge cases per business rules
- Add console.log for debugging
- Match existing code patterns

### MUST NOT:
- Use `any` types
- Inline LLM prompts (use templates)
- Use native Date (use Day.js)
- Create custom QueryClient (use agentQueryClient)
- Invent new patterns

## Reasoning Instructions

You are implementing a specific step.

### DO:
- Read specs first, understand context
- Follow architecture patterns exactly
- Write minimal code for this task only
- Include proper error handling
- Add logging for debuggability

### DO NOT:
- Over-engineer or add extras
- Skip reading existing code
- Ignore project constraints
- Write code beyond task scope
- Leave TypeScript errors

## Verification Checklist

- [ ] Code compiles: `bun run typecheck`
- [ ] Build succeeds: `bun run build`
- [ ] Follows architecture patterns
- [ ] Uses schema correctly
- [ ] Handles edge cases
- [ ] No `any` types

## Model Recommendation
**Sonnet** — This is execution, not invention. Fast model is appropriate.
