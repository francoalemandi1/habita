# Rule: Import Organization

## Summary
Organize imports consistently for readability and to avoid circular dependencies.

## DO ✅

### Import Order
Group imports in this order, with blank lines between groups:

1. **External packages** (node_modules)
2. **Internal aliases** (@tools/, @dev-agents/)
3. **Relative imports** (./local)
4. **Type imports** (import type)

### Import Style
- Use named imports when importing few items
- Use namespace import for many items from same module
- Always use `import type` for type-only imports
- Prefer absolute imports over deep relative paths

## DON'T ❌

- Circular imports (A imports B imports A)
- Default imports without good reason
- Importing entire modules when using one function
- `require()` in TypeScript (use import)
- Side-effect imports without comment

## Examples

### Good ✅
```typescript
// 1. External packages
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eq, and, desc } from 'drizzle-orm';

// 2. Internal aliases
import { serverFunction, backgroundFunction } from '@dev-agents/sdk-server';
import { call } from '@dev-agents/sdk-client';
import { gmail_send } from '@tools/gmail';

// 3. Relative imports
import { calculateFairness } from './fairness';
import { TaskCard } from './components/TaskCard';

// 4. Type imports
import type { ServerSdk } from '@dev-agents/sdk-server';
import type { Task, Member, Household } from './types';

// Then your code...
```

### Bad ❌
```typescript
// Wrong order
import type { Task } from './types';
import { useQuery } from '@tanstack/react-query';
import { serverFunction } from '@dev-agents/sdk-server';
import { eq } from 'drizzle-orm';

// Circular import risk
// file: tasks.ts
import { getMember } from './members'; // members.ts imports from tasks.ts

// Importing too much
import * as everything from 'huge-library';
const { oneThing } = everything;

// Side effect import without explanation
import './styles.css';

// require in TypeScript
const fs = require('fs'); // Use import
```

## Handling Circular Dependencies

If A imports from B and B imports from A:

1. **Extract shared types** to a third file
2. **Use dependency injection** instead of direct imports
3. **Restructure** to have clear dependency direction

```typescript
// Before: Circular
// tasks.ts
import { getMember } from './members';

// members.ts  
import { getTasksForMember } from './tasks';

// After: Fixed
// types.ts (shared)
export interface Task { ... }
export interface Member { ... }

// tasks.ts
import type { Member } from './types';

// members.ts
import type { Task } from './types';

// services.ts (orchestrates both)
import { getTasks } from './tasks';
import { getMembers } from './members';
```

## Why This Matters

- Consistent organization aids navigation
- Grouped imports show dependencies at a glance
- Type imports ensure proper tree-shaking
- Avoiding circular deps prevents runtime errors
