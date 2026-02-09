# Workflow: Hotfix

## Trigger
- Critical bug in production needs immediate fix
- Security vulnerability discovered
- Data corruption risk
- Feature completely broken (not degraded)

## Prerequisites
- Clear description of the bug/issue
- Ability to reproduce (ideally)
- Access to affected code

## Philosophy
Hotfixes bypass normal spec workflows for speed. They trade thoroughness for urgency. Use sparingly.

## When to Use Hotfix vs Normal Workflow

| Situation | Use Hotfix? | Reason |
|-----------|-------------|--------|
| Production down | ✅ YES | Business impact |
| Security vulnerability | ✅ YES | Risk exposure |
| Data loss occurring | ✅ YES | Irreversible damage |
| Feature not working at all | ✅ YES | User blocked |
| Feature degraded but usable | ❌ NO | Can wait for normal workflow |
| UI looks wrong | ❌ NO | Not urgent |
| Performance slow | ❌ NO | Unless catastrophic |
| New feature request | ❌ NO | Never |

## Agent Sequence

```
1. Triage
   - Confirm this is truly urgent
   - IF not urgent → redirect to new-feature workflow
   - Document why hotfix is warranted

2. Diagnose
   - Use tool: read-files (affected code)
   - Identify root cause
   - Document findings

3. Fix
   - Minimal change to fix the issue
   - NO refactoring
   - NO "while we're here" improvements
   - Use skill: code-implementation (minimal mode)

4. Verify
   - Use tool: run-verification (typecheck + build)
   - Test the specific fix manually if possible
   - Confirm bug is resolved

5. Deploy
   - Push immediately
   - Monitor for issues

6. Document (AFTER fix is live)
   - Create post-mortem
   - Add to backlog: proper fix if hotfix was hacky
   - Update specs if they were wrong
```

## Skills Used
- code-implementation (Sonnet) — Minimal mode
- verification (Sonnet) — Quick check only

## Tools Used
- read-files — Diagnose the issue
- write-code — Apply fix
- run-verification — Confirm fix works

## Hotfix Rules

### DO:
- Fix the immediate problem only
- Keep changes as small as possible
- Test that specific bug is fixed
- Deploy quickly once verified
- Document what was done

### DO NOT:
- Refactor surrounding code
- Add new features
- Update specs first (do it after)
- Over-engineer the solution
- Skip verification entirely
- Make multiple unrelated changes

## Size Limits

A hotfix should:
- Touch ≤ 3 files
- Change ≤ 50 lines of code
- Take ≤ 2 hours total

If larger → this is not a hotfix, use normal workflow with priority flag.

## Checkpoints

| After | Type | Notes |
|-------|------|-------|
| Triage | ℹ️ NOTIFICATION | Inform human of hotfix start |
| Diagnosis | ℹ️ NOTIFICATION | Share root cause |
| Fix ready | ⚠️ APPROVAL | Quick review of minimal fix |
| Deployed | ℹ️ NOTIFICATION | Confirm live |

## Post-Hotfix Requirements

Within 24 hours of hotfix:

1. **Create post-mortem document**
   ```markdown
   # Post-Mortem: [Issue Title]
   
   **Date**: YYYY-MM-DD
   **Severity**: CRITICAL | HIGH
   **Time to Fix**: [duration]
   
   ## What Happened
   [Description of the bug]
   
   ## Root Cause
   [Why it happened]
   
   ## Fix Applied
   [What was changed]
   
   ## Why It Wasn't Caught
   [Gap in testing/review/specs]
   
   ## Prevention
   [What to do to prevent similar issues]
   
   ## Follow-up Tasks
   - [ ] [Task if hotfix was hacky]
   - [ ] [Tests to add]
   - [ ] [Specs to update]
   ```
   
   Save to: `.ai/reviews/postmortem-[date]-[title].md`

2. **Update specs if needed**
   - If bug revealed spec was wrong
   - If new edge case discovered

3. **Add proper fix to backlog**
   - If hotfix was a bandaid
   - If refactoring would help

## Error Handling

### Can't reproduce the bug
```
1. Gather all available information
2. Check logs, error messages, user reports
3. Make best-effort fix based on symptoms
4. Add extra logging to catch if it recurs
5. Document uncertainty in post-mortem
```

### Fix breaks something else
```
1. REVERT the fix immediately
2. Re-diagnose with broader scope
3. Find fix that doesn't break other things
4. If can't find safe fix:
   - Document the trade-off
   - Get human approval for which breakage is acceptable
```

### Fix is too large
```
1. STOP - this isn't a hotfix
2. Document the scope
3. Switch to expedited new-feature workflow:
   - Skip spec-compilation (use bug report as input)
   - Do quick functional-analysis
   - Proceed with implementation
```

## Output

```
.ai/
  reviews/
    postmortem-[date]-[title].md
  context/
    hotfix-log.md (append)
```

## Hotfix Log Format

Append to `.ai/context/hotfix-log.md`:

```markdown
---
## Hotfix: [Title]
**Date**: YYYY-MM-DD HH:MM
**Issue**: [Brief description]
**Root Cause**: [One line]
**Fix**: [Files changed]
**Verified**: ✅
**Post-mortem**: [link]
---
```
