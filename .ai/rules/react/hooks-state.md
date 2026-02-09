# Rule: useState Patterns

## Summary
useState manages local component state. Use it correctly to avoid stale closures, unnecessary re-renders, and state sync bugs.

## DO ✅

### Initialization
- Use lazy initialization for expensive computations
- Initialize with correct type (avoid `null` when possible)
- Use single state object for related values

### Updates
- Use functional updates when new state depends on old
- Batch related state updates
- Keep state minimal - derive what you can

### Types
- Type state explicitly when inference fails
- Use discriminated unions for complex states

## DON'T ❌

- Store derived data in state
- Sync props to state (use key or derive)
- Store stable objects/functions in state
- Update state in render (causes infinite loops)
- Forget functional updates in closures

## Examples

### Good ✅
```tsx
// ✅ Lazy initialization for expensive computation
function ExpensiveInit({ data }: { data: ComplexData }) {
  const [processed, setProcessed] = useState(() => {
    // Only runs once, not on every render
    return expensiveComputation(data);
  });
}

// ✅ Functional update when depending on previous state
function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    // ✅ Always gets latest count
    setCount(prev => prev + 1);
  };

  const incrementThreeTimes = () => {
    // ✅ Each sees the updated value
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
    // Result: count + 3
  };
}

// ✅ Related state in single object
function Form() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
}

// ✅ Discriminated union for complex states
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function DataFetcher<T>() {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });

  // TypeScript knows exactly what's available in each case
  if (state.status === 'success') {
    return <div>{state.data}</div>; // data is available
  }
  if (state.status === 'error') {
    return <div>{state.error.message}</div>; // error is available
  }
}

// ✅ Derived values computed inline
function TaskList({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // ✅ Derived - no state needed
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'active') return !task.completed;
    return task.completed;
  });

  const activeCount = tasks.filter(t => !t.completed).length;
}

// ✅ Explicit typing when needed
function UserForm() {
  // Type can't be inferred from null
  const [user, setUser] = useState<User | null>(null);

  // Array type needs explicit element type
  const [items, setItems] = useState<string[]>([]);
}

// ✅ Reset state with key
function EditForm({ userId }: { userId: string }) {
  const [draft, setDraft] = useState('');
  // Parent uses: <EditForm key={userId} userId={userId} />
  // State resets automatically when userId changes
}
```

### Bad ❌
```tsx
// ❌ Non-functional update in async/closure
function Counter() {
  const [count, setCount] = useState(0);

  const incrementLater = () => {
    setTimeout(() => {
      setCount(count + 1); // ❌ Stale closure - uses old count!
    }, 1000);
  };

  // ✅ Fix: setCount(prev => prev + 1);
}

// ❌ Storing derived data
function TaskList({ tasks }: { tasks: Task[] }) {
  const [filteredTasks, setFilteredTasks] = useState(tasks);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // ❌ Syncing derived data - unnecessary!
    setFilteredTasks(tasks.filter(t => ...));
  }, [tasks, filter]);

  // ✅ Just compute it:
  // const filteredTasks = tasks.filter(t => ...);
}

// ❌ Syncing props to state
function Profile({ user }: { user: User }) {
  const [localUser, setLocalUser] = useState(user);

  useEffect(() => {
    setLocalUser(user); // ❌ Syncing props to state
  }, [user]);

  // ✅ Just use the prop directly, or use key to reset
}

// ❌ Multiple states that change together
function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  // ❌ 4 separate states that are always updated together

  // ✅ Use single object:
  // const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
}

// ❌ Non-lazy expensive initialization
function SearchResults({ query }: { query: string }) {
  // ❌ Runs every render!
  const [results, setResults] = useState(
    expensiveSearch(query)
  );

  // ✅ Lazy:
  // const [results, setResults] = useState(() => expensiveSearch(query));
}

// ❌ State update in render
function BadComponent({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  if (value > 10) {
    setCount(value); // ❌ INFINITE LOOP!
  }

  // ✅ Use useEffect or derive the value
}

// ❌ Storing constants/stable values in state
function Component() {
  // ❌ These never change - don't use state!
  const [config, setConfig] = useState({ apiUrl: '/api' });
  const [validators, setValidators] = useState([isRequired, isEmail]);

  // ✅ Just use constants:
  // const config = { apiUrl: '/api' };
  // const validators = [isRequired, isEmail];
}
```

## State Organization Patterns

### When to Split vs Combine State

```tsx
// ✅ Split: Independent values that change separately
const [isOpen, setIsOpen] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);

// ✅ Combine: Related values that change together
const [position, setPosition] = useState({ x: 0, y: 0 });
const [form, setForm] = useState({ name: '', email: '' });

// ✅ Combine: Complex state with many transitions
const [state, setState] = useState<
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error }
>({ status: 'idle' });
```

### Reducer for Complex Logic

```tsx
// When state logic gets complex, consider useReducer
type State = { items: Item[]; selectedId: string | null; filter: Filter };
type Action =
  | { type: 'select'; id: string }
  | { type: 'add'; item: Item }
  | { type: 'remove'; id: string }
  | { type: 'setFilter'; filter: Filter };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id };
    case 'add':
      return { ...state, items: [...state.items, action.item] };
    // ...
  }
}

function ItemList() {
  const [state, dispatch] = useReducer(reducer, initialState);
}
```

## Common Gotchas

### Object/Array Updates

```tsx
// ❌ Mutating state directly
const [items, setItems] = useState([1, 2, 3]);
items.push(4); // ❌ Mutation!
setItems(items); // Won't trigger re-render

// ✅ Create new array
setItems([...items, 4]);
setItems(prev => [...prev, 4]);

// ❌ Mutating nested object
const [user, setUser] = useState({ name: 'John', address: { city: 'NYC' } });
user.address.city = 'LA'; // ❌ Mutation!

// ✅ Spread at each level
setUser(prev => ({
  ...prev,
  address: { ...prev.address, city: 'LA' }
}));
```

### Batching Behavior

```tsx
// React 18+ batches these automatically
function handleClick() {
  setCount(c => c + 1);  // Does not re-render yet
  setFlag(f => !f);       // Does not re-render yet
  // React batches and re-renders once
}

// Also batched in React 18+
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // Single re-render
}, 1000);
```

## Why This Matters

- Stale closures cause subtle bugs
- Unnecessary state causes sync issues
- Wrong patterns cause extra re-renders
- Proper typing catches bugs at compile time
