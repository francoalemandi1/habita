# Tool: Scan PR Changes

## Purpose
Analyze changes in a pull request or git diff to understand what was modified.

## Actions

### View Current Changes (Unstaged)
```bash
git diff
```

### View Staged Changes
```bash
git diff --staged
```

### View Changes from Branch
```bash
git diff main...HEAD
```

### List Changed Files
```bash
git diff --name-only main...HEAD
```

### View Specific File Changes
```bash
git diff main...HEAD -- src/server.ts
```

### Get Change Statistics
```bash
git diff --stat main...HEAD
```

### View Commit History
```bash
git log --oneline main...HEAD
```

## Analysis Patterns

### Identify Changed Components
```bash
# Server function changes
git diff main...HEAD -- src/server.ts | grep -A5 "export const"

# Schema changes
git diff main...HEAD -- src/schema.ts

# UI component changes
git diff main...HEAD -- src/App.tsx
```

### Count Changes
```bash
# Lines added/removed
git diff --shortstat main...HEAD
```

## When Used By

- **agent-review**: Understanding what to review
- **skill-pr-review**: Analyzing PR contents
- **skill-code-review**: Scoping review focus
