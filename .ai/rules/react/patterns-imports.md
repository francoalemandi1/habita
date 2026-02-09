# Rule: React Import Patterns

## Summary
Organize imports consistently for readability, maintainability, and tree-shaking effectiveness.

## DO ✅

### Import Order
1. React and React libraries
2. Third-party libraries
3. Internal absolute imports
4. Relative imports (parent → sibling → child)
5. Types (using `import type`)
6. Styles

### Type Imports
- Use `import type` for type-only imports
- Enables proper tree-shaking
- Required by `verbatimModuleSyntax`

### Named vs Default
- Prefer named exports/imports for utilities
- Default exports for components (one per file)
- Named exports enable better tree-shaking

## DON'T ❌

- Mix type and value imports
- Import entire modules when you need one thing
- Use `require()` in React code
- Circular imports
- Import from barrel files for internal code

## Examples

### Good ✅
```tsx
// 1. React
import { useState, useEffect, useCallback } from 'react';

// 2. Third-party libraries
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';

// 3. Internal absolute imports
import { call } from '@dev-agents/sdk-client';

// 4. Relative imports
import { TaskCard } from '../components/TaskCard';
import { useTaskActions } from './useTaskActions';

// 5. Type imports (separate!)
import type { Task, Member } from '../types';
import type { getTasks, createTask } from '../server';

// 6. Styles (if any)
import './TaskList.css';
```

### With Type Imports ✅
```tsx
// ✅ Separate type imports
import { serverFunction } from '@dev-agents/sdk-server';
import type { ServerSdk } from '@dev-agents/sdk-server';

// ✅ Type-only import
import type { Task } from './types';

// ✅ Mixed import with inline type
import { tasks, type TaskInsert } from './schema';
```

### Bad ❌
```tsx
// ❌ Mixed imports (verbatimModuleSyntax will error)
import { serverFunction, ServerSdk } from '@dev-agents/sdk-server';
// ServerSdk is a type, should use: import type { ServerSdk }

// ❌ Import everything
import * as dateFns from 'date-fns';
dateFns.format(date, 'yyyy-MM-dd');
// Should use: import { format } from 'date-fns';

// ❌ No order
import { Task } from './types';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TaskCard } from '../TaskCard';
import { format } from 'date-fns';

// ❌ require() in React
const { useState } = require('react');

// ❌ Barrel imports for internal code (slower, harder to tree-shake)
import { TaskCard, MemberBadge, LoadingSpinner } from '../components';
// Better: import directly from each file
```

## Common Patterns

### Re-exporting Types
```tsx
// types/index.ts
export type { Task, TaskStatus } from './task';
export type { Member, MemberRole } from './member';
export type { Household } from './household';

// Usage
import type { Task, Member, Household } from './types';
```

### Component with Types
```tsx
import type { ComponentProps } from 'react';

interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export function Button({ variant = 'primary', loading, ...props }: ButtonProps) {
  // ...
}
```

### Importing Server Functions for Types
```tsx
// Only need the type for call<typeof fn>
import type { getTasks, createTask } from './server';

// Usage
const { data } = useQuery({
  queryKey: ['tasks'],
  queryFn: () => call<typeof getTasks>('getTasks', {}),
});
```

## Why This Matters

- Consistent ordering makes code scannable
- Type imports enable proper tree-shaking
- Avoiding barrel files improves build performance
- Clear separation helps identify dependencies
