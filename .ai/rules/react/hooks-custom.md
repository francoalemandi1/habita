# Rule: Custom Hooks

## Summary
Custom hooks extract reusable stateful logic. They should do ONE thing well and follow clear naming conventions.

## DO ✅

### When to Create Custom Hooks
- Reusing stateful logic across multiple components
- Encapsulating complex state/effect combinations
- Abstracting away implementation details
- Creating domain-specific abstractions

### Naming
- Always start with `use` prefix
- Use descriptive verbs: `useFetch`, `useToggle`, `useLocalStorage`
- Name should describe what it returns or does

### Structure
- Return stable references (useCallback for functions)
- Return clear, typed values
- Handle cleanup properly
- Document parameters and return values

## DON'T ❌

- Create hooks that do multiple unrelated things
- Forget the `use` prefix
- Return unstable references without memoization
- Create hooks for simple one-liners
- Nest custom hooks deeply (max 2-3 levels)

## Examples

### Good ✅
```tsx
// ✅ Single responsibility - manages toggle state
function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);

  return [value, toggle];
}

// Usage
function Modal() {
  const [isOpen, toggleOpen] = useToggle();
  return <button onClick={toggleOpen}>{isOpen ? 'Close' : 'Open'}</button>;
}

// ✅ Encapsulates fetch logic with loading/error states
function useFetch<T>(url: string): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ✅ Local storage with SSR safety
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }

      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue];
}

// ✅ Debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ✅ Previous value tracking
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// ✅ Media query hook
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

### Bad ❌
```tsx
// ❌ Does too many unrelated things
function useEverything() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // This hook is doing 4 unrelated things!
  return { user, setUser, theme, setTheme, notifications, isModalOpen };
}

// ❌ Missing use prefix
function fetchUserData(userId: string) { // Should be useFetchUserData
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
  }, [userId]);
  return user;
}

// ❌ Returns unstable reference - causes re-renders
function useCounter() {
  const [count, setCount] = useState(0);

  // ❌ New function every render!
  const increment = () => setCount(c => c + 1);

  // ✅ Should be:
  // const increment = useCallback(() => setCount(c => c + 1), []);

  return { count, increment };
}

// ❌ Too simple - just use useState directly
function useBoolean(initial: boolean) {
  return useState(initial); // Adds no value
}

// ❌ Deep nesting of custom hooks
function useDeepNested() {
  const data = useFirstHook();        // Level 1
  const processed = useSecondHook(data);  // Level 2
  const final = useThirdHook(processed);  // Level 3
  const result = useFourthHook(final);    // Level 4 - too deep!
  return result;
}
```

## Patterns

### Return Value Patterns

```tsx
// Tuple for simple state + updater
function useToggle(): [boolean, () => void] { ... }
const [isOpen, toggle] = useToggle();

// Object for complex returns
function useFetch<T>(): { data: T; loading: boolean; error: Error | null } { ... }
const { data, loading, error } = useFetch(url);

// Single value for derived data
function useDebounce<T>(value: T, delay: number): T { ... }
const debouncedSearch = useDebounce(search, 300);
```

### Composition Pattern

```tsx
// ✅ Compose smaller hooks into larger ones
function useAuth() {
  const user = useUser();
  const permissions = usePermissions(user?.id);
  const session = useSession();

  return {
    user,
    permissions,
    isAuthenticated: !!session,
    canAccess: (resource: string) => permissions.includes(resource),
  };
}
```

### Options Pattern

```tsx
// ✅ Use options object for many parameters
interface UseFetchOptions {
  immediate?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

function useFetch<T>(url: string, options: UseFetchOptions = {}) {
  const { immediate = true, refetchInterval, onSuccess, onError } = options;
  // ...
}
```

## Testing Custom Hooks

```tsx
import { renderHook, act } from '@testing-library/react';

test('useToggle toggles value', () => {
  const { result } = renderHook(() => useToggle(false));

  expect(result.current[0]).toBe(false);

  act(() => {
    result.current[1](); // toggle
  });

  expect(result.current[0]).toBe(true);
});
```

## Why This Matters

- Reusable hooks reduce code duplication
- Clear abstractions improve readability
- Proper structure prevents common bugs
- Good naming makes code self-documenting
