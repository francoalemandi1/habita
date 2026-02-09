# Tool: Read Files

## Purpose
Unified tool for reading any project files - source code, specifications, schema, configuration. Provides consistent file access across all agents and skills.

## File Categories

### Source Code
```yaml
locations:
  - src/**/*.ts
  - src/**/*.tsx
  - tools/**/*.ts
use_for: Understanding implementation, finding patterns, reviewing code
```

### Specifications
```yaml
locations:
  - .ai/specs/functional-spec.md
  - .ai/specs/architecture-plan.md
  - .ai/specs/data-model.md
  - .ai/specs/ux-decisions.md
  - .ai/specs/workflow-architecture.md
use_for: Understanding requirements, checking compliance, design context
```

### Schema
```yaml
locations:
  - src/schema.ts
use_for: Understanding data model, validating queries, planning migrations
```

### Configuration
```yaml
locations:
  - CLAUDE.md
  - AGENTS.md
  - agent.yaml
  - package.json
  - tsconfig.json
use_for: Understanding project constraints, build configuration
```

### Context
```yaml
locations:
  - .ai/context/*.md
use_for: Understanding current work state, task breakdowns
```

## Actions

### Read Single File
```bash
cat [file_path]
```

### Read with Line Numbers
```bash
cat -n [file_path]
```

### Read Multiple Files
```bash
for f in [file_pattern]; do echo "=== $f ==="; cat "$f"; done
```

### Search Within Files
```bash
grep -n "pattern" [file_path]
grep -r "pattern" [directory]
```

### List Files in Category
```bash
# Source files
find src -type f -name "*.ts" -o -name "*.tsx" | head -50

# Spec files
ls -la .ai/specs/

# All context
ls -la .ai/context/
```

### Analyze File Structure
```bash
tree src -L 3
tree .ai -L 2
```

## Database Queries

For runtime data inspection (not schema):

```bash
# List all tables
dreamer database --query "SELECT name FROM sqlite_master WHERE type='table'"

# Describe table structure
dreamer database --query "PRAGMA table_info(table_name)"

# Sample data
dreamer database --query "SELECT * FROM table_name LIMIT 5"

# Count records
dreamer database --query "SELECT COUNT(*) FROM table_name"

# Check foreign keys
dreamer database --query "PRAGMA foreign_key_list(table_name)"

# Check indexes
dreamer database --query "PRAGMA index_list(table_name)"
```

## Common Read Patterns

### Full Spec Context
```bash
for f in .ai/specs/*.md; do echo "=== $f ==="; cat "$f"; done
```

### Implementation Context
```bash
cat src/server.ts
cat src/App.tsx
cat src/schema.ts
```

### Find Function Definitions
```bash
grep -n "export const" src/server.ts
grep -n "function.*{" src/App.tsx
```

### Find Imports
```bash
grep -n "^import" src/server.ts
```

### Find Table Definitions
```bash
grep -n "sqliteTable" src/schema.ts
```

### Current Task Context
```bash
cat .ai/context/task-breakdown.md
cat .ai/context/compiled-prompt.md
```

## Output
Returns file contents, search results, or directory listings that provide context for the requesting agent or skill.

## When Used By
- **agent-architecture**: Understanding current codebase and specs
- **agent-feature**: Finding existing patterns, reading specs
- **agent-review**: Reading code for review, checking specs
- **agent-ux**: Understanding current UI implementation
- **All skills**: As prerequisite context gathering
