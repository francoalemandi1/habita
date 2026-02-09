# Architecture Plan: Household Task Manager

## Prerequisites

- Based on: `.ai/specs/functional-spec.md`
- Constrained by: `AGENTS.md`

---

## 1. Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI LAYER                                  │
│                      src/App.tsx                                 │
├─────────────────────────────────────────────────────────────────┤
│  Responsibilities:                                               │
│  - Render views (Onboarding, MyTasks, Household)                │
│  - Manage local UI state (current view, form inputs, modals)    │
│  - Call server functions via React Query                        │
│  - Handle optimistic updates for mutations                      │
│                                                                  │
│  Does NOT:                                                       │
│  - Contain business logic                                        │
│  - Access database directly                                      │
│  - Make decisions about task assignment                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ call() via React Query
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER LAYER                                │
│                     src/server.ts                                │
├─────────────────────────────────────────────────────────────────┤
│  Responsibilities:                                               │
│  - Business logic (assignment algorithm, rotation)              │
│  - Database operations (CRUD for all entities)                  │
│  - Data validation                                               │
│  - User isolation (filter by owner/household)                   │
│                                                                  │
│  Does NOT:                                                       │
│  - Know about UI components                                      │
│  - Store UI state                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Drizzle ORM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│                     src/schema.ts                                │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                         │
│  - households                                                    │
│  - members                                                       │
│  - tasks                                                         │
│  - assignments                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Entity to Component Mapping

### Household

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| Server | `createHousehold` | Create new household, generate invite code |
| Server | `joinHousehold` | Add member to existing household via code |
| Server | `getHousehold` | Get household details with members and stats |
| Client | `OnboardingView` | Create/join household flow |
| Client | `HouseholdView` | Display household overview |

### Member

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| Server | `getCurrentMember` | Get current user's member record |
| Server | `getHouseholdMembers` | List all members in household |
| Client | `MemberList` | Display members with completion stats |

### Task

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| Server | `createTask` | Create task with frequency, trigger initial assignment |
| Server | `getTasks` | List all tasks in household |
| Server | `deactivateTask` | Mark task as inactive |
| Client | `TaskForm` | Form to add new task |
| Client | `TaskList` | Display all household tasks |

### Assignment

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| Server | `getMyAssignments` | Get current member's pending assignments |
| Server | `completeAssignment` | Mark assignment complete, schedule next |
| Server | `assignTask` | Internal: assign task to member using rotation |
| Client | `MyTasksView` | Display member's pending tasks |
| Client | `AssignmentItem` | Single assignment with complete button |

---

## 3. Server Functions Specification

### Household Management

```typescript
// Create a new household and add creator as first member
createHousehold: serverFunction
  params: { householdName: string, memberName: string }
  returns: { household: Household, member: Member, inviteCode: string }

// Join existing household using invite code
joinHousehold: serverFunction
  params: { inviteCode: string, memberName: string }
  returns: { household: Household, member: Member }

// Get household with members and completion stats
getHousehold: serverFunction
  params: {}
  returns: { household: Household, members: MemberWithStats[], taskCount: number }
```

### Task Management

```typescript
// Create a new task and assign to a member
createTask: serverFunction
  params: { name: string, frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' }
  returns: { task: Task, assignment: Assignment }

// Get all tasks in household
getTasks: serverFunction
  params: {}
  returns: { tasks: TaskWithAssignment[] }

// Deactivate a task (soft delete)
deactivateTask: serverFunction
  params: { taskId: number }
  returns: { success: boolean }
```

### Assignment Management

```typescript
// Get current member's pending assignments
getMyAssignments: serverFunction
  params: {}
  returns: { assignments: AssignmentWithTask[] }

// Mark assignment as completed
completeAssignment: serverFunction
  params: { assignmentId: number }
  returns: { success: boolean }
```

### Internal Functions (Not Exported)

```typescript
// Assign a task to the next member in rotation
// Called internally by createTask and completeAssignment
assignTaskToNextMember: (taskId: number) => Assignment

// Generate unique invite code
generateInviteCode: () => string
```

---

## 4. Client State Management

### React Query Keys

```typescript
queryKeys = {
  household: ['household'],
  members: ['members'],
  tasks: ['tasks'],
  myAssignments: ['myAssignments'],
}
```

### Queries

| Key | Server Function | Refetch On |
|-----|-----------------|------------|
| `['household']` | `getHousehold` | Member joins, task created |
| `['members']` | `getHouseholdMembers` | Member joins |
| `['tasks']` | `getTasks` | Task created, task deactivated |
| `['myAssignments']` | `getMyAssignments` | Assignment completed, task created |

### Mutations with Optimistic Updates

