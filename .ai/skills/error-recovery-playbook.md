# Skill: Error Recovery Playbook

## Purpose
Consolidated reference for handling all error types across the workflow. Provides consistent recovery patterns for every agent and skill.

## When to Use
- When any skill or agent encounters an error
- When verification fails
- When human checkpoint times out
- When specs conflict unresolvably
- When implementation gets stuck

## Error Classification

### Severity Levels (Use Consistently Everywhere)

| Level | Symbol | Meaning | Action |
|-------|--------|---------|--------|
| **CRITICAL** | 🔴 | Cannot proceed, blocks workflow | STOP, document, notify human |
| **HIGH** | 🟠 | Should not proceed, risk of bad outcome | STOP, attempt 1 fix, if fails notify human |
| **MEDIUM** | 🟡 | Can proceed with caution | Log warning, continue, review later |
| **LOW** | 🟢 | Minor issue, informational | Log, continue normally |

---

## Error Categories & Recovery

### 1. Spec Compilation Errors

#### Human doesn't answer questions
```
Severity: CRITICAL
Recovery:
1. Wait 24 hours (or configured timeout)
2. Send reminder notification
3. If still no response after 48 hours:
   - Save current state to .ai/context/paused-state.md
   - Mark workflow as PAUSED
   - DO NOT proceed with assumptions
```

#### Contradictory human answers
```
Severity: HIGH
Recovery:
1. List the contradictions explicitly
2. Ask human to clarify which is correct
3. If human insists both are valid:
   - Use conflict-resolution skill
   - Document the decision
4. If unresolvable:
   - Escalate to product owner
```

#### Input too vague to compile
```
Severity: MEDIUM
Recovery:
1. Extract what IS clear
2. List specific questions needed
3. Propose assumptions for human to validate
4. DO NOT invent features
```

---

### 2. Spec Validation Errors

#### Entity mismatch between specs
```
Severity: CRITICAL
Recovery:
1. Identify which spec is "source of truth":
   - functional-spec.md for WHAT
   - architecture-plan.md for HOW
   - data-model.md for DATA
2. Update the dependent spec to match source
3. Re-run validation
4. If conflict is genuine (both valid):
   - Use conflict-resolution skill
```

#### Terminology inconsistency
```
Severity: MEDIUM
Recovery:
1. Create a glossary section in functional-spec.md
2. Choose ONE term for each concept
3. Update all specs to use consistent term
4. Add alias note if needed ("Task (also called Todo)")
```

#### Missing coverage (spec doesn't cover a scenario)
```
Severity: HIGH
Recovery:
1. Identify the gap
2. Determine which skill should have covered it
3. Re-run that skill with explicit instruction to cover gap
4. Update downstream specs if needed
```

---

### 3. Implementation Errors

#### TypeScript compilation fails
```
Severity: HIGH
Recovery:
1. Read FULL error message (not just first line)
2. Identify error type:
   - Type mismatch → Check schema types, function signatures
   - Missing import → Add import statement
   - Undefined variable → Check scope, typos
   - Null safety → Add null checks or assertions
3. Fix ONE error at a time
4. Re-run typecheck after each fix
5. If same error 3+ times:
   - Review the spec for ambiguity
   - Check if task was too large
   - Consider breaking into smaller tasks
```

#### Build fails after typecheck passes
```
Severity: HIGH  
Recovery:
1. This usually means bundler configuration issue
2. Check:
   - Import paths (relative vs absolute)
   - Asset references (images, static files)
   - Circular dependencies
3. If unclear:
   - Read bundler output carefully
   - Search for similar errors in project history
```

#### Task depends on non-existent code
```
Severity: CRITICAL
Recovery:
1. STOP current task
2. Identify the missing dependency
3. Check if it's in another task (ordering error)
4. If ordering error:
   - Reorder task-breakdown.md
   - Get human approval for new order
5. If genuinely missing:
   - Add new task to create dependency
   - Update task count
```

---

### 4. Schema Migration Errors

#### Migration would drop data
```
Severity: CRITICAL
Recovery:
1. STOP immediately
2. Check data count: SELECT COUNT(*) FROM affected_table
3. Options:
   a. Export data before migration
   b. Rename column instead of drop (preserve data)
   c. Create archive table
4. REQUIRE explicit human approval with data count
```

#### Migration syntax error
```
Severity: HIGH
Recovery:
1. Check schema.ts syntax
2. Verify column types are valid
3. Check for reserved words in column names
4. Use dreamer database --query to test
```

