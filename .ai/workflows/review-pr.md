# Workflow: Review PR

## Trigger
Reviewing a pull request before merge.

## Prerequisites
- PR diff or branch available
- Optional: Spec documents for context (recommended)

## Agent Sequence

```
1. agent-review (mode: pr)
   Input: PR diff + optional specs
   Output: PR review feedback
   
   Internal flow:
   - scan-pr-changes (analyze diff)
   - read-files (specs if available)
   - review skill (mode: pr)
   - Produce feedback with decision
```

## Skills Used
- review (Opus) — mode: pr

## Tools Used
- scan-pr-changes — Analyze PR diff
- read-files — Access specs if available

## How to Start

With branch name:
```
"Review this PR:
- Branch: feature/my-feature
- Description: [what it does]
- Related: [issue number if any]"
```

With GitHub PR:
```
"Review PR #123"
```

With local diff:
```
"Review these changes:
[paste diff or file list]"
```

## Review Dimensions

1. **Change Analysis**
   - What is the PR accomplishing?
   - Does it achieve its goal?
   - Any unintended side effects?
   - Risk level assessment

2. **Code Quality**
   - Clean, readable code
   - Proper error handling
   - TypeScript types correct (no `any`)
   - Logging present

3. **Spec Compliance** (if specs exist)
   - Architecture patterns followed
   - Business rules implemented
   - Data model usage correct

4. **Security**
   - Input validation
   - Data exposure
   - Auth/authz
   - Owner column used correctly

5. **Breaking Changes**
   - API changes documented
   - Schema migrations handled
   - Backward compatibility

## Output Format

```markdown
# PR Review: [PR Title]

**Date**: YYYY-MM-DD
**Mode**: PR Review
**Decision**: APPROVE | REQUEST CHANGES | COMMENT

## Summary
[Overview and assessment]

## Scope Analysis
- Files changed: [count]
- Lines added/removed: [+X/-Y]
- Risk level: LOW | MEDIUM | HIGH

## Detailed Feedback

### Must Address (Blocking)
[Issues that must be fixed before merge]

### Should Address (Non-blocking)
[Issues that should be fixed but aren't blockers]

### Nice to Have
[Optional improvements]

## Questions
[Clarifying questions for the author]
```

## Decision Criteria

| Decision | When |
|----------|------|
| **Approve** | No critical issues, code is production-ready |
| **Request Changes** | Critical issues must be fixed before merge |
| **Comment** | Questions or discussion needed, not blocking |

## Error Handling

### Cannot Access PR
- Check PR reference (number, URL, branch)
- Try alternative access method
- Ask for diff directly if needed

### Missing Specs
- Proceed with limited review (code quality only)
- Document what couldn't be verified
- Note "Unable to verify spec compliance"

### Large PR
- Focus on most critical changes first
- Consider requesting PR split
- Document which areas were reviewed
