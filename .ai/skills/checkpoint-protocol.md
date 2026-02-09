# Skill: Checkpoint Protocol

## Purpose
Define exactly how human checkpoints work: when to stop, when to continue, how to handle timeouts, and how to validate approval.

## When to Use
- At any workflow checkpoint
- When needing human approval
- When human response is required to continue

## Checkpoint Types

### 🛑 BLOCKING Checkpoint
Agent MUST stop and wait for explicit human response.

**Characteristics:**
- Cannot proceed without human input
- Workflow pauses until response received
- No timeout auto-continue
- Requires explicit approval signal

**Used For:**
- Spec compilation questions
- HIGH-risk schema migrations
- Critical review issues
- Unresolvable conflicts

### ⚠️ APPROVAL Checkpoint
Agent presents work and waits for approval, but can proceed after timeout.

**Characteristics:**
- Human should review
- If no response in [timeout], agent proceeds with recommendation
- Agent logs that it proceeded without explicit approval
- Human can later request changes

**Used For:**
- Functional spec review
- Architecture plan review
- Task breakdown review
- Non-critical review findings

### ℹ️ NOTIFICATION Checkpoint
Agent informs human and continues immediately.

**Characteristics:**
- Informational only
- No wait for response
- Human can interrupt if needed
- Logged for audit trail

**Used For:**
- Task completion notices
- Verification passing
- Progress updates
- Minor warnings

---

## Checkpoint Definitions by Workflow Point

| Checkpoint | Type | Timeout | Default if Timeout |
|------------|------|---------|-------------------|
| After spec-compilation | 🛑 BLOCKING | None | WAIT |
| After functional-spec | ⚠️ APPROVAL | 4 hours | Proceed |
| After architecture-plan | ⚠️ APPROVAL | 4 hours | Proceed |
| After data-model | ⚠️ APPROVAL | 4 hours | Proceed |
| After validate-specs (no conflicts) | ℹ️ NOTIFICATION | 0 | Proceed |
| After validate-specs (conflicts) | 🛑 BLOCKING | None | WAIT |
| After task-breakdown | ⚠️ APPROVAL | 2 hours | Proceed |
| After each task | ℹ️ NOTIFICATION | 0 | Continue |
| After schema-migration (LOW risk) | ⚠️ APPROVAL | 1 hour | Proceed |
| After schema-migration (HIGH risk) | 🛑 BLOCKING | None | WAIT |
| After agent-review (no critical) | ⚠️ APPROVAL | 4 hours | Merge OK |
| After agent-review (critical) | 🛑 BLOCKING | None | WAIT |

---

## Checkpoint Execution Protocol

### For BLOCKING Checkpoints

```
1. STOP all work
2. Save current state to .ai/context/checkpoint-[name]-[timestamp].md
3. Present to human:
   - What was completed
   - What decision is needed
   - Available options (if applicable)
   - Consequence of each option
4. WAIT for response
5. On response:
   - Validate response is complete
   - If incomplete, ask for clarification
   - If complete, log approval and proceed
6. Log: "BLOCKING checkpoint [name] approved by human at [time]"
```

### For APPROVAL Checkpoints

```
1. Present work to human:
   - Summary of what was done
   - Recommendation for next step
   - Request for approval
2. Start timeout timer
3. WHILE waiting:
   - Check for human response every [interval]
   - If response received, process it
4. On timeout:
   - Log: "APPROVAL checkpoint [name] timed out after [duration]"
   - Log: "Proceeding with recommendation: [what]"
   - Continue with recommended action
5. On approval:
   - Log: "APPROVAL checkpoint [name] approved"
   - Continue
6. On rejection:
   - Log: "APPROVAL checkpoint [name] rejected"
   - Request specific changes needed
   - Implement changes
   - Re-present for approval
```

### For NOTIFICATION Checkpoints

