# Task Breakdown: Task Management

Based on: `.ai/context/feature.yaml`
References: `functional-spec.md`, `architecture-plan.md`, `data-model.md`

---

## Task 1: Server Helper - assignTaskToNextMember

**Files**: `src/server.ts`
**Action**: Add internal helper function for fair task assignment
**Pattern**: Round-robin with load balancing per architecture-plan.md

**Details**:
- Get all members in household
- Count pending assignments per member
- Assign to member with lowest pending count
- Calculate due date based on task frequency
- Create assignment record

**Verification**: Internal function, tested via createTask

---

## Task 2: Server Function - createTask

**Files**: `src/server.ts`
**Action**: Add `createTask` serverFunction
**Pattern**: serverFunction pattern from AGENTS.md

**Details**:
- Params: name, frequency
- Validate user is member of a household
- Create task record
- Call assignTaskToNextMember for initial assignment
- Return task with assignment info

**Verification**: `dreamer call-server createTask '{"name":"Wash dishes","frequency":"daily"}'`

---

## Task 3: Server Function - getTasks

**Files**: `src/server.ts`
**Action**: Add `getTasks` serverFunction
**Pattern**: serverFunction with JOIN

**Details**:
- Get all active tasks for user's household
- Include current assignment and assignee name
- Return sorted by task name

**Verification**: `dreamer call-server getTasks '{}'`

---

## Task 4: Server Function - getMyAssignments

**Files**: `src/server.ts`
**Action**: Add `getMyAssignments` serverFunction
**Pattern**: serverFunction with JOIN

**Details**:
- Get pending assignments for current member
- Include task info (name, frequency)
- Sort by due date ascending

**Verification**: `dreamer call-server getMyAssignments '{}'`

---

## Task 5: Server Function - completeAssignment

**Files**: `src/server.ts`
**Action**: Add `completeAssignment` serverFunction
**Pattern**: serverFunction with state transition

**Details**:
- Params: assignmentId
- Validate assignment belongs to current member
- Update status to 'completed', set completedAt
- Create next assignment for the task (rotation)
- Return success

**Verification**: `dreamer call-server completeAssignment '{"assignmentId":1}'`

---

## Task 6: Server Function - getHouseholdStats

**Files**: `src/server.ts`
**Action**: Add `getHouseholdStats` serverFunction
**Pattern**: serverFunction with aggregation

**Details**:
- Get all members in household
- Count completed assignments per member (this week)
- Return member list with completion counts

**Verification**: `dreamer call-server getHouseholdStats '{}'`

---

## Task 7: Client - Navigation and View Structure

**Files**: `src/App.tsx`
**Action**: Add tab navigation between MyTasks and Household views
**Pattern**: useState for current view

**Details**:
- Add currentView state: 'myTasks' | 'household'
- Add bottom tab navigation
- Render appropriate view based on state

**Verification**: Can switch between tabs

---

## Task 8: Client - MyTasksView

**Files**: `src/App.tsx`
**Action**: Add MyTasksView with assignments list and complete action
**Pattern**: useQuery + useMutation

**Details**:
- Query getMyAssignments
- Display list of pending tasks with due dates
- Complete button triggers completeAssignment mutation
- Optimistic update: remove from list immediately
- Empty state when all done

**Verification**: See tasks, complete them, see empty state

---

## Task 9: Client - HouseholdView

**Files**: `src/App.tsx`
**Action**: Add HouseholdView with tasks list and member stats
**Pattern**: useQuery for multiple endpoints

**Details**:
- Query getTasks for all household tasks
- Query getHouseholdStats for member completion counts
- Display tasks with current assignee
- Display members with completed counts
- Add Task button opens form

**Verification**: See all tasks and stats

---

## Task 10: Client - TaskForm

**Files**: `src/App.tsx`
**Action**: Add TaskForm modal for creating tasks
**Pattern**: useMutation with form state

**Details**:
- Modal with name input and frequency select
- Frequency options: daily, weekly, biweekly, monthly
- Submit calls createTask mutation
- On success: close modal, invalidate queries

**Verification**: Create task, see it appear in list

---

## Execution Order

```
1. assignTaskToNextMember (helper)
2. createTask (server)
3. getTasks (server)
4. getMyAssignments (server)
5. completeAssignment (server)
6. getHouseholdStats (server)
7. Navigation and View Structure (client)
8. MyTasksView (client)
9. HouseholdView (client)
10. TaskForm (client)
```

Each task builds on the previous. Do not skip ahead.
