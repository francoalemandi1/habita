# Skill: Functional Analysis

## Purpose
Create comprehensive functional specifications that define WHAT a system does (not HOW it's built). This is the foundation document for all downstream technical work.

## When to Use
- After spec compilation is complete and approved
- Starting technical specification for a new project
- Documenting business requirements before architecture
- Creating the source of truth for system behavior

## Input
```yaml
type: Compiled specification prompt
source: .ai/context/compiled-prompt.md (from spec-compilation skill)
quality: Structured, ambiguities resolved
```

## Output
```yaml
type: Complete functional specification
format: Markdown
location: .ai/specs/functional-spec.md
```

## Output Structure

### 1. Problem Definition
- The core problem being solved
- Why it matters
- Current pain points

### 2. Target Users and Context
- User personas with goals and constraints
- Context of use (when, where, frequency, mindset)
- User goals and success criteria

### 3. Core Concepts and Entities
Domain objects (NOT database tables, just concepts):
```
- Entity Name: Brief description of what it represents
- Relationships: How entities relate to each other
```

### 4. System Rules and Logic
Business rules that govern behavior:
```
- [Entity] Rules: Constraints and behaviors
- Assignment Logic: How things are allocated/decided
- State Transitions: Valid state changes
```

### 5. User Flows
Key user journeys as step-by-step processes:
```
Flow N: [Name]
1. User does X
2. System responds with Y
3. User sees Z
End state: [What's true after this flow]
```

### 6. MVP Scope
- Explicitly included features
- Explicitly excluded features (with rationale)

### 7. Edge Cases and Constraints
- Edge cases to handle
- System constraints and limits

### 8. Assumptions
- Explicit assumptions made

## Reasoning Instructions

You are a senior product architect creating the functional specification.

### DO:
- Define WHAT the system does, not HOW
- Be precise about business rules
- Think through user flows step by step
- Identify edge cases proactively
- Be explicit about scope boundaries
- Write for future developers who need to understand intent

### DO NOT:
- Mention technology, frameworks, or implementation details
- Make technical architecture decisions
- Write code or pseudocode
- Skip edge cases
- Leave rules ambiguous

## Quality Checklist

- [ ] All entities from the compiled prompt are defined
- [ ] Business rules are explicit and unambiguous
- [ ] User flows cover the main use cases
- [ ] Edge cases are identified
- [ ] MVP scope is crystal clear
- [ ] Assumptions are documented

## Model Recommendation
**Opus** — Deep product thinking and comprehensive analysis required.
