# Workflow: New Project

## Trigger
Starting a completely new project from a raw idea.

## Prerequisites
- Raw idea description (text, voice transcript, bullet points)
- Optional: Technology constraints file (CLAUDE.md)

## Agent Sequence

```
1. agent-architecture
   Input: Raw idea
   Output: Complete specification suite
   
   Internal flow:
   - spec-compilation → compiled-prompt.md
   - [HUMAN REVIEW - BLOCKING]
   - functional-analysis → functional-spec.md
   - system-architecture-design → architecture-plan.md
   - data-model-design → data-model.md
   - validate-specs → spec-validation-[date].md
   - [HUMAN REVIEW if conflicts found]

2. agent-ux (optional, recommended)
   Input: functional-spec.md
   Output: ux-decisions.md, updated flows
   
   Trigger: Before implementation, to catch UX issues early

3. agent-feature (per feature in MVP)
   Input: Feature definition + all specs
   Output: Working code
   
   Internal flow:
   - implementation-planning → task-breakdown.md
   - [HUMAN REVIEW of tasks]
   - FOR each task:
       - code-implementation
       - verification (Level 1)
   - verification (Level 2 - full build)

4. agent-review
   Input: Implemented code + specs
   Output: Review report (mode: implementation)
```

## Skills Used
- spec-compilation (Sonnet)
- functional-analysis (Opus)
- system-architecture-design (Opus)
- data-model-design (Opus)
- validate-specs (Opus)
- ux-analysis (Opus)
- implementation-planning (Opus)
- code-implementation (Sonnet)
- verification (Sonnet)
- review (Opus)

## Tools Used
- read-files — Access all file types
- write-specs — Create/update spec documents
- write-code — Implement source code
- run-verification — Execute build commands

## How to Start

Fill the `new-project-template.md` with your raw idea, then:

```
"Use agent-architecture to design the system from this idea:
[paste from template]"
```

## Checkpoints

| After | Human Must | Blocking |
|-------|------------|----------|
| spec-compilation | Answer questions, validate assumptions, confirm scope | **YES** |
| functional-spec | Review entities, rules, flows | No |
| architecture-plan | Confirm patterns, review security | No |
| validate-specs | Resolve any conflicts found | **YES** if conflicts |
| task-breakdown | Verify tasks are correct and ordered | No |
| Each feature | Verify acceptance criteria met | No |
| agent-review | Address critical issues before deploy | **YES** if critical |

## Error Handling

### Spec Compilation Fails
- Check input quality
- Provide more context to raw idea
- Retry with clearer requirements

### Validation Finds Conflicts
- Review the conflict report
- Update specs to resolve inconsistencies
- Re-run validation

### Implementation Fails
- Check task breakdown for missing steps
- Verify schema is correctly migrated
- Review error messages in verification

### Build Fails After Implementation
- Run typecheck to identify errors
- Fix one file at a time
- Re-verify after each fix

## Outputs Created

```
.ai/
  context/
    compiled-prompt.md
    task-breakdown.md
    migration-plan-[date].md (if schema changes)
  specs/
    functional-spec.md
    architecture-plan.md
    data-model.md
    ux-decisions.md
  reviews/
    spec-validation-[date].md
    review-[feature]-[date].md
    
src/
  schema.ts
  server.ts
  App.tsx
  prompts/
```