#### Foreign key constraint violation
```
Severity: HIGH
Recovery:
1. Identify orphaned records:
   SELECT * FROM child WHERE parent_id NOT IN (SELECT id FROM parent)
2. Options:
   a. Delete orphaned records (if safe)
   b. Create placeholder parent records
   c. Make foreign key nullable temporarily
3. Document decision in migration-plan
```

---

### 5. Human Checkpoint Errors

#### Human doesn't respond (timeout)
```
Severity: MEDIUM (non-blocking) or CRITICAL (blocking)
Recovery for NON-BLOCKING:
1. Log that checkpoint was reached
2. Continue with default/recommended option
3. Note in output: "Proceeded without explicit approval"

Recovery for BLOCKING:
1. Save state to .ai/context/checkpoint-state.md
2. Set workflow status to WAITING
3. Send notification
4. DO NOT proceed
```

#### Human response is unclear
```
Severity: MEDIUM
Recovery:
1. Restate the question with specific options
2. Provide A/B/C choices instead of open-ended
3. Ask: "Did you mean X or Y?"
4. If still unclear after 2 clarifications:
   - List assumptions being made
   - Proceed with most conservative option
```

#### Human requests change after approval
```
Severity: MEDIUM
Recovery:
1. Assess impact:
   - Which tasks are affected?
   - Is code already written?
2. If pre-implementation:
   - Update specs
   - Re-generate task breakdown
3. If post-implementation:
   - Create new tasks for changes
   - Don't revert working code without explicit request
```

---

### 6. Review/Verification Errors

#### Critical issue found in review
```
Severity: CRITICAL
Recovery:
1. Mark feature as NEEDS_CHANGES
2. Create fix tasks for each critical issue
3. Re-implement fixes
4. Re-run review
5. Repeat until no critical issues
```

#### Review finds spec violation
```
Severity: HIGH
Recovery:
1. Determine if code or spec is wrong:
   - Check original requirements
   - Ask human if needed
2. If CODE is wrong → fix code
3. If SPEC is wrong → update spec, document why
4. Never leave code-spec mismatch
```

#### Test coverage too low
```
Severity: MEDIUM
Recovery:
1. Identify uncovered code paths
2. Determine if they're testable:
   - If yes → add tests
   - If no → document why (UI, external deps)
3. Aim for 80% on business logic
```

---

### 7. Tool Execution Errors

#### read-files can't find file
```
Severity: MEDIUM
Recovery:
1. Check path spelling
2. Check if file exists: ls -la path
3. If file should exist but doesn't:
   - Check if previous task created it
   - May indicate task ordering problem
```

#### write-code permission denied
```
Severity: HIGH
Recovery:
1. Check file permissions
2. Check if file is locked by another process
3. Check if path exists (parent directories)
4. If persistent: ask human to check system
```

#### Database query fails
```
Severity: varies
Recovery:
1. Check SQL syntax
2. Check table/column names exist
3. If schema mismatch:
   - Run dreamer push to sync
   - Or check pending migrations
```

---

## Recovery Decision Tree

```
ERROR OCCURRED
    │
    ├─ Can I understand the error?
    │   ├─ NO → Log full context, ask human
    │   └─ YES ↓
    │
    ├─ Is there a standard fix?
    │   ├─ YES → Apply fix, retry
    │   └─ NO ↓
    │
    ├─ Have I tried this fix before?
    │   ├─ YES (3+ times) → STOP, escalate to human
    │   └─ NO → Try fix, increment counter
    │
    ├─ Did fix work?
    │   ├─ YES → Continue workflow
    │   └─ NO → Back to "Is there a standard fix?"
    │
    └─ After 3 failed attempts:
        → Document everything
        → Save state
        → Notify human with context
        → WAIT for guidance
```

---

## State Preservation on Error

When stopping due to error, ALWAYS save:

```markdown
# Error State: [Timestamp]

## Workflow Context
- Current agent: [name]
- Current skill: [name]
- Current task: [number/name]

## Error Details
- Error type: [classification]
- Error message: [full message]
- File/location: [if applicable]

## Recovery Attempts
1. [What was tried]
2. [What was tried]
3. [What was tried]

## State Snapshot
- Completed tasks: [list]
- Pending tasks: [list]
- Modified files: [list]

## Recommended Next Steps
1. [Human action needed]
2. [Then agent can...]

## Recovery Command
[Exact command or instruction to resume]
```

Save to: `.ai/context/error-state-[timestamp].md`

---

## Model Recommendation
**Sonnet** — Error recovery is systematic, not creative.
