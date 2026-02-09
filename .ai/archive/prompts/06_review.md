# Code Review Prompt (Codex/Opus)

You are reviewing implemented code for quality and compliance.

## Prerequisites

1. `.ai/specs/functional-spec.md` - Business requirements
2. `.ai/specs/architecture-plan.md` - Technical patterns
3. `.ai/specs/data-model.md` - Schema design
4. `AGENTS.md` - Coding standards

## Review Checklist

### 1. Architecture Compliance
- [ ] Follows layer separation from architecture-plan.md
- [ ] Server functions match defined patterns
- [ ] Client components follow React Query patterns
- [ ] No business logic in UI layer

### 2. Data Model Compliance
- [ ] Uses schema as defined in data-model.md
- [ ] Owner column present on user tables
- [ ] Proper foreign key relationships

### 3. Code Quality (AGENTS.md)
- [ ] No `any` types
- [ ] Proper TypeScript typing
- [ ] No inline LLM prompts (uses templates)
- [ ] Day.js for dates (no native Date)
- [ ] Uses agentQueryClient (no custom QueryClient)

### 4. Business Rules
- [ ] Implements rules from functional-spec.md
- [ ] Acceptance criteria met
- [ ] Edge cases handled

### 5. Security
- [ ] User data properly isolated by owner
- [ ] Input validation present
- [ ] No sensitive data exposure

## Output Format

```
## Review Summary

**Status**: PASS / NEEDS CHANGES

### Compliance
- Architecture: ✅/❌ [notes]
- Data Model: ✅/❌ [notes]
- Code Quality: ✅/❌ [notes]
- Business Rules: ✅/❌ [notes]
- Security: ✅/❌ [notes]

### Issues Found
1. [Issue description + file:line + fix suggestion]
2. ...

### Recommendations
- [Optional improvements, not blockers]
```