```
1. Log: "NOTIFICATION: [what happened]"
2. Display to human (non-blocking)
3. Continue immediately
```

---

## Approval Validation

### What Constitutes Valid Approval

**Explicit approval signals:**
- "Approved"
- "LGTM" (Looks Good To Me)
- "Proceed"
- "Continue"
- "Yes"
- "Go ahead"
- Clicking an "Approve" button
- Emoji: ✅ 👍

**NOT approval signals (ambiguous):**
- "OK" (could be acknowledgment, not approval)
- "I see"
- "Interesting"
- No response
- "Maybe"

**For ambiguous responses:**
```
Ask: "To confirm, should I proceed with [specific action]? Reply 'yes' to approve."
```

### What Constitutes Valid Rejection

**Explicit rejection signals:**
- "No"
- "Stop"
- "Wait"
- "Don't proceed"
- "Need changes"
- "Rejected"
- Emoji: ❌ 🛑

**On rejection, ALWAYS ask:**
```
"What specific changes are needed before proceeding?"
```

---

## Timeout Configuration

```yaml
# Default timeouts (can be overridden per project)
checkpoints:
  spec_compilation: blocking  # no timeout
  functional_spec: 4h
  architecture_plan: 4h
  data_model: 4h
  task_breakdown: 2h
  schema_migration_low: 1h
  schema_migration_high: blocking
  review_approval: 4h
  review_critical: blocking

# Notification interval (how often to remind)
reminder_interval: 1h

# Max reminders before escalation
max_reminders: 3
```

---

## State Preservation at Checkpoints

Every checkpoint saves state for resumption:

```markdown
# Checkpoint State: [name]

**Timestamp**: [ISO timestamp]
**Type**: BLOCKING | APPROVAL | NOTIFICATION
**Status**: WAITING | APPROVED | REJECTED | TIMED_OUT

## Context
- Workflow: [workflow name]
- Agent: [agent name]
- Previous checkpoint: [name or "none"]

## Work Completed
[Summary of what was done before this checkpoint]

## Decision Required
[What the human needs to decide]

## Options Presented
1. [Option A] - [consequence]
2. [Option B] - [consequence]

## Recommendation
[What agent recommends and why]

## Resume Instructions
[How to resume from this point]
```

Save to: `.ai/context/checkpoint-[name]-[timestamp].md`

---

## Handling Checkpoint Conflicts

### Human Changes Mind After Approval

```
Severity: MEDIUM
Recovery:
1. Assess how much work was done after approval
2. If minimal:
   - Revert changes
   - Implement new direction
3. If significant:
   - Present cost of reverting
   - Ask for explicit confirmation to revert
   - Create new tasks for changes
```

### Multiple Humans Give Conflicting Approvals

```
Severity: HIGH
Recovery:
1. STOP and document conflict
2. Identify decision authority:
   - Who is the decision maker for this checkpoint?
   - Is there a hierarchy?
3. Present conflict to decision maker
4. Wait for unified decision
5. Document: "[Person] has final authority, decided [X]"
```

### Human Unavailable for Extended Period

```
Severity: varies by checkpoint type
Recovery:
1. For BLOCKING:
   - Save state
   - Set workflow to PAUSED
   - Document reason: "Awaiting [person] for [decision]"
   - Send escalation after [configured time]
2. For APPROVAL:
   - Proceed after timeout
   - Log extensively
   - Flag for review when human returns
```

---

## Audit Trail Requirements

Every checkpoint interaction logged:

```
[timestamp] CHECKPOINT [name] TYPE=[type] STATUS=[status]
[timestamp] CHECKPOINT [name] PRESENTED: [summary]
[timestamp] CHECKPOINT [name] RESPONSE: [human response]
[timestamp] CHECKPOINT [name] ACTION: [what agent did]
```

Store in: `.ai/context/checkpoint-log.md` (append-only)

---

## Model Recommendation
**Sonnet** — Protocol execution is systematic.
