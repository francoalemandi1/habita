# Implementation Plan: Household Task Manager - Core Experience

## Executive Summary

This document details the complete implementation of the post-onboarding experience for the Household Task Manager, following the decisions made:

| Dimension | Decision | Summary |
|-----------|----------|---------|
| Distribution | B- | Preferences + fair rotation |
| Time | A | Fixed frequency with tolerance |
| Completion | A+ | Simple done + optional feedback |
| Visibility | C | Fairness dashboard |
| AI | B→C | Reactive now, proactive later |

---

## Phase 1: Database Schema Changes

### New Tables

```typescript
// Member preferences - what tasks they like/dislike
export const memberPreferences = sqliteTable("member_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  taskId: integer("task_id").notNull(),
  preference: text("preference").notNull(), // 'preferred' | 'neutral' | 'disliked'
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Assignment feedback - optional data after completion
export const assignmentFeedback = sqliteTable("assignment_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assignmentId: integer("assignment_id").notNull(),
  durationMinutes: integer("duration_minutes"),
  difficulty: text("difficulty"), // 'easy' | 'normal' | 'hard'
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Fairness snapshots - for historical tracking
export const fairnessSnapshots = sqliteTable("fairness_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id").notNull(),
  memberId: integer("member_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  totalWeight: integer("total_weight").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### Modified Tables

```typescript
// tasks - add weight column for effort scoring
weight: integer("weight").notNull().default(1), // 1-5

// assignments - track if it was overdue when completed
wasOverdue: integer("was_overdue", { mode: "boolean" }).default(false),
```

---

## Phase 2: Server Functions

### 2.1 Enhanced Assignment Algorithm

Smart task assignment considering:
1. Member preferences (+20 for preferred, -20 for disliked)
2. Current pending count (-5 per pending task)
3. Recency (who did this task last, +1 per day since)

### 2.2 New Endpoints

| Function | Description |
|----------|-------------|
| `setTaskPreference` | Set member's preference for a task |
| `getMyPreferences` | Get current member's preferences |
| `completeAssignmentWithFeedback` | Complete with optional feedback |
| `getFairnessDashboard` | Get fairness metrics |
| `askHouseholdAssistant` | AI-powered Q&A |

---

## Phase 3: Frontend Views

### 3.1 Navigation Update

```
┌──────────────────────────────────────┐
│  [Tasks] [Dashboard] [Settings]      │
└──────────────────────────────────────┘
```

### 3.2 My Tasks View (Enhanced)

- Grouped by: Overdue | Today | Upcoming
- Swipe to complete
- Optional feedback modal after completion

### 3.3 Fairness Dashboard

- Fairness score (0-100%)
- Member contribution bars
- Task activity history
- Period filter: Week | Month | All

### 3.4 AI Assistant (Bottom Sheet)

- Suggested questions
- Conversational interface
- Task recommendations

---

## Phase 4: Implementation Order

### Sprint 1: Foundation
1. Update schema.ts with new tables
2. Implement preference functions
3. Implement enhanced assignment algorithm

### Sprint 2: Dashboard
1. Implement getFairnessDashboard
2. Create FairnessDashboard component
3. Update navigation

### Sprint 3: Enhanced UX
1. Create CompletionFeedbackModal
2. Update MyTasksView with categories

### Sprint 4: AI Assistant
1. Create prompt template
2. Implement askHouseholdAssistant
3. Create AIAssistantSheet component

---

## Testing Checklist

- [ ] Preferences affect assignment distribution
- [ ] Completion creates next assignment
- [ ] Feedback saves correctly
- [ ] Dashboard shows accurate fairness
- [ ] AI assistant answers questions
- [ ] Dark mode works
- [ ] Widget view works
