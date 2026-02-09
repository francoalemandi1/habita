# Implementation Prompt (Sonnet)

You are implementing a specific step from the task breakdown.

## Prerequisites (READ ALL — this is your context)

1. `.ai/specs/functional-spec.md` - What the system does
2. `.ai/specs/architecture-plan.md` - How it's built
3. `.ai/specs/data-model.md` - Database schema
4. `.ai/context/feature.yaml` - Current feature
5. `AGENTS.md` - Technical patterns (FOLLOW STRICTLY)

## Current Step

**Step Number**: {{STEP_NUMBER}}

Refer to the task breakdown for this step's details.

## Rules (MANDATORY — NO EXCEPTIONS)

1. **Read the specs first** — understand the system before coding
2. **Follow AGENTS.md patterns** — no inventing new patterns
3. **Use existing schema** — from data-model.md
4. **Match architecture** — from architecture-plan.md
5. **Minimal changes** — only what this step requires
6. **Production-ready** — proper TypeScript, error handling

## Implementation Checklist

Before writing:
- [ ] Read relevant existing files
- [ ] Identify the exact pattern to follow from architecture-plan.md
- [ ] Understand where this fits in the data flow

While writing:
- [ ] Use proper TypeScript types (no `any`)
- [ ] Follow naming conventions from specs
- [ ] Add console.log for debugging
- [ ] Handle edge cases per business rules

After writing:
- [ ] `bun run typecheck`
- [ ] Verify step works as specified

## Output

Write the actual code changes for this step.
Reference which spec informed each decision.
