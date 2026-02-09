# Rule: React State Management

## Summary
Use React Query for server state, React state for UI state. Keep them separate.

## DO ✅

### Server State (React Query)
- All data from server goes through React Query
- Use `queryKey` for cache identity
- Invalidate queries after mutations
- Use optimistic updates for better UX

### UI State (useState/useReducer)
- Modal open/closed
- Form inputs
- Expanded/collapsed
- Selected items
- Local filters

### State Placement
- Lift state to lowest common ancestor
- Avoid prop drilling (use composition or context)
- Colocate state with its consumers

## DON'T ❌

- Store server data in useState
- Sync React Query data to local state
- Global state for component-local concerns
- Derived state stored separately
- Over-use context for state

## Examples

### Good ✅
```tsx
// Server state with React Query
function TaskDashboard() {
  // Server state - from API
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => call<typeof getTasks>('getTasks', {}),
  });
  
  // UI state - local to this view
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Derived state - computed, not stored
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (filter === 'all') return tasks;
    return tasks.filter(t => 
      filter === 'completed' ? t.completed : !t.completed
    );
  }, [tasks, filter]);
  
  return (
    <div>
      <FilterButtons filter={filter} onChange={setFilter} />
      <TaskList 
        tasks={filteredTasks} 
        onSelect={setSelectedTaskId} 
      />
      {selectedTaskId && (
        <TaskDetail taskId={selectedTaskId} />
      )}
    </div>
  );
}

// Optimistic update pattern
function useCompleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (taskId: string) => 
      call<typeof completeTask>('completeTask', { taskId }),
    
    // Optimistically update before server responds
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      const previous = queryClient.getQueryData(['tasks']);
      
      queryClient.setQueryData(['tasks'], (old: Task[] | undefined) =>
        old?.map(t => t.id === taskId ? { ...t, completed: true } : t)
      );
      
      return { previous };
    },
    
    // Rollback on error
    onError: (err, taskId, context) => {
      queryClient.setQueryData(['tasks'], context?.previous);
    },
    
    // Refetch on success/error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### Bad ❌
```tsx
// Duplicating server state
function TaskList() {
  const { data } = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  
  // ❌ Copying server data to local state
  const [tasks, setTasks] = useState([]);
  
  useEffect(() => {
    if (data) setTasks(data);
  }, [data]);
  
  // Now state can drift from server...
}

// Storing derived state
function FilteredTasks({ tasks }) {
  // ❌ Don't store what can be computed
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    setFilteredTasks(tasks.filter(t => ...));
  }, [tasks, filter]);
  
  // Just compute it:
  // const filteredTasks = tasks.filter(t => ...);
}

// Global state for local concern
const GlobalContext = createContext();

function Modal() {
  // ❌ Modal open/close shouldn't be global
  const { isModalOpen, setModalOpen } = useContext(GlobalContext);
}
```

## State Decision Tree

```
Is it from the server?
├── YES → React Query
└── NO → Is it used by multiple components?
    ├── YES → Lift to common ancestor or context
    └── NO → Local useState in component
        
Can it be computed from other state?
├── YES → Don't store it, compute it (useMemo if expensive)
└── NO → Store it
```

## Why This Matters

- React Query handles caching, refetching, synchronization
- Local state is simpler and more predictable
- Derived state prevents sync bugs
- Proper placement reduces prop drilling
