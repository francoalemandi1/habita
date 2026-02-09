# Skill: Review

## Purpose
Review code for quality, specification compliance, and potential issues. Unified skill for implementation reviews, PR reviews, and architecture audits.

## When to Use
- After feature implementation is complete
- Before merging PRs
- During code quality audits
- When validating code against specifications

## Input
```yaml
required:
  - Code to review (files, diff, or PR reference)
  - review_mode: "implementation" | "pr" | "audit"
optional:
  - .ai/specs/functional-spec.md
  - .ai/specs/architecture-plan.md
  - .ai/specs/data-model.md
  - Feature acceptance criteria
  - Previous review feedback
  - Related issue/ticket
```

## Output
```yaml
type: Review report
format: Markdown
location:
  implementation: .ai/reviews/review-[feature]-[date].md
  pr: PR comments or .ai/reviews/pr-[number]-[date].md
  audit: .ai/reviews/audit-[date].md
```

## Review Modes

### Implementation Review
Full review against all specifications after feature completion.
- Requires all spec documents
- Checks all compliance dimensions
- Produces detailed report with fixes

### PR Review
Focused review of changes in a pull request.
- Requires PR diff/branch
- Specs optional but recommended
- Focus on changed areas and their impact
- Produces approval/rejection with feedback

### Architecture Audit
Comprehensive check of codebase against architectural patterns.
- Requires architecture-plan.md
- Scans entire codebase
- Identifies pattern violations
- Produces compliance report

## Review Dimensions

### 1. Architecture Compliance
- [ ] Follows layer separation from architecture-plan.md
- [ ] Server functions match defined patterns
- [ ] Client components follow state management patterns
- [ ] No business logic in UI layer
- [ ] Data flows match architecture diagrams

### 2. Data Model Compliance
- [ ] Uses schema as defined in data-model.md
- [ ] Owner column present and used on user tables
- [ ] Proper foreign key relationships
- [ ] Queries match expected indexes

### 3. Code Quality
- [ ] No `any` types
- [ ] Proper TypeScript typing throughout
- [ ] No inline LLM prompts (uses templates)
- [ ] Day.js for dates (no native Date)
- [ ] Uses framework patterns (agentQueryClient, etc.)
- [ ] Console.log for debugging present
- [ ] Error handling appropriate

### 4. Business Rule Compliance
- [ ] Implements rules from functional-spec.md
- [ ] Acceptance criteria met
- [ ] Edge cases handled per spec
- [ ] User flows work as documented

### 5. Security
- [ ] User data properly isolated by owner
- [ ] Input validation present
- [ ] No sensitive data exposure
- [ ] No SQL injection vectors

### 6. Breaking Changes (PR/Audit only)
- [ ] API changes documented
- [ ] Schema migrations handled
- [ ] Backward compatibility maintained

## Output Format

### Implementation Review
```markdown
# Code Review: [Feature Name]

**Date**: YYYY-MM-DD
**Mode**: Implementation Review
**Status**: PASS | NEEDS CHANGES

## Summary
[Brief overview of what was reviewed]

## Compliance Matrix

| Dimension | Status | Notes |
|-----------|--------|-------|
| Architecture | ✅/❌ | [Details] |
| Data Model | ✅/❌ | [Details] |
| Code Quality | ✅/❌ | [Details] |
| Business Rules | ✅/❌ | [Details] |
| Security | ✅/❌ | [Details] |

## Issues Found

### Critical (Must Fix)
1. **[Issue Title]**
   - File: `path/to/file.ts:line`
   - Problem: [Description]
   - Fix: [How to fix]

### Warnings (Should Fix)
1. **[Issue Title]**
   - File: `path/to/file.ts:line`
   - Problem: [Description]
   - Suggestion: [Recommended fix]

## Recommendations
[Optional improvements that aren't blockers]

## Verification Steps
[How to verify fixes were applied correctly]
```

### PR Review
```markdown
# PR Review: [PR Title]

**Date**: YYYY-MM-DD
**Mode**: PR Review
**Decision**: APPROVE | REQUEST CHANGES | COMMENT

## Summary
[What this PR does and overall assessment]

## Scope Analysis
- Files changed: [count]
- Lines added/removed: [+X/-Y]
- Risk level: LOW | MEDIUM | HIGH

## Detailed Feedback

### Must Address (Blocking)
- [ ] **[Issue]** in `file:line`
  - Problem: [Description]
  - Suggestion: [Fix]

### Should Address (Non-blocking)
- [ ] **[Issue]** in `file:line`
  - Suggestion: [Improvement]

### Nice to Have
- [Optional improvements]

## Questions
- [Any clarifying questions for the author]

## Testing Verification
- [ ] [What was verified]
- [ ] [What should be tested]
```

### Architecture Audit
```markdown
# Architecture Audit Report

**Date**: YYYY-MM-DD
**Mode**: Architecture Audit
**Overall Compliance**: [X]%

## Pattern Compliance Summary

| Pattern | Expected | Found | Compliance |
|---------|----------|-------|------------|
| Layer separation | Yes | Yes/No | ✅/❌ |
| State management | React Query | [Actual] | ✅/❌ |
| Data isolation | Owner column | [Actual] | ✅/❌ |
| ... | ... | ... | ... |

## Violations Found

### Critical
[Violations that break architecture]

### Warnings
[Deviations that should be addressed]

## Recommendations
[How to improve architectural compliance]
```

## Reasoning Instructions

You are a senior engineer performing code review.

### DO:
- Check against all specification documents when available
- Be specific about file and line numbers
- Provide actionable fix suggestions
- Distinguish critical vs nice-to-have issues
- Verify business rules are implemented correctly
- Understand the full context of changes
- Consider edge cases and error paths
- Acknowledge good work

### DO NOT:
- Approve code that violates specs
- Be vague about issues
- Skip security review
- Ignore edge cases
- Nitpick style when patterns are followed
- Block PRs for personal preferences
- Merge without understanding the change

## Model Recommendation
**Opus** — Deep analysis and judgment required for thorough review.
