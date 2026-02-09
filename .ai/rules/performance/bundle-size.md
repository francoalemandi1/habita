# Rule: Bundle Size

## Summary
Smaller bundles mean faster load times. Every byte counts for user experience and SEO.

## DO ✅

### Imports
- Use named imports, not default imports from large libraries
- Import only what you need
- Use tree-shakeable libraries
- Check bundle impact before adding dependencies

### Code Splitting
- Split by route/page
- Lazy load heavy features
- Split vendor and app code
- Use dynamic imports for optional features

### Monitoring
- Set bundle size budgets
- Review size impact in PRs
- Use bundle analyzers regularly

## DON'T ❌

- Import entire libraries when you need one function
- Bundle unused code
- Ignore bundle size warnings
- Add dependencies without checking size
- Inline large assets in JS

## Examples

### Good ✅
```typescript
// ✅ Named import - tree-shakeable
import { format, parseISO } from 'date-fns';

// ✅ Cherry-pick from lodash
import debounce from 'lodash/debounce';
import groupBy from 'lodash/groupBy';

// ✅ Dynamic import for heavy feature
const PdfViewer = lazy(() => import('./PdfViewer'));

// ✅ Route-based code splitting
const routes = [
  {
    path: '/dashboard',
    component: lazy(() => import('./pages/Dashboard')),
  },
  {
    path: '/settings',
    component: lazy(() => import('./pages/Settings')),
  },
];

// ✅ Conditional loading of optional feature
async function enableAnalytics() {
  if (process.env.NODE_ENV === 'production') {
    const { initAnalytics } = await import('./analytics');
    initAnalytics();
  }
}

// ✅ Use lighter alternatives
// Instead of: import moment from 'moment'; (300KB)
// Use: import { format } from 'date-fns'; (tree-shakeable)

// Instead of: import _ from 'lodash'; (70KB)
// Use: import debounce from 'lodash/debounce'; (2KB)

// Instead of: import * as icons from 'lucide-react';
// Use: import { Search, Menu } from 'lucide-react';
```

### Bad ❌
```typescript
// ❌ Imports entire library
import _ from 'lodash';
const result = _.debounce(fn, 100);

// ❌ Imports all icons
import * as Icons from '@heroicons/react/solid';

// ❌ No code splitting
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Reports from './pages/Reports';
// All loaded on initial page load!

// ❌ Heavy library for simple task
import moment from 'moment'; // 300KB for date formatting
const formatted = moment().format('YYYY-MM-DD');
// Use: new Date().toISOString().split('T')[0]

// ❌ Bundling dev-only code
import { DevTools } from 'some-devtools';
// Should be conditional or in devDependencies
```

## Bundle Analysis Commands

```bash
# Analyze bundle composition
bun run build --analyze

# Check specific package size
npx bundlephobia lodash

# Visualize bundle
npx vite-bundle-visualizer
```

## Size Budgets

```json
// package.json
{
  "bundlesize": [
    {
      "path": "dist/main.*.js",
      "maxSize": "150 KB"
    },
    {
      "path": "dist/vendor.*.js", 
      "maxSize": "200 KB"
    }
  ]
}
```

## Common Heavy Dependencies

| Package | Size | Lighter Alternative |
|---------|------|---------------------|
| moment | 300KB | date-fns, dayjs |
| lodash (full) | 70KB | lodash-es (tree-shake) |
| axios | 15KB | fetch (native) |
| jquery | 90KB | Native DOM APIs |
| chart.js | 200KB | Lightweight chart libs |

## Why This Matters

- 100KB JS ≈ 1 second parse time on mobile
- Large bundles hurt Core Web Vitals
- Users on slow connections abandon slow sites
- Bundle size affects SEO rankings
