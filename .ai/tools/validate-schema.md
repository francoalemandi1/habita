# Tool: Validate Schema

## Purpose
Validate schema changes before applying them. Check for compatibility, data safety, and correctness.

## Actions

### Check Current Schema State
```bash
# Read schema definition
cat src/schema.ts

# List existing tables in database
dreamer database --query "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

# Get table info
dreamer database --query "PRAGMA table_info(TABLE_NAME)"
```

### Validate Syntax
```bash
# TypeScript compilation catches schema syntax errors
bun run typecheck
```

### Check Data Impact

#### Before Dropping Column
```bash
# Count non-null values
dreamer database --query "SELECT COUNT(*) FROM table WHERE column IS NOT NULL"

# Sample values
dreamer database --query "SELECT DISTINCT column FROM table LIMIT 10"
```

#### Before Changing Type
```bash
# Check current values are compatible
dreamer database --query "SELECT column FROM table WHERE typeof(column) != 'expected_type' LIMIT 10"
```

#### Before Adding NOT NULL
```bash
# Check for existing nulls
dreamer database --query "SELECT COUNT(*) FROM table WHERE column IS NULL"
```

### Check Foreign Key Safety

#### Before Dropping Table
```bash
# Find dependent foreign keys
dreamer database --query "SELECT * FROM sqlite_master WHERE sql LIKE '%REFERENCES table_name%'"
```

#### Before Dropping Column Referenced by FK
```bash
# Find children
dreamer database --query "SELECT COUNT(*) FROM child_table WHERE parent_column IS NOT NULL"
```

### Dry Run Migration

```bash
# Push with dry-run to see what would happen
dreamer push --dry-run
```

## Validation Checklist

Before ANY schema change, verify:

### Additions (Safe)
- [ ] New table: Name follows convention?
- [ ] New column: Type appropriate?
- [ ] New column: Default value if NOT NULL?
- [ ] New index: Column exists?

### Modifications (Careful)
- [ ] Type change: Data is compatible?
- [ ] Add NOT NULL: No existing NULLs?
- [ ] Add UNIQUE: No duplicates exist?
- [ ] Add FK: All values reference valid parents?

### Removals (Dangerous)
- [ ] Drop column: Data expendable? Backed up?
- [ ] Drop table: No foreign keys reference it?
- [ ] Drop index: Performance acceptable without it?

## Validation Output Format

```markdown
# Schema Validation: [Change Description]

**Date**: YYYY-MM-DD
**Status**: ✅ SAFE | ⚠️ CAUTION | 🔴 BLOCKED

## Change Summary
[What is being changed]

## Data Impact Analysis
- Records affected: [count]
- Data loss risk: NONE | LOW | HIGH
- Backup required: YES | NO

## Compatibility Check
- Syntax valid: ✅/❌
- Type compatible: ✅/❌
- Constraints satisfied: ✅/❌
- Foreign keys safe: ✅/❌

## Recommendation
[Proceed / Proceed with caution / Do not proceed]

## Required Actions Before Migration
1. [Action if any]
```

## When Used By
- **schema-migration skill**: Before generating migration plan
- **agent-feature**: When feature requires schema changes
- **agent-review**: Validating schema changes in PR
