# Rule: React Components

## Summary
Build small, focused components with clear responsibilities.

## DO ✅

### Component Structure
- One component per file (with related small components okay)
- Export component as default or named (be consistent)
- Props interface defined above component
- Hooks at top of component
- Early returns for loading/error states
- Main render logic last

### Component Size
- Under 100 lines ideal, max 200
- If larger, extract sub-components
- If many hooks, extract to custom hook

### Props
- Define interface for props
- Destructure props in function signature
- Use sensible defaults
- Avoid prop drilling (more than 2 levels)

## DON'T ❌

- Huge components (>300 lines)
- Business logic in components (put in hooks/utils)
- Inline functions in JSX (extract to const)
- Deeply nested JSX (extract components)
- Anonymous components (`const x = () => <div>`)

## Examples

### Good ✅
```tsx
interface TaskCardProps {
  task: Task;
  onComplete?: (taskId: string) => void;
  showAssignee?: boolean;
}

function TaskCard({ task, onComplete, showAssignee = true }: TaskCardProps) {
  const { mutate: completeTask, isPending } = useCompleteTask();
  
  const handleComplete = () => {
    completeTask(task.id);
    onComplete?.(task.id);
  };
  
  // Early return for edge case
  if (!task) return null;
  
  const isOverdue = task.dueDate < new Date();
  
  return (
    <div className={`task-card ${isOverdue ? 'overdue' : ''}`}>
      <h3>{task.title}</h3>
      {showAssignee && task.assignee && (
        <AssigneeBadge member={task.assignee} />
      )}
      <button onClick={handleComplete} disabled={isPending}>
        {isPending ? 'Completing...' : 'Complete'}
      </button>
    </div>
  );
}

// Small related component in same file is okay
function AssigneeBadge({ member }: { member: Member }) {
  return <span className="badge">{member.name}</span>;
}
```

### Bad ❌
```tsx
// Too large, too many responsibilities
function TaskDashboard() {
  // 20 lines of hooks...
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date');
  const [selectedTask, setSelectedTask] = useState(null);
  // ...
  
  // 50 lines of handlers...
  const handleTaskClick = () => { /* ... */ };
  const handleFilterChange = () => { /* ... */ };
  const handleSortChange = () => { /* ... */ };
  // ...
  
  // 100 lines of render...
  return (
    <div>
      {/* Inline function - creates new function each render */}
      <button onClick={() => setFilter('all')}>All</button>
      
      {/* Deep nesting */}
      <div>
        <div>
          <div>
            <div>
              {tasks.map(task => (
                // Huge inline JSX
                <div key={task.id}>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  {/* 20 more lines... */}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Component Organization

```
src/
├── App.tsx                 # Main app component
├── components/             # Reusable components
│   ├── TaskCard.tsx
│   ├── MemberBadge.tsx
│   └── LoadingSpinner.tsx
├── features/               # Feature-specific components
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskForm.tsx
│   │   └── useTaskActions.ts
│   └── members/
│       └── MemberList.tsx
└── hooks/                  # Shared custom hooks
    └── useHousehold.ts
```

## Why This Matters

- Small components are easier to test
- Clear props document usage
- Extraction improves reusability
- Separation of concerns aids maintenance
