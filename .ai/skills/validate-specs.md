# Skill: Validate Specs

## Purpose
Validate consistency and completeness across all specification documents. Ensure specs don't contradict each other and collectively cover all requirements.

## When to Use
- After creating or updating any spec document
- Before starting feature implementation
- When specs seem to conflict
- During architecture audits

## Input
```yaml
required:
  - .ai/specs/functional-spec.md
  - .ai/specs/architecture-plan.md
  - .ai/specs/data-model.md
optional:
  - .ai/specs/ux-decisions.md
  - Feature requirements (for scope check)
```

## Output
```yaml
type: Validation report
format: Markdown
location: .ai/reviews/spec-validation-[date].md
```

## Validation Checks

### 1. Entity Consistency
- [ ] All entities in functional-spec exist in data-model
- [ ] All tables in data-model have corresponding entities in functional-spec
- [ ] Entity relationships match across documents
- [ ] No orphaned or undefined references

### 2. Rule Coverage
- [ ] All business rules in functional-spec have implementation path in architecture
- [ ] Data constraints in data-model support all business rules
- [ ] Edge cases mentioned in functional-spec are handled in architecture

### 3. Flow Completeness
- [ ] All user flows in functional-spec have component mapping in architecture
- [ ] UI components in architecture cover all flows
- [ ] Data flows in architecture support all user actions

### 4. Field Mapping
- [ ] All fields mentioned in functional-spec exist in data-model
- [ ] Field types in data-model match expected usage in functional-spec
- [ ] Required fields marked consistently across specs

### 5. Terminology Consistency
- [ ] Same terms used consistently (not "task" in one, "todo" in another)
- [ ] Acronyms defined and used consistently
- [ ] No ambiguous references

### 6. Scope Alignment
- [ ] MVP scope consistent across all documents
- [ ] Future features clearly marked in all docs
- [ ] Dependencies between features documented

## Validation Process

```
1. Parse all spec documents
2. Extract entities, rules, flows from each
3. Build cross-reference map
4. Check each validation dimension
5. Identify gaps and conflicts
6. Generate validation report
```

## Output Format

```markdown
# Spec Validation Report

**Date**: YYYY-MM-DD
**Status**: VALID | NEEDS ATTENTION

## Documents Validated
- functional-spec.md (last modified: [date])
- architecture-plan.md (last modified: [date])
- data-model.md (last modified: [date])

## Validation Summary

| Check | Status | Issues |
|-------|--------|--------|
| Entity Consistency | ✅/❌ | [count] |
| Rule Coverage | ✅/❌ | [count] |
| Flow Completeness | ✅/❌ | [count] |
| Field Mapping | ✅/❌ | [count] |
| Terminology | ✅/❌ | [count] |
| Scope Alignment | ✅/❌ | [count] |

## Issues Found

### Critical (Must Fix Before Implementation)

#### [Issue Title]
- **Type**: [Entity/Rule/Flow/Field/Term/Scope] Inconsistency
- **Location**: 
  - functional-spec.md: [section/line]
  - architecture-plan.md: [section/line]
- **Conflict**: [Description of the inconsistency]
- **Resolution**: [How to resolve]

### Warnings (Should Fix)

#### [Issue Title]
- **Type**: [Category]
- **Description**: [What's problematic]
- **Suggestion**: [How to improve]

## Cross-Reference Map

### Entities
| Entity | Functional Spec | Architecture | Data Model |
|--------|-----------------|--------------|------------|
| [Name] | Section X | Component Y | Table Z |

### Business Rules
| Rule | Functional Spec | Implementation Path |
|------|-----------------|---------------------|
| [Rule] | Section X | [How implemented] |

## Recommendations
[Steps to achieve full consistency]
```

## Reasoning Instructions

You are a specification auditor ensuring consistency.

### DO:
- Read all specs completely before checking
- Build mental model of the system from each spec
- Look for subtle inconsistencies (naming, relationships)
- Check that nothing is assumed but not specified
- Verify scope is aligned across documents
- Flag ambiguous language that could cause implementation issues

### DO NOT:
- Assume specs are correct without verification
- Skip checking optional specs if they exist
- Ignore terminology differences ("probably the same thing")
- Approve specs that have unresolved contradictions
- Make assumptions about intent - flag for clarification

## Model Recommendation
**Opus** — Deep analysis and cross-referencing required.
