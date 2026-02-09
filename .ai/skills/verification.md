# Skill: Verification

## Purpose
Comprehensive verification of implementation correctness. Validates that code compiles, builds, and behaves according to specifications.

## When to Use
- After each implementation task
- Before marking a feature complete
- After schema migrations
- Before PR submission
- During code review

## Input
```yaml
required:
  - Code to verify (files or changes)
  - Verification scope: "task" | "feature" | "full"
optional:
  - .ai/specs/functional-spec.md (for behavior verification)
  - Acceptance criteria
  - Previous verification results
```

## Output
```yaml
type: Verification report
format: Markdown
location: .ai/context/verification-[scope]-[date].md
```

## Verification Levels

### Level 1: Compile Check (Task)
Run after each task completion.
```bash
bun run typecheck
```
- Must pass before proceeding
- Fix errors immediately

### Level 2: Build Check (Feature)
Run after feature implementation.
```bash
bun run build
```
- Must pass before feature is considered complete
- Includes bundling and optimization

### Level 3: Integration Check (Full)
Run before major milestones.
```bash
bun run typecheck && bun run build && dreamer push --dry-run
```
- Validates full system integration
- Checks deployment readiness

### Level 4: Behavior Check (Acceptance)
Manual or automated verification against specs.
- Compare behavior to functional-spec.md
- Verify acceptance criteria
- Test edge cases

## Verification Process

### Task Verification
```
1. Run typecheck
2. IF fails:
   → Read error messages
   → Identify root cause
   → Fix the code
   → Retry (max 3 times)
   → IF still fails: mark task BLOCKED
3. IF passes:
   → Mark task COMPLETE
   → Proceed to next task
```

### Feature Verification
```
1. Run typecheck (Level 1)
2. IF passes: Run build (Level 2)
3. IF passes: Check against acceptance criteria
4. Document verification results
5. IF any fails:
   → Identify failing tasks
   → Re-implement as needed
   → Re-verify
```

### Full Verification
```
1. Run all Level 1-3 checks
2. Compare implementation to specs:
   - Read functional-spec.md
   - For each user flow: verify behavior
   - For each business rule: verify implementation
3. Document verification report
```

## Common Error Patterns

### TypeScript Errors
| Error Pattern | Likely Cause | Fix Approach |
|--------------|--------------|--------------|
| Type 'X' not assignable | Wrong type used | Check schema/interface |
| Property 'X' missing | Incomplete object | Add missing properties |
| Cannot find module | Missing import | Add import statement |
| 'X' is possibly undefined | Null safety | Add null check |

### Build Errors
| Error Pattern | Likely Cause | Fix Approach |
|--------------|--------------|--------------|
| Module not found | Import path wrong | Fix relative path |
| Unexpected token | Syntax error | Check file for typos |
| Out of memory | Bundle too large | Check circular deps |

### Schema Errors
| Error Pattern | Likely Cause | Fix Approach |
|--------------|--------------|--------------|
| Column not found | Schema mismatch | Sync schema.ts with DB |
| Foreign key violation | Data integrity | Check relationships |
| Unique constraint | Duplicate data | Handle uniqueness |

## Output Format

```markdown
# Verification Report: [Scope]

**Date**: YYYY-MM-DD
**Level**: Task | Feature | Full
**Status**: PASS | FAIL

## Checks Performed

| Check | Status | Details |
|-------|--------|---------|
| TypeScript | ✅/❌ | [Error count or "Clean"] |
| Build | ✅/❌ | [Build time or error] |
| Integration | ✅/❌ | [Status] |
| Acceptance | ✅/❌ | [X/Y criteria met] |

## Errors Found

### TypeScript Errors
```
[Exact error output if any]
```

### Build Errors
```
[Exact error output if any]
```

## Acceptance Criteria Status

| Criteria | Status | Notes |
|----------|--------|-------|
| [Criteria 1] | ✅/❌ | [How verified] |
| [Criteria 2] | ✅/❌ | [How verified] |

## Issues to Address
1. [Issue and location]
2. [Issue and location]

## Recommendations
[Next steps if issues found]
```

## Reasoning Instructions

You are a QA engineer verifying implementation correctness.

### DO:
- Run verification after EVERY change
- Read error messages carefully
- Trace errors to root cause
- Document all issues found
- Verify against specs, not just compilation

### DO NOT:
- Skip verification steps
- Proceed with failing code
- Assume "it probably works"
- Ignore warnings
- Mark complete without full verification

## Model Recommendation
**Sonnet** — Systematic checking, not deep reasoning.
