# Skill: Schema Migration

## Purpose
Safely plan and execute database schema changes. Ensure migrations don't break existing data or functionality.

## When to Use
- Adding new tables or columns
- Modifying existing schema structure
- Renaming columns or tables
- Adding indexes or constraints
- Any change to src/schema.ts

## Input
```yaml
required:
  - Proposed schema changes
  - .ai/specs/data-model.md (target state)
  - Current src/schema.ts (current state)
optional:
  - Existing data samples (from dreamer database)
  - Related functional-spec sections
```

## Output
```yaml
type: Migration plan
format: Markdown
location: .ai/context/migration-plan-[date].md
```

## Migration Types

### Safe Migrations (Low Risk)
- Adding new nullable columns
- Adding new tables
- Adding indexes
- These can be executed directly

### Careful Migrations (Medium Risk)
- Adding columns with defaults
- Making nullable columns required (with default)
- Adding unique constraints
- Require data analysis first

### Dangerous Migrations (High Risk)
- Removing columns
- Renaming columns/tables
- Changing column types
- Removing tables
- Require explicit backup and human approval

## Migration Process

### 1. Analyze Current State
```bash
# Read current schema
cat src/schema.ts

# Check existing tables
dreamer database --query "SELECT name FROM sqlite_master WHERE type='table'"

# Sample existing data
dreamer database --query "SELECT * FROM [table] LIMIT 5"
```

### 2. Compare with Target
- What columns need adding?
- What columns need removing?
- What columns need modifying?
- Are there data dependencies?

### 3. Generate Migration Plan
```markdown
# Migration Plan: [Description]

**Date**: YYYY-MM-DD
**Risk Level**: LOW | MEDIUM | HIGH

## Changes Required

### Additions
- [ ] Table: [name] - [description]
- [ ] Column: [table].[column] - [type] - [nullable?]

### Modifications
- [ ] Column: [table].[column] - [old_type] → [new_type]
- [ ] Constraint: [description]

### Removals
- [ ] Column: [table].[column] - [reason] - [data handling]

## Pre-Migration Checks
- [ ] Backup verified: `dreamer database --query "SELECT COUNT(*) FROM [affected_table]"`
- [ ] No dependent queries in codebase
- [ ] Feature flag ready (if needed)

## Migration Steps
1. [Step with exact SQL or schema.ts change]
2. [Next step]
...

## Rollback Plan
[How to revert if something goes wrong]

## Post-Migration Verification
- [ ] Schema compiles: `bun run typecheck`
- [ ] Build passes: `bun run build`
- [ ] Data intact: [verification queries]
- [ ] App functions: [manual check description]
```

## Safety Rules

### ALWAYS:
- Check for existing data before dropping columns
- Add new columns as nullable first, then migrate data, then add constraints
- Backup data before destructive changes
- Test migration on sample data first
- Have a rollback plan

### NEVER:
- Drop columns with data without explicit approval
- Change types without data conversion plan
- Assume empty tables (check first)
- Run migrations without reading existing schema
- Skip the human checkpoint for HIGH risk changes

## Error Recovery

### Migration Fails
```
1. Check error message
2. Verify schema syntax
3. Check for constraint violations
4. If data issue:
   - Identify problematic records
   - Plan data cleanup
   - Retry migration
5. If schema issue:
   - Fix schema.ts
   - Run dreamer push again
```

### Data Loss Prevention
```
1. Before ANY removal:
   - Count affected records
   - Sample data to verify it's okay to lose
   - Get explicit human approval
2. If data is valuable:
   - Rename column instead of drop
   - Archive to separate table
   - Export before removal
```

## Output Format

```markdown
# Migration Plan: [Brief Description]

**Date**: YYYY-MM-DD
**Risk Level**: LOW | MEDIUM | HIGH
**Human Approval Required**: Yes/No

## Summary
[One paragraph describing what changes and why]

## Current State Analysis
- Tables affected: [list]
- Records at risk: [counts]
- Dependencies found: [list of code references]

## Proposed Changes

### Phase 1: [Description]
```typescript
// schema.ts changes
[Exact code to change]
```

### Phase 2: [Description]
[If multi-phase migration needed]

## Verification Checklist
- [ ] Schema compiles
- [ ] Build passes
- [ ] Data intact
- [ ] Dependent queries work

## Rollback Plan
[Step-by-step rollback instructions]
```

## Reasoning Instructions

You are a database migration specialist.

### DO:
- Analyze current schema AND data before planning
- Identify all code dependencies on changing columns
- Plan migrations in safe phases
- Always have a rollback plan
- Be conservative with data

### DO NOT:
- Assume tables are empty
- Drop columns without checking for data
- Skip dependency analysis
- Proceed with HIGH risk without approval
- Forget to update dependent code

## Model Recommendation
**Opus** — Critical thinking about data safety required.