```typescript
// Complete assignment - optimistic removal from list
completeAssignment:
  optimistic: Remove assignment from myAssignments cache
  onError: Restore assignment to cache
  onSuccess: Invalidate ['myAssignments'], ['household'] (stats)

// Create task - optimistic add to list
createTask:
  optimistic: Add task to tasks cache with placeholder assignment
  onError: Remove task from cache
  onSuccess: Invalidate ['tasks'], ['myAssignments']
```

### Local UI State (useState)

```typescript
// View navigation
currentView: 'onboarding' | 'myTasks' | 'household' | 'addTask'

// Form state
taskForm: { name: string, frequency: Frequency }

// Modal state
showAddTaskModal: boolean
```

---

## 5. View Structure

```
App.tsx
├── OnboardingView (no household yet)
│   ├── CreateHouseholdForm
│   └── JoinHouseholdForm
│
└── MainApp (has household)
    ├── Navigation (MyTasks | Household tabs)
    │
    ├── MyTasksView (default)
    │   ├── AssignmentList
    │   │   └── AssignmentItem (repeating)
    │   └── EmptyState (all done!)
    │
    ├── HouseholdView
    │   ├── HouseholdHeader (name, invite code)
    │   ├── MemberList
    │   │   └── MemberItem (name, completion count)
    │   └── TaskList
    │       └── TaskItem (name, frequency, current assignee)
    │
    └── AddTaskModal
        └── TaskForm
```

---

## 6. Data Flow Examples

### Flow: User Completes a Task

```
1. User taps "Complete" on AssignmentItem
2. UI: Optimistically removes assignment from list
3. Client: mutation.mutate(assignmentId)
4. Server: completeAssignment(assignmentId)
   a. Update assignment status to 'completed'
   b. Calculate next due date based on frequency
   c. Call assignTaskToNextMember() for next cycle
   d. Return success
5. Client: Invalidate queries
6. UI: Refetch shows updated state
```

### Flow: New Task Created

```
1. User fills TaskForm, submits
2. UI: Close modal, optimistically add task
3. Client: mutation.mutate({ name, frequency })
4. Server: createTask(name, frequency)
   a. Create task record
   b. Call assignTaskToNextMember() for initial assignment
   c. Return task with assignment
5. Client: Invalidate ['tasks'], ['myAssignments']
6. UI: Task appears in list with assignee
```

### Flow: Member Joins Household

```
1. User enters invite code, submits
2. Client: mutation.mutate({ inviteCode, memberName })
3. Server: joinHousehold(inviteCode, memberName)
   a. Find household by invite code
   b. Create member record
   c. Return household and member
4. Client: Store member context
5. UI: Transition from OnboardingView to MainApp
```

---

## 7. Assignment Algorithm

Located in server layer, called by `createTask` and `completeAssignment`.

```
assignTaskToNextMember(taskId):
  1. Get all active members in household
  2. Get pending assignment counts per member
  3. Get last assignee for this specific task
  
  Selection priority:
  a. Member with lowest pending count
  b. If tie: Member who did this task least recently
  c. If tie: Random selection
  
  4. Create assignment record:
     - taskId
     - memberId (selected)
     - status: 'pending'
     - dueDate: calculated from task frequency
  
  5. Return assignment
```

---

## 8. Security Model

### User Isolation

Per AGENTS.md, all tables include `owner` column. However, this app has **household-level isolation**, not user-level.

Strategy:
- `households` table has `owner` (creator's email)
- `members` table links users to households
- All queries filter by `householdId` derived from current member
- Current member is determined by `sdk.getUser().email`

```typescript
// Pattern for all queries
const member = await getCurrentMember(sdk);
if (!member) throw new Error('Not a member of any household');

const results = await db
  .select()
  .from(tasks)
  .where(eq(tasks.householdId, member.householdId));
```

### Invite Code Security

- Codes are random, 8 characters, alphanumeric
- Codes do not expire in MVP (future: add expiration)
- Anyone with code can join (trust model per functional spec)

---

## 9. File Structure (Final)

```
src/
  App.tsx              # All UI components and views
  server.ts            # All server functions
  schema.ts            # Database schema (4 tables)

.ai/
  specs/
    functional-spec.md
    architecture-plan.md   # This document
    data-model.md          # Next phase
```

No additional files needed for MVP. Following AGENTS.md constraint of minimal file creation.

---

## 10. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Single App.tsx | Yes | MVP simplicity, AGENTS.md pattern |
| Single server.ts | Yes | MVP simplicity, AGENTS.md pattern |
| Household isolation | Yes | Business requirement, not user-level |
| Optimistic updates | Complete, Create | Predictable user actions |
| Soft delete tasks | Yes | Preserve history, functional spec rule |
| No auth in MVP | Yes | Functional spec assumption |

---

## Summary

This architecture maps the functional specification to the dev-agents SDK constraints:

- **4 entities** → 4 database tables
- **6 user flows** → 6 server functions + internal helpers
- **3 views** → Single App.tsx with view state
- **All business logic** → Server layer only
- **All state** → React Query + server

Next step: Data Model (database schema design)
