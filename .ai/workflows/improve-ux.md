# Workflow: Improve UX

## Trigger
- Identifying and fixing UX issues
- Responding to user feedback
- Proactively improving user experience
- Pre-implementation UX review

## Prerequisites
- .ai/specs/functional-spec.md exists
- UX concern or improvement goal

## Agent Sequence

```
1. agent-ux
   Input: UX concern + functional-spec
   Output: Decision documentation
   
   Internal flow:
   - read-files (functional-spec, existing ux-decisions)
   - Analyze current state and concern
   - ux-analysis skill
   - Generate alternatives (min 2-3)
   - Document decision
   - write-specs (ux-decisions.md)
   - Update functional-spec if flows change

2. [HUMAN REVIEW - choose approach]

3. agent-feature (if implementation approved)
   Input: Updated specs + implementation plan
   Output: Working code changes
   
   Flow depends on scope of changes
```

## Skills Used
- ux-analysis (Opus)
- functional-analysis (Opus) — If flows need updating
- implementation-planning (Opus) — If changes need implementation
- code-implementation (Sonnet) — For actual changes

## Tools Used
- read-files — Access specs and current code
- write-specs — Update ux-decisions.md and functional-spec.md
- write-code — Implement approved changes

## How to Start

Reactive (responding to issue):
```
"Analyze the UX issue: [description of problem]
Current flow: [which flow is affected]
User impact: [what users experience]"
```

Proactive (looking for improvements):
```
"Review the [flow name] flow for UX issues.
Focus on: [friction points / cold start / complexity]"
```

With user feedback:
```
"User feedback: [quote or paraphrase]
Analyze and propose improvements."
```

## Decision Process

1. **Problem identified**
   - What's wrong?
   - Who's affected?
   - What's the impact?
   - Root cause analysis

2. **Alternatives generated** (min 2-3)
   - Different approaches
   - Varying effort levels
   - Trade-off analysis

3. **Decision documented**
   - Clear rationale for choice
   - Trade-offs acknowledged
   - Rejected alternatives explained

4. **Specs updated**
   - ux-decisions.md appended
   - functional-spec.md updated if flows change

5. **Implementation** (if approved)
   - agent-feature invoked
   - Changes verified

## UX Problem Categories

| Category | Symptoms | Common Solutions |
|----------|----------|------------------|
| Cold Start | Empty states, no guidance | Onboarding, defaults, AI suggestions |
| Friction | Too many steps, complex inputs | Simplify, automate, smart defaults |
| Confusion | Unclear paths, dead ends | Better navigation, feedback |
| Missed Opportunities | Manual work, no AI help | Automation, intelligence |

## Output

```
.ai/
  specs/
    ux-decisions.md (appended with new decision)
    functional-spec.md (updated if flows change)
  context/
    task-breakdown.md (if implementing)
```

## Decision Statuses

| Status | Meaning | Next Step |
|--------|---------|-----------|
| Proposed | Documented, awaiting review | Human reviews |
| Approved | Ready for implementation | agent-feature |
| Implemented | Changes deployed | Mark complete |
| Superseded | Replaced by newer decision | Reference new decision |

## Error Handling

### Missing Functional Spec
- Cannot analyze UX without understanding flows
- Request spec creation first
- Or infer flows from existing code (less reliable)

### Conflicting with Existing Decisions
- Document the conflict explicitly
- Explain why original decision should change
- Get explicit approval before superseding

### Implementation Constraint
- Note architectural limitations
- Adjust proposals to fit constraints
- Or escalate to agent-architecture if fundamental change needed
