# Rules: Best Practices & Guidelines

Rules are **passive knowledge** that agents and skills should apply during execution. Unlike skills (which are processes), rules are **constraints and patterns** to follow.

## Directory Structure

```
rules/
├── code/                   # General code quality
│   ├── naming.md
│   ├── functions.md
│   ├── error-handling.md
│   ├── comments.md
│   └── anti-patterns.md
├── typescript/             # TypeScript-specific
│   ├── types.md
│   ├── strict-mode.md
│   └── imports.md
├── react/                  # React & frontend
│   ├── components.md
│   ├── state.md
│   ├── hooks-useeffect.md
│   ├── hooks-state.md
│   ├── hooks-memoization.md
│   └── hooks-custom.md
├── database/               # Schema & queries
│   ├── schema-design.md
│   └── queries.md
├── testing/                # Tests & edge cases
│   ├── edge-cases.md
│   ├── unit-tests.md
│   ├── integration.md
│   ├── mocking.md
│   ├── edge-datetime.md
│   ├── edge-validation.md
│   └── edge-concurrency.md
├── security/               # Security practices
│   ├── data-isolation.md
│   └── input-validation.md
└── performance/            # Performance guidelines
    ├── bundle-size.md
    ├── lazy-loading.md
    └── queries.md
```

## How Rules Are Used

1. **During code-implementation**: Agent checks relevant rules before writing code
2. **During review**: Agent validates code against applicable rules
3. **During planning**: Agent considers rules when designing tasks

## Rule Format

Each rule file follows this structure:

```markdown
# Rule: [Name]

## Summary
[One-line description]

## DO ✅
[List of things to do]

## DON'T ❌
[List of things to avoid]

## Examples

### Good ✅
[Code example]

### Bad ❌
[Code example]

## Why This Matters
[Brief explanation of the reasoning]
```

## Rule Categories

| Category | When to Check | Key Files |
|----------|---------------|-----------|
| code/* | All code changes | All .ts/.tsx |
| typescript/* | TypeScript code | All .ts/.tsx |
| react/* | React components | App.tsx, components |
| database/* | Database work | schema.ts, queries |
| testing/* | Writing tests | *.test.ts, *.spec.ts |
| security/* | User data, inputs | All user-facing code |
| performance/* | UI, data fetching | Queries, bundles |

## Quick Reference by Task

### Writing New Components
- `react/components.md`
- `react/hooks-*.md` (relevant hooks)
- `react/state.md`
- `code/functions.md`

### Writing Tests
- `testing/unit-tests.md`
- `testing/integration.md`
- `testing/mocking.md`
- `testing/edge-*.md` (domain-specific)

### Database Work
- `database/schema-design.md`
- `database/queries.md`
- `performance/queries.md`

### Performance Issues
- `performance/bundle-size.md`
- `performance/lazy-loading.md`
- `performance/queries.md`
- `react/hooks-memoization.md`

### Security Review
- `security/data-isolation.md`
- `security/input-validation.md`
- `testing/edge-validation.md`
