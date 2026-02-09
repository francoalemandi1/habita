# Functional Specification: Household Task Manager

## 1. Problem Definition

**The Mental Load Problem**

In shared living situations (couples, roommates, families), household tasks create a hidden burden beyond the physical work itself: the "mental load" of remembering, planning, delegating, and tracking chores.

This manifests as:
- **Decision fatigue**: Constant micro-negotiations about who does what
- **Unequal invisible labor**: One person often becomes the "household manager" by default
- **Conflict source**: Ambiguity about responsibilities leads to resentment
- **Forgotten tasks**: Without a system, things fall through the cracks

**Why it matters**

A fair, automatic distribution system removes the negotiation overhead. Instead of daily "who's doing the dishes?" conversations, the system decides. Members simply check what's assigned to them and do it.

---

## 2. Target Users and Context

### Primary Users

**Household Members**: People who share a living space and want to distribute chores fairly.

Typical profiles:
- Couples (2 people)
- Roommates (2-5 people)
- Families with older children who can contribute

### Context of Use

- **When**: Daily, typically morning (planning) and evening (completing)
- **Where**: At home, on mobile devices
- **Frequency**: Brief, frequent interactions (check task → mark done)
- **Mindset**: Users want minimal friction; they're not excited about chores, they want chores to "just happen"

### User Goals

1. **Know what I need to do today** without asking anyone
2. **Trust the system is fair** so I don't feel taken advantage of
3. **Spend zero time negotiating** daily chores
4. **See that others are contributing** (transparency, not surveillance)

---

## 3. Core Concepts and Entities

### Household
A group of people who live together and share tasks.
- Has a unique identifier/invite mechanism
- Contains members
- Contains tasks

### Member
A person belonging to a household.
- Has a name/identifier
- Belongs to exactly one household (in MVP)
- Can have tasks assigned to them
- Has an assignment history

### Task
A household chore that needs to be done.
- Has a name (e.g., "Wash dishes", "Vacuum living room")
- Has a frequency (daily, weekly, etc.)
- Belongs to a household
- Can be assigned to a member

### Assignment
The connection between a task and a member for a specific time period.
- Links one task to one member
- Has a status (pending, completed)
- Has a due date
- Tracks completion

### Rotation
The logic that determines how tasks move between members over time.
- Ensures fairness over time
- Considers task frequency
- Distributes load evenly

---

## 4. System Rules and Logic

### Household Rules

1. A household must have at least 2 members to function
2. A household can have unlimited tasks
3. All members of a household see all tasks and assignments

### Task Rules

1. Every task must have a name (non-empty)
2. Every task must have a frequency:
   - Daily (repeats every day)
   - Weekly (repeats every 7 days)
   - Biweekly (repeats every 14 days)
   - Monthly (repeats every 30 days)
3. A task can only be assigned to one member at a time
4. Tasks are never "deleted", they can be deactivated

### Assignment Rules

1. Each task instance generates exactly one assignment
2. An assignment belongs to exactly one member
3. Assignment status transitions: `pending` → `completed` (one-way)
4. Only the assigned member can mark their assignment as completed
5. Assignments have a due date based on task frequency

### Rotation Rules (Automatic Assignment Logic)

The system distributes tasks fairly using these principles:

1. **Round-robin base**: Tasks rotate through members in order
2. **Load balancing**: The system tracks cumulative assignments per member
3. **Fairness over time**: A member who did more last week may do less this week
4. **No same-day overload**: Spread assignments across members each day

**Initial Assignment Algorithm (MVP)**:
```
For each task in household:
  1. Count current pending assignments per member
  2. Assign to member with lowest pending count
  3. If tie, assign to member who did this task least recently
  4. If still tie, assign randomly
```

### Completion Rules

1. When a task is marked complete, it's done for that cycle
2. The next instance of that task will be assigned to the next member in rotation
3. Incomplete tasks past due date remain visible but marked as overdue

---

## 5. User Flows

### Flow 1: Household Creation (First User) - Intelligent Onboarding

The onboarding flow is designed to minimize friction and demonstrate value immediately through AI-powered task suggestions.

```
Step 1: Name Collection
1. User opens app for first time
2. System asks: "What's your name?"
3. User enters their name
4. User taps "Continue"

Step 2: Household Context (Multimodal Input)
1. System asks: "Tell us about your home"
2. User provides context via:
   - Text input (textarea with placeholder examples)
   - OR Voice recording (tap microphone to record)
3. Example inputs:
   - "My partner and I live in an apartment, we have a cat"
   - "3 roommates in a house with a backyard"
   - "Family of 4, two teenage kids"
4. User taps "Continue"

Step 3: AI Task Generation (Loading State)
1. System shows loading animation: "Preparing your tasks..."
2. Agent analyzes household context:
   - Extracts: household type, number of people, pets, special circumstances
   - Considers: cultural context, typical tasks for that household type
   - Uses: sdk.callLLM with household context to generate personalized task list
3. Agent generates 5-10 relevant tasks with appropriate frequencies

Step 4: Task Selection & Review
1. System shows: "These tasks seem relevant for your home"
2. User sees AI-generated task list with checkboxes (all pre-selected)
3. Each task shows: name + frequency
4. User can:
   - Uncheck tasks they don't want
   - Tap "+ Add another" to add custom tasks
   - Edit frequency if needed
5. User taps "Create Household"

Step 5: Confirmation & Invite
1. System creates household, member, and selected tasks
2. System generates invite code
3. System shows success screen with invite code
4. User can:
   - Copy code to clipboard
   - Share via native share sheet (WhatsApp, SMS, etc.)
   - Continue to app
```

