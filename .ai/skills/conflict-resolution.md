# Skill: Conflict Resolution

## Purpose
Resolve conflicts that cannot be automatically fixed: when two valid interpretations exist, when specs contradict with good reason, or when trade-offs must be made.

## When to Use
- validate-specs finds conflicts where both sides are valid
- Human answers contradict each other
- Architecture constraints conflict with feature requirements
- Two features have incompatible needs
- Performance vs. simplicity trade-offs
- Security vs. usability trade-offs

## Input
```yaml
required:
  - Conflict description
  - Both positions/options clearly stated
  - Context for why conflict exists
optional:
  - Previous decisions on similar conflicts
  - Stakeholder preferences
  - Technical constraints
```

## Output
```yaml
type: Conflict Resolution Decision
format: Markdown
location: .ai/specs/decisions/decision-[number]-[date].md
```

---

## Conflict Categories

### 1. Spec vs. Spec
Two specification documents disagree.

**Resolution approach:**
1. Identify which spec is "source of truth" for this topic
2. Determine if conflict is due to evolution (spec outdated)
3. If both are current, escalate to human with trade-off analysis

### 2. Requirement vs. Requirement  
Two features have incompatible needs.

**Resolution approach:**
1. Check if both features are MVP (if one isn't, defer it)
2. Look for compromise solution that partially satisfies both
3. If no compromise, present priority question to human

### 3. Constraint vs. Goal
Architecture/technical constraint prevents desired outcome.

**Resolution approach:**
1. Verify constraint is real (not assumed)
2. Explore workarounds that respect constraint
3. Calculate cost of removing constraint
4. Present options: accept limitation, change architecture, or find middle ground

### 4. Trade-off Conflicts
Two desirable qualities are in tension.

**Common trade-offs:**
- Performance vs. Simplicity
- Security vs. Usability  
- Flexibility vs. Consistency
- Speed vs. Quality
- Now vs. Later

**Resolution approach:**
1. Make the trade-off explicit
2. Estimate impact of each choice
3. Recommend based on project values
4. Document rationale for future reference

---

## Resolution Framework

### Step 1: Clarify the Conflict

```markdown
## Conflict Statement

**Topic**: [What is being decided]

**Position A**: [First option/interpretation]
- Source: [Where this comes from]
- Argument: [Why this is valid]

**Position B**: [Second option/interpretation]
- Source: [Where this comes from]
- Argument: [Why this is valid]

**Why They Conflict**: [Explain the incompatibility]
```

### Step 2: Analyze Trade-offs

```markdown
## Trade-off Analysis

### If We Choose Position A:
- ✅ Benefits: [list]
- ❌ Costs: [list]
- ⚠️ Risks: [list]
- 📊 Impact: [LOW/MEDIUM/HIGH]

### If We Choose Position B:
- ✅ Benefits: [list]
- ❌ Costs: [list]
- ⚠️ Risks: [list]
- 📊 Impact: [LOW/MEDIUM/HIGH]

### If We Try to Compromise:
- Possible middle ground: [description]
- What we'd sacrifice: [list]
- Viability: [assessment]
```

### Step 3: Apply Decision Criteria

```markdown
## Decision Criteria

| Criterion | Weight | Position A | Position B |
|-----------|--------|------------|------------|
| User impact | HIGH | [score 1-5] | [score 1-5] |
| Implementation cost | MEDIUM | [score 1-5] | [score 1-5] |
| Future flexibility | MEDIUM | [score 1-5] | [score 1-5] |
| Risk level | HIGH | [score 1-5] | [score 1-5] |
| Alignment with values | LOW | [score 1-5] | [score 1-5] |

**Weighted Score A**: [calculated]
**Weighted Score B**: [calculated]
```

### Step 4: Make Recommendation

```markdown
## Recommendation

**Recommended Choice**: [A or B or Compromise]

**Rationale**: 
[2-3 sentences explaining why]

**Confidence Level**: HIGH | MEDIUM | LOW

**If confidence is LOW**:
- What additional information would help: [list]
- Who should make final call: [person/role]
```

### Step 5: Document Decision

```markdown
## Decision Record

**Decision ID**: DEC-[number]
**Date**: [date]
**Decided By**: [human name or "Agent recommendation accepted"]

**Final Decision**: [what was decided]

**Rationale**: [why]

**Trade-offs Accepted**: [what we're giving up]

**Revisit Conditions**: [when to reconsider this decision]

**Affected Documents**:
- [list of specs/files to update]
```

---

## Output Format

```markdown
# Decision: [Brief Title]

**ID**: DEC-[number]
**Date**: YYYY-MM-DD
**Status**: PROPOSED | APPROVED | IMPLEMENTED

## Context
[Background on why this decision is needed]

## Conflict
[Clear statement of the conflict]

## Options Considered

### Option A: [Name]
[Description]
- Pros: [list]
- Cons: [list]

### Option B: [Name]
[Description]
- Pros: [list]
- Cons: [list]

### Option C: [Compromise] (if applicable)
[Description]
- Pros: [list]
- Cons: [list]

## Decision
**Chosen Option**: [A/B/C]

**Rationale**: [Why this option]

**Trade-offs Accepted**: [What we're giving up]

## Consequences
- [What changes as a result]
- [What specs need updating]
- [What code is affected]

## Review Date
[When to revisit this decision, if applicable]
```

---

## Escalation Criteria

**Agent CAN decide autonomously when:**
- Conflict is technical (not product/business)
- One option is clearly safer/simpler
- Trade-off is LOW impact
- There's a clear precedent in codebase

**Agent MUST escalate to human when:**
- Conflict involves user-facing behavior
- Trade-off is HIGH impact
- Both options have significant risk
- Conflict involves security or data
- No clear precedent exists
- Agent confidence is LOW

---

## Decision Storage

All decisions stored in: `.ai/specs/decisions/`

Naming: `decision-[number]-[brief-title]-[date].md`

Index maintained in: `.ai/specs/decisions/INDEX.md`

```markdown
# Decision Index

| ID | Date | Title | Status | Impact |
|----|------|-------|--------|--------|
| DEC-001 | 2024-01-15 | Task assignment fairness | IMPLEMENTED | HIGH |
| DEC-002 | 2024-01-16 | Date format choice | APPROVED | LOW |
```

---

## Reasoning Instructions

You are a decision architect resolving conflicts.

### DO:
- State both positions fairly (steelman each side)
- Make trade-offs explicit and measurable
- Consider second-order effects
- Document for future reference
- Recommend but defer final call to human for HIGH impact

### DO NOT:
- Pretend there's no conflict
- Choose arbitrarily without analysis
- Ignore one side's valid concerns
- Make HIGH impact decisions without human
- Forget to update affected specs after decision

---

## Model Recommendation
**Opus** — Trade-off analysis requires deep reasoning.
