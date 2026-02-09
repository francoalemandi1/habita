# Skill: UX Analysis

## Purpose
Analyze and refine user experience critically. Identify UX problems in specifications or implementations and propose improvements with clear rationale.

## When to Use
- After initial functional spec, before implementation
- When testing reveals UX issues
- During implementation when better approaches become apparent
- When evaluating existing flows against user needs

## Input
```yaml
required:
  - .ai/specs/functional-spec.md (current flows)
  - UX concern or improvement opportunity
optional:
  - User feedback
  - Competitive analysis
  - Developer observations
```

## Output
```yaml
type: UX decision documentation
format: Markdown
location: .ai/specs/ux-decisions.md (append)
```

## UX Problem Categories

### Cold Start Problems
- Empty states that don't demonstrate value
- No guidance for first-time users
- Missing onboarding context

### Friction Problems
- Too many steps before user sees benefit
- Unnecessary decisions required
- Complex input requirements

### Missed Opportunities
- Places where AI/automation could reduce effort
- Manual processes that could be intelligent
- Data entry that could be inferred

### Flow Problems
- Paths that confuse users
- Dead ends or unclear next steps
- Inconsistent patterns

## Output Format

```markdown
## Decision XXX: [Title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Approved | Implemented | Superseded
**Affects**: [What parts of the system]

### Problem Statement
[What's wrong with the current approach - be specific]

### Decision
[What we decided to do - be concrete]

### Rationale
[Why this is the best approach]

### Alternatives Considered
1. **[Alternative 1]**
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Rejected because: [Reason]

2. **[Alternative 2]**
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Rejected because: [Reason]

### Trade-offs
[What we're giving up with this decision]

### Implementation Notes
[Any guidance for implementing this decision]
```

## Analysis Process

1. **Identify the problem clearly**
   - What specific UX issue exists?
   - Who is affected?
   - What's the impact?

2. **Analyze root cause**
   - Why does current design fail?
   - What assumption was wrong?

3. **Propose alternatives** (minimum 2-3)
   - Different approaches to solve the problem
   - Consider varying levels of effort

4. **Evaluate trade-offs**
   - Pros and cons of each option
   - Implementation complexity
   - User impact

5. **Make and document decision**
   - Clear rationale
   - Acknowledge trade-offs

## Reasoning Instructions

You are a UX/product expert.

### DO:
- Think from user's perspective
- Consider the full user journey
- Propose creative alternatives
- Document rationale clearly
- Consider implementation feasibility

### DO NOT:
- Accept poor UX as "good enough"
- Propose without alternatives
- Skip trade-off analysis
- Ignore implementation constraints
- Make decisions without documenting

## Quality Checklist

- [ ] Problem is specific and well-defined
- [ ] Multiple alternatives considered
- [ ] Trade-offs acknowledged
- [ ] Decision has clear rationale
- [ ] Implementation guidance provided

## Model Recommendation
**Opus** — Product thinking and creative problem solving required.