**End state**: Household exists with 1 member AND pre-populated tasks ready to assign

**Key UX Principles**:
- Show value before asking for commitment
- Use natural language input (text or voice)
- Let AI do the heavy lifting of task selection
- User has final control over what gets created

### Flow 2: Joining a Household

```
1. User opens app for first time
2. System asks for user's name first
3. System prompts: "Have an invite code?"
4. User enters invite code (or clicks invite link)
5. System validates code and shows household name
6. System adds member to household
7. User sees household dashboard with existing tasks
8. New member is included in next task rotation
```

**End state**: Member added to existing household, sees current tasks
### Flow 3: Adding Tasks to Household

```
1. Any member opens "Add Task" 
2. User enters task name (e.g., "Take out trash")
3. User selects frequency (daily/weekly/biweekly/monthly)
4. User confirms
5. System creates task
6. System immediately assigns task to a member using rotation logic
7. All members see updated task list
```

**End state**: Task exists and is assigned

### Flow 4: Viewing My Tasks (Daily Use)

```
1. Member opens app
2. System shows "My Tasks" view by default
3. Member sees list of their pending assignments for today
4. Each assignment shows:
   - Task name
   - Due date
   - Status (pending/overdue)
```

**End state**: Member knows what they need to do

### Flow 5: Completing a Task

```
1. Member views their pending task
2. Member taps "Mark Complete"
3. System updates assignment status to completed
4. System records completion timestamp
5. Task disappears from pending list
6. System schedules next instance with rotation
```

**End state**: Task completed, next instance scheduled to different member

### Flow 6: Viewing Household Overview

```
1. Member navigates to "Household" view
2. System shows:
   - All tasks in household
   - Current assignment for each task
   - Member completion stats (tasks completed this week)
3. Member can see fairness at a glance
```

**End state**: Transparency into household distribution

---

## 6. MVP Scope

### Included in MVP

1. **Onboarding**
   - Create household
   - Join household via code
   - Add member name

2. **Task Management**
   - Create task with name and frequency
   - View all household tasks
   - Deactivate task

3. **Automatic Assignment**
   - System assigns tasks to members automatically
   - Round-robin rotation ensures fairness
   - Load balancing across members

4. **Task Completion**
   - View my assigned tasks
   - Mark task as complete
   - See completion reflected immediately

5. **Household View**
   - See all tasks and current assignees
   - Basic completion stats per member

### NOT in MVP (Explicitly Excluded)

- User authentication (email/password) — MVP uses simple name entry
- Multiple households per user
- Task editing after creation
- Custom rotation rules
- Push notifications
- Task negotiation/swapping between members
- Gamification (points, streaks, rewards)
- Task categories or tags
- Recurring task exceptions ("skip this week")
- Historical analytics
- Calendar integration

---

## 7. Out of Scope / Future Features

### Phase 2 (Post-MVP)
- Task negotiation: Member can request to swap assignment with another
- Push notifications for due tasks
- Task editing and deletion
- Proper user accounts with authentication

### Phase 3 (Future)
- Gamification: Points for completions, streaks, household leaderboard
- Smart assignment: Learn preferences, weight tasks by difficulty
- Calendar sync
- Voice assistant integration ("Hey Siri, what are my chores today?")

---

## 8. Edge Cases and Constraints

### Edge Cases to Handle

1. **Single member household**
   - System works but all tasks assigned to that member
   - Prompt to invite others

2. **Member leaves household**
   - Reassign their pending tasks to others
   - Keep completion history

3. **All tasks completed for today**
   - Show encouraging empty state, not error

4. **New member joins mid-cycle**
   - Include them in next rotation
   - Don't reassign existing assignments

5. **Task with frequency longer than household age**
   - Assign normally, rotation will balance over time

6. **Overdue tasks**
   - Keep visible, mark as overdue
   - Don't auto-reassign (member should complete or household discusses)

### Constraints

1. **Minimum 2 members** for rotation to make sense (but allow 1 for setup)
2. **Maximum 20 members** per household (practical limit)
3. **Maximum 100 active tasks** per household (practical limit)
4. **Task names** limited to 100 characters
5. **Household names** limited to 50 characters

---

## 9. Assumptions

1. **Trust within household**: Members are honest about completing tasks; no verification needed
2. **Shared device is okay**: MVP doesn't require personal accounts; members can use same device
3. **Equal capability**: All members can do all tasks (no skill/preference matching in MVP)
4. **Time zone**: All household members are in the same time zone
5. **Language**: English only for MVP
6. **Connectivity**: Users have internet access when using the app
7. **Fairness = equal count**: Fair distribution means equal number of tasks over time, not equal effort (task weighting is future feature)

---

## Summary

This system solves the mental load problem by making task distribution automatic and transparent. Users join a household, add their recurring chores, and the system handles assignment rotation. Each member simply checks their tasks and marks them done. No negotiation, no nagging, no ambiguity.

The MVP focuses on the core loop: **Create household → Add tasks → Automatic assignment → Complete tasks → Repeat**.

Everything else (gamification, negotiation, smart features) comes later once the core is validated.
