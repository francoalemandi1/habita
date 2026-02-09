# Rule: useEffect Patterns

## Summary
useEffect is for synchronizing with external systems, not for transforming data or reacting to state changes.

## DO ✅

### Proper Use Cases
- Fetching data (though prefer React Query)
- Setting up subscriptions/event listeners
- Manually changing the DOM
- Logging/analytics
- Connecting to external systems

### Cleanup
- Always return cleanup function for subscriptions
- Cancel pending requests on unmount
- Remove event listeners

### Dependencies
- Include ALL values used inside effect
- Use ESLint `react-hooks/exhaustive-deps` rule
- If effect runs too often, fix the root cause

## DON'T ❌

- Transform/filter data in useEffect (compute it instead)
- Reset state when props change (use key instead)
- Chain effects (A → B → C)
- Fetch in useEffect without React Query
- Ignore dependency warnings

## Examples

### Good ✅
```tsx
// Subscription with cleanup
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();
    
    return () => {
      connection.disconnect(); // Cleanup
    };
  }, [roomId]); // Runs when roomId changes
}

// Event listener with cleanup
function WindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    handleResize(); // Initial size
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty deps = mount only
  
  return <div>{size.width} x {size.height}</div>;
}

// Sync with external system
function DocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

// Logging/analytics
function PageView({ page }: { page: string }) {
  useEffect(() => {
    analytics.track('page_view', { page });
  }, [page]);
}
```

### Bad ❌
```tsx
// ❌ Transforming data - just compute it!
function TaskList({ tasks }: { tasks: Task[] }) {
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    setFilteredTasks(tasks.filter(t => !t.completed));
  }, [tasks]);
  
  // ✅ Instead: const filteredTasks = tasks.filter(t => !t.completed);
}

// ❌ Resetting state on prop change - use key!
function Form({ userId }: { userId: string }) {
  const [name, setName] = useState('');
  
  useEffect(() => {
    setName(''); // Reset when userId changes
  }, [userId]);
  
  // ✅ Instead: <Form key={userId} userId={userId} />
}

// ❌ Chaining effects
function ChainedEffects({ id }: { id: string }) {
  const [data, setData] = useState(null);
  const [processed, setProcessed] = useState(null);
  
  useEffect(() => {
    fetchData(id).then(setData);
  }, [id]);
  
  useEffect(() => {
    if (data) {
      setProcessed(transform(data)); // Chains off first effect
    }
  }, [data]);
  
  // ✅ Instead: combine into one effect or compute processed from data
}

// ❌ Missing cleanup
function Subscription({ channel }: { channel: string }) {
  useEffect(() => {
    const sub = subscribe(channel, handleMessage);
    // Missing: return () => sub.unsubscribe();
  }, [channel]);
}

// ❌ Missing dependency
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    search(query).then(setResults);
  }, []); // ❌ Missing 'query' - stale closure!
}
```

## Effect vs Computed

| Need | Solution |
|------|----------|
| Transform/filter data | Compute inline or useMemo |
| Respond to prop change | Just render with new prop |
| Reset state on prop change | Use `key` prop |
| Cache expensive calculation | useMemo |
| Side effect (API, DOM, log) | useEffect |

## Dependency Array Patterns

```tsx
// Run on every render (rarely needed)
useEffect(() => { ... }); // No dependency array

// Run once on mount
useEffect(() => { ... }, []); // Empty array

// Run when specific values change
useEffect(() => { ... }, [a, b]); // When a OR b changes

// Object/array dependencies - be careful!
useEffect(() => {
  // This runs every render because {} !== {}
}, [{ foo: 'bar' }]); // ❌ New object each render

// ✅ Depend on primitive values
useEffect(() => {
  doSomething(user.id, user.name);
}, [user.id, user.name]); // Primitives are stable
```

## Why This Matters

- Missing cleanup causes memory leaks
- Wrong dependencies cause stale data bugs
- Overusing effects makes code hard to follow
- Effects for data transformation is inefficient
