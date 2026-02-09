# Skill: Implementation Planning

## Purpose
Break down a feature into ordered, small, verifiable implementation tasks. Creates the execution plan for developers or implementation agents.

## When to Use
- Before implementing any feature
- After specs are complete (functional, architecture, data model)
- When a feature needs clear step-by-step guidance
- When coordinating work across multiple files

## Input
```yaml
required:
  - .ai/specs/functional-spec.md
  - .ai/specs/architecture-plan.md
  - .ai/specs/data-model.md
  - Feature definition (name, description, acceptance criteria)
optional:
  - Existing codebase context
  - Project constraints file
```

## Output
```yaml
type: Ordered task breakdown
format: Markdown
location: .ai/context/task-breakdown.md
```

## Output Structure

```markdown
# Task Breakdown: [Feature Name]

## Overview
- Feature: [Name]
- Description: [Brief]
- Acceptance Criteria: [List]

## Implementation Order

### Task 1: [Title]
**Files**: [file1.ts, file2.ts]
**Action**: [What to do]
**Pattern**: [Reference from architecture-plan.md]
**Verification**: [How to verify completion]
**Dependencies**: None

### Task 2: [Title]
**Files**: [file.ts]
**Action**: [What to do]
**Pattern**: [Reference]
**Verification**: [Command or check]
**Dependencies**: Task 1

[... continue for all tasks]

## Verification Checklist
- [ ] All tasks complete
- [ ] TypeScript compiles: `bun run typecheck`
- [ ] Build succeeds: `bun run build`
- [ ] Acceptance criteria met
```

## Task Requirements

Each task MUST:
- Affect 1-2 files maximum
- Be independently verifiable
- Have clear completion criteria
- Reference architecture patterns
- List dependencies on other tasks

## Ordering Rules (ALWAYS follow)

1. **Schema changes first** (if any database changes)
2. **Server functions second** (data layer)
3. **Client components third** (UI layer)
4. **Integration and polish last** (connecting pieces)

## Reasoning Instructions

You are breaking down a feature into implementable tasks.

### DO:
- Read all specs before breaking down
- Keep tasks small (1-2 files)
- Make tasks independently verifiable
- Order by dependency (schema → server → client)
- Reference patterns from architecture plan
- Include verification steps

### DO NOT:
- Write actual code (only describe tasks)
- Create large, multi-file tasks
- Skip verification steps
- Ignore dependencies between tasks
- Break ordering rules

## Quality Checklist

- [ ] All acceptance criteria covered by tasks
- [ ] Tasks ordered by dependency
- [ ] Each task has verification method
- [ ] Tasks reference architecture patterns
- [ ] No task touches more than 2 files

## Model Recommendation
**Opus** — Task decomposition requires judgment about dependencies and scope.
