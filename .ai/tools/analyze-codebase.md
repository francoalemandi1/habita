# Tool: Analyze Codebase

## Purpose
Analyze codebase structure, patterns, and dependencies to inform implementation decisions.

## Actions

### Get Codebase Overview
```bash
# File count by type
find src -type f -name "*.ts" | wc -l
find src -type f -name "*.tsx" | wc -l

# Directory structure
ls -la src/
ls -la src/*/ 2>/dev/null || echo "No subdirectories"
```

### Find Entry Points
```bash
# Server entry points (exported functions)
grep -n "export const.*= serverFunction\|backgroundFunction" src/server.ts

# React entry point
grep -n "export default function App" src/App.tsx
```

### Extract Patterns

#### Server Function Pattern
```bash
# Get a sample server function to see the pattern
grep -A 20 "export const.*= serverFunction" src/server.ts | head -30
```

#### Component Pattern
```bash
# Get a sample component to see the pattern
grep -A 15 "^function.*{$" src/App.tsx | head -20
```

#### Schema Pattern
```bash
# See how tables are defined
grep -A 10 "sqliteTable" src/schema.ts
```

### Analyze Dependencies

#### Import Analysis
```bash
# What does server.ts import?
grep "^import" src/server.ts

# What does App.tsx import?
grep "^import" src/App.tsx

# External tool imports
grep -r "@tools/" src/
```

#### Export Analysis
```bash
# What does server.ts export?
grep "^export" src/server.ts

# What types are exported from schema?
grep "export" src/schema.ts
```

### Find Existing Patterns

#### Error Handling Pattern
```bash
grep -n "try {" src/server.ts
grep -n "catch" src/server.ts
```

#### State Management Pattern
```bash
grep -n "useQuery\|useMutation" src/App.tsx
```

#### Data Access Pattern
```bash
grep -n "sdk.db" src/server.ts
```

### Measure Complexity

#### Lines of Code
```bash
wc -l src/*.ts src/*.tsx
```

#### Function Count
```bash
grep -c "export const.*=" src/server.ts
grep -c "^function" src/App.tsx
```

#### Table Count
```bash
grep -c "sqliteTable" src/schema.ts
```

## Pattern Extraction Template

After analysis, document patterns found:

```markdown
# Codebase Patterns

## Server Functions
- Naming: [convention]
- Error handling: [pattern]
- Database access: [pattern]
- Example: [reference]

## Components  
- Naming: [convention]
- State management: [pattern]
- Styling: [pattern]
- Example: [reference]

## Data Layer
- Table naming: [convention]
- Column naming: [convention]
- Relationships: [pattern]
- Example: [reference]

## Tools Used
- [List of @tools/ imports]

## Notable Patterns
- [Anything unusual or important]
```

## When Used By
- **agent-architecture**: Understanding current codebase before design
- **agent-feature**: Finding patterns to follow
- **code-implementation**: Matching existing style
- **agent-review**: Checking consistency
