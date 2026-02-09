# Tool: Write Specs

## Purpose
Create or update specification documents in the .ai directory.

## Spec Locations

| Document | Location | Created By |
|----------|----------|------------|
| Compiled Prompt | .ai/context/compiled-prompt.md | spec-compilation skill |
| Functional Spec | .ai/specs/functional-spec.md | functional-analysis skill |
| Architecture Plan | .ai/specs/architecture-plan.md | system-architecture-design skill |
| Data Model | .ai/specs/data-model.md | data-model-design skill |
| UX Decisions | .ai/specs/ux-decisions.md | ux-analysis skill |
| Task Breakdown | .ai/context/task-breakdown.md | implementation-planning skill |
| Review Report | .ai/reviews/review-*.md | code-review skill |

## Actions

### Create New Spec
Write complete spec content following the skill's output format.

### Append to Spec
Add new sections (e.g., new UX decision to ux-decisions.md).

### Update Spec Section
Modify specific section while preserving rest of document.

## Safety Rules

1. **Follow output format**: Each skill defines expected format
2. **Preserve existing content**: Don't overwrite when appending
3. **Maintain traceability**: Link to decisions and rationale

## When Used By

- **agent-architecture**: Writing architecture specs
- **agent-feature**: Writing task breakdowns
- **agent-review**: Writing review reports
- **All design skills**: Producing specification outputs
