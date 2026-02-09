# Rule: Memoization (useMemo, useCallback, memo)

## Summary
Memoization is an optimization. Don't use it everywhere—only where you've measured a problem.

## DO ✅

### When to useMemo
- Expensive calculations (>1ms)
- Maintaining referential equality for context values
- Preventing expensive child re-renders
- Creating objects passed to dependencies

### When to useCallback
- Passing callbacks to optimized children (wrapped in memo)
- Callbacks used in dependency arrays
- Event handlers in performance-critical lists

### When to memo()
- Component re-renders often with same props
- Component is expensive to render
- Component is in a frequently updating parent

## DON'T ❌

- Memoize everything "just in case"
- useMemo for simple operations
- useCallback for every function
- memo() on every component
- Premature optimization

## Examples

### Good ✅
```tsx
// ✅ Expensive calculation
function Analytics({ transactions }: { transactions: Transaction[] }) {
  const stats = useMemo(() => {
    // Complex aggregation over thousands of transactions
    return transactions.reduce((acc, t) => {
      // ... expensive computation
    }, initialStats);
  }, [transactions]);
  
  return <StatsDisplay stats={stats} />;
}

// ✅ Object for context value
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light');
  
  // Without useMemo, every render creates new object
  // causing all consumers to re-render
  const value = useMemo(() => ({
    theme,
    setTheme,
    isDark: theme === 'dark',
  }), [theme]);
  
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ✅ Callback for memoized child
const ExpensiveList = memo(function ExpensiveList({ 
  items, 
  onItemClick 
}: { 
  items: Item[]; 
  onItemClick: (id: string) => void;
}) {
  return (
    <div>
      {items.map(item => (
        <ExpensiveItem 
          key={item.id} 
          item={item} 
          onClick={() => onItemClick(item.id)} 
        />
      ))}
    </div>
  );
});

function Parent() {
  const [items, setItems] = useState<Item[]>([]);
  
  // ✅ useCallback because ExpensiveList is memoized
  const handleItemClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []);
  
  return <ExpensiveList items={items} onItemClick={handleItemClick} />;
}

// ✅ memo() for expensive child in frequently updating parent
const TaskCard = memo(function TaskCard({ task }: { task: Task }) {
  // Expensive render with many elements
  return (
    <div className="task-card">
      {/* Complex layout */}
    </div>
  );
});

function TaskList({ tasks }: { tasks: Task[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // selectedId changes frequently, but TaskCard doesn't need it
  return (
    <div>
      {tasks.map(task => (
        <TaskCard 
          key={task.id} 
          task={task}
          // Don't pass selectedId - TaskCard doesn't need it
        />
      ))}
    </div>
  );
}
```

### Bad ❌
```tsx
// ❌ useMemo for simple computation
function TaskList({ tasks }: { tasks: Task[] }) {
  // Sorting 20 items is instant - no need to memoize
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.title.localeCompare(b.title)),
    [tasks]
  );
  
  // ✅ Just compute it
  const sortedTasks = [...tasks].sort((a, b) => a.title.localeCompare(b.title));
}

// ❌ useCallback for no reason
function Form() {
  // This callback is recreated every render, but it doesn't matter
  // because no child is memoized
  const handleSubmit = useCallback(() => {
    submitForm();
  }, []);
  
  // ✅ Just use a regular function
  const handleSubmit = () => submitForm();
  
  return <button onClick={handleSubmit}>Submit</button>;
}

// ❌ memo() on cheap component
const Label = memo(function Label({ text }: { text: string }) {
  return <span>{text}</span>; // This is already fast
});

// ❌ Memoizing primitives
function Counter() {
  const count = useMemo(() => 5, []); // Pointless - 5 is already stable
}

// ❌ Wrong dependencies break memoization
function Search({ onSearch }: { onSearch: (q: string) => void }) {
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  }, []); // ❌ Missing onSearch - stale closure!
}
```

## Decision Tree

```
Is the component/calculation slow?
├── NO → Don't memoize
└── YES → Have you measured it?
    ├── NO → Measure first, then decide
    └── YES → What's the issue?
        ├── Expensive calculation → useMemo
        ├── Expensive child re-render → memo() on child
        └── Callback causing re-render → useCallback
```

## Cost of Memoization

Memoization is NOT free:
- Memory to store previous result
- Comparison of dependencies each render
- Code complexity

Only use when benefit > cost.

## Common Patterns

```tsx
// ✅ Memoize context value
const value = useMemo(() => ({ theme, toggle }), [theme]);

// ✅ Memoize callback for memoized child
const onClick = useCallback(() => { ... }, [deps]);
<MemoizedChild onClick={onClick} />

// ✅ Memoize expensive derived data
const processed = useMemo(() => expensiveTransform(data), [data]);

// ✅ memo with custom comparison
const TaskCard = memo(
  function TaskCard({ task }: { task: Task }) { ... },
  (prev, next) => prev.task.id === next.task.id && prev.task.title === next.task.title
);
```

## Why This Matters

- Unnecessary memoization adds overhead
- Missing memoization where needed causes jank
- Understanding when to use it is key to React performance
