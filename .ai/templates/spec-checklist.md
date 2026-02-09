# Spec Validation Checklist

Use this checklist to validate that a specification document is complete and ready for downstream work.

---

## Functional Spec Checklist

### Completeness
- [ ] Problem statement is clear and specific
- [ ] Target users are defined with context
- [ ] All core entities are listed with descriptions
- [ ] Business rules are explicit (not implicit)
- [ ] User flows cover all main use cases
- [ ] Edge cases are identified
- [ ] MVP scope is explicitly defined
- [ ] Out-of-scope items are listed

### Clarity
- [ ] No ambiguous terms (or glossary provided)
- [ ] Business rules have clear conditions and outcomes
- [ ] User flows have numbered steps
- [ ] Success/failure states are defined for each flow

### Consistency
- [ ] Entity names used consistently throughout
- [ ] User personas referenced in flows match those defined
- [ ] MVP scope matches what's described in flows

### Quality Check
- [ ] Read the "Open Questions" section - are they answered?
- [ ] Read the "Assumptions" section - are they validated?
- [ ] Can someone implement this without asking questions?

**Score**: ___/16 checks passed

---

## Architecture Plan Checklist

### Completeness
- [ ] All entities from functional-spec mapped to components
- [ ] Server layer clearly defined
- [ ] Client layer clearly defined
- [ ] Data layer (schema) outlined
- [ ] Component interactions documented
- [ ] Security considerations addressed
- [ ] Error handling approach defined

### Clarity
- [ ] Clear separation of concerns
- [ ] Data flow is traceable
- [ ] Patterns are explicitly named (not assumed)

### Consistency
- [ ] Component names match entity names from functional-spec
- [ ] All user flows can be traced through components
- [ ] Security approach applies to all relevant components

### Quality Check
- [ ] Would a developer know where to put new code?
- [ ] Are there any "magic" connections that aren't explained?
- [ ] Does this match CLAUDE.md constraints?

**Score**: ___/14 checks passed

---

## Data Model Checklist

### Completeness
- [ ] All entities from functional-spec have tables
- [ ] All relationships are defined
- [ ] Primary keys defined for all tables
- [ ] Foreign keys defined where needed
- [ ] Owner column present on user-scoped tables
- [ ] Timestamps (createdAt, updatedAt) where appropriate
- [ ] Indexes defined for common queries

### Clarity
- [ ] Column names are clear and consistent
- [ ] Data types are appropriate
- [ ] Nullable vs required is explicit
- [ ] Default values documented where used

### Consistency
- [ ] Table names match entity names
- [ ] Relationship direction matches business rules
- [ ] Naming convention is consistent (snake_case or camelCase, not both)

### Quality Check
- [ ] Can all user flows be supported with this schema?
- [ ] Are there any orphan tables (no relationships)?
- [ ] Would a query for [common use case] be efficient?

**Score**: ___/15 checks passed

---

## UX Decisions Checklist

### For Each Decision:
- [ ] Problem statement is specific
- [ ] At least 2 alternatives were considered
- [ ] Trade-offs are explicitly stated
- [ ] Rationale explains WHY not just WHAT
- [ ] Implementation notes are actionable
- [ ] Status is current (Proposed/Approved/Implemented)

### Overall:
- [ ] Decisions don't contradict each other
- [ ] Decisions align with functional-spec flows
- [ ] Cold start scenarios addressed
- [ ] Error states addressed

**Score**: ___/10 checks passed

---

## Task Breakdown Checklist

### Completeness
- [ ] All acceptance criteria covered by tasks
- [ ] Schema tasks come first (if needed)
- [ ] Server tasks come before client tasks
- [ ] Each task has verification method
- [ ] Dependencies between tasks are explicit

### Clarity
- [ ] Each task describes ONE thing to do
- [ ] Each task lists specific files to modify
- [ ] Pattern references are specific (not "follow patterns")

### Size
- [ ] No task touches more than 2 files
- [ ] No task is "implement the whole feature"
- [ ] Tasks are small enough to verify individually

### Quality Check
- [ ] Can each task be done without reading other task descriptions?
- [ ] Is the total task count reasonable (not too few, not too many)?
- [ ] Would completion of all tasks satisfy acceptance criteria?

**Score**: ___/12 checks passed

---

## When to STOP and Ask Questions

If any of these are true, do NOT proceed:

### Functional Spec
- [ ] Core problem is unclear
- [ ] Target user is "everyone"
- [ ] Business rules have "maybe" or "possibly"
- [ ] MVP scope says "TBD"

### Architecture Plan
- [ ] Component names don't match functional spec
- [ ] Security section is empty
- [ ] Data flow has gaps

### Data Model
- [ ] Missing owner column on user data
- [ ] Entities from spec not represented
- [ ] Relationships are "assumed"

### Task Breakdown
- [ ] Tasks have circular dependencies
- [ ] Multiple tasks modify same file
- [ ] No verification method

---

## Scoring Guide

| Score | Rating | Action |
|-------|--------|--------|
| 90-100% | ✅ Excellent | Proceed confidently |
| 75-89% | ⚠️ Good | Proceed with notes |
| 50-74% | 🟡 Needs Work | Address gaps first |
| <50% | 🔴 Incomplete | Do not proceed |
