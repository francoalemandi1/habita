# Workflow: New Feature

## Trigger
Implementing a new feature in an existing project with specs.

## Prerequisites
- .ai/specs/functional-spec.md exists
- .ai/specs/architecture-plan.md exists
- .ai/specs/data-model.md exists
- Feature definition (from template or description)

## Agent Sequence

```
1. Pre-check: Validate Prerequisites
   - Verify all specs exist
   - IF missing: suggest agent-architecture first
   - Check if feature requires schema changes

2. IF schema changes needed:
   - Use skill: schema-migration
   - Output: migration-plan.md
   - [HUMAN REVIEW for HIGH risk migrations]
   - Execute migration

3. agent-feature
   Input: Feature definition + all specs
   Output: Working code
   
   Internal flow:
   - Read all specs via read-files
   - implementation-planning → task-breakdown.md
   - [HUMAN REVIEW of tasks]
   - FOR each task:
       - code-implementation
       - verification (Level 1 - typecheck)
   - verification (Level 2 - full build)

4. agent-review (recommended)
   Input: Implemented code + specs
   Output: Review report (mode: implementation)
```

## Skills Used
- schema-migration (Opus) — If schema changes needed
- implementation-planning (Opus)
- code-implementation (Sonnet)
- verification (Sonnet)
- review (Opus)
- ux-analysis (Opus) — If UX issues arise

## Tools Used
- read-files — Access specs and source code
- write-specs — Save task breakdown
- write-code — Implement changes
- run-verification — Validate after tasks

## How to Start

Fill the `feature-request-template.md`, then:

```
"Use agent-feature to implement:
[paste from template]"
```

## If Schema Changes Needed

Before implementing, check if feature needs database changes:

```
1. Compare feature requirements with current schema
2. IF changes needed:
   - Run schema-migration skill
   - Review migration plan
   - Execute migration
   - Verify schema is correct
3. THEN proceed with implementation
```

## If UX Issues Arise

During implementation, if UX problems are discovered:

```
1. Pause implementation (mark current task BLOCKED)
2. Invoke agent-ux with the concern
3. Document decision in ux-decisions.md
4. Update functional-spec.md if flows change
5. Update task breakdown if needed
6. Resume implementation
```

## Checkpoints

| After | Verify | Blocking |
|-------|--------|----------|
| schema-migration | Migration plan is safe | **YES** for HIGH risk |
| task-breakdown | Tasks make sense, ordered correctly | No |
| Each task | TypeScript compiles | **YES** |
| All tasks | Full build passes | **YES** |
| agent-review | No critical issues | **YES** if critical |

## Error Handling

### Missing Specs
- Cannot proceed without specs
- Recommend agent-architecture first
- Or provide missing specs manually

### Schema Migration Fails
- Check migration plan
- Verify data compatibility
- Consider phased migration

### Task Implementation Fails
- Check error messages carefully
- May indicate spec inconsistency
- Consider running validate-specs

### Build Fails
- Identify failing task
- Fix and re-verify that task
- Then continue with remaining tasks

## Outputs Created

```
.ai/
  context/
    task-breakdown.md
    migration-plan-[date].md (if schema changes)
    verification-feature-[date].md
  reviews/
    review-[feature]-[date].md
    
src/
  [modified files per task]
```
