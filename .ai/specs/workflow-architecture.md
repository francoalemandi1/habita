# .ai Workflow Architecture

## Overview

This document defines the complete AI-driven software development workflow, from raw human idea to production code.

The workflow is designed around a fundamental principle: **separation of concerns between models**.

- **Fast models (Sonnet)**: Transform, compile, structure
- **Thinking models (Opus)**: Analyze, design, architect
- **Fast models (Sonnet)**: Implement, execute
- **Review models (Opus/Codex)**: Validate, verify

---

## The Problem This Workflow Solves

Traditional AI-assisted development fails because:

1. **Garbage in, garbage out**: Poor prompts produce poor specs
2. **Context loss**: Each model invocation loses prior reasoning
3. **No separation of concerns**: Same model thinks AND implements
4. **No verification**: Code ships without architectural validation

This workflow introduces **formal phases with contracts** between them.

---

## Complete Workflow Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HUMAN INPUT                                  │
│                    (messy, ambiguous idea)                          │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 0: SPEC PROMPT COMPILER                          [Sonnet]    │
│  ─────────────────────────────────────────────────────────────────  │
│  Input:  Raw human idea (text, bullet points, rambling)             │
│  Output: Structured prompt for Functional Spec generation           │
│  File:   .ai/context/compiled-prompt.md                             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: FUNCTIONAL SPECIFICATION                      [Opus]      │
│  ─────────────────────────────────────────────────────────────────  │
│  Input:  compiled-prompt.md                                         │
│  Output: Complete functional spec (entities, rules, flows)          │
│  File:   .ai/specs/functional-spec.md                               │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 2: ARCHITECTURE PLAN                             [Opus]      │
│  ─────────────────────────────────────────────────────────────────  │
│  Input:  functional-spec.md + AGENTS.md                             │
│  Output: Technical architecture (layers, components, patterns)      │
│  File:   .ai/specs/architecture-plan.md                             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 3: DATA MODEL                                    [Opus]      │
│  ─────────────────────────────────────────────────────────────────  │
│  Input:  functional-spec.md + architecture-plan.md + AGENTS.md      │
│  Output: Database schema design                                     │
│  File:   .ai/specs/data-model.md                                    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 4: FEATURE DEFINITION                            [Human]     │
│  ─────────────────────────────────────────────────────────────────  │
│  Input:  Human selects which feature to implement                   │
│  Output: Feature specification                                      │
│  File:   .ai/context/feature.yaml                                   │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 5: FEATURE BREAKDOWN                             [Opus]      │
│  ─────────────────────────────────────────────────────────────────  │
│  Input:  All specs + feature.yaml                                   │
│  Output: Ordered list of implementation tasks                       │
│  File:   .ai/context/task-breakdown.md                              │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 6: IMPLEMENTATION                                [Sonnet]    │
│  ─────────────────────────────────────────────────────────────────  │
│  Input:  All specs + task-breakdown.md + STEP_NUMBER                │
│  Output: Production code for one task                               │
│  File:   src/* (actual code files)                                  │
│  Loop:   Repeat for each task in breakdown                          │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 7: REVIEW                                        [Opus]      │
│  ─────────────────────────────────────────────────────────────────  │
│  Input:  All specs + implemented code                               │
│  Output: Compliance report, issues, recommendations                 │
│  File:   .ai/reviews/review-{feature}-{date}.md                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Spec Prompt Compiler (New)

### Purpose

Translate raw, messy human input into a perfectly structured prompt that the Functional Specification model can process deterministically.

### Why This Phase Exists

Humans provide input like:
```
"an app for roommates to split chores, maybe with some gamification, 
idk exactly but basically so we dont have to argue about dishes"
```

This is:
- Ambiguous ("maybe", "idk")
- Incomplete (no user flows, no entities)
- Unstructured (stream of consciousness)

The Functional Spec model (Opus) produces dramatically different outputs based on prompt quality. By inserting a **compilation step**, we normalize input quality.

### Model Assignment

**Sonnet** — because this is a transformation task, not a reasoning task.

The compiler doesn't decide WHAT to build. It extracts, clarifies, and structures. This is pattern matching and reformatting, which fast models excel at.

### Input Contract

```yaml
Type: Raw text
Source: Human (verbal, written, bullet points, voice transcript)
Quality: Variable (may be incomplete, ambiguous, contradictory)
Format: Unstructured
```

### Output Contract

```yaml
Type: Structured prompt document
Location: .ai/context/compiled-prompt.md
Format: Markdown with required sections
Quality: Guaranteed structure, surfaced ambiguities
```

### Output Structure

The compiled prompt MUST contain:

```markdown
# Compiled Spec Prompt

## Product Vision
[One paragraph synthesizing the core idea]

## Problem Statement
[What problem this solves, extracted or inferred]

## Target Users
[Who uses this, extracted or inferred]

## Core Capabilities (MVP)
- [Capability 1]
- [Capability 2]
- [Capability 3]

## Explicitly Out of Scope
- [Feature mentioned but marked as future]
- [Feature that seems implied but shouldn't be MVP]

## Open Questions
- [Ambiguity 1 that needs human clarification]
- [Ambiguity 2 that needs human clarification]

## Assumptions Made
- [Assumption 1 made to fill gaps]
- [Assumption 2 made to fill gaps]

## Raw Input Preserved
[Original human input, verbatim, for reference]
```

### How It Prevents Quality Issues

| Problem | How Compiler Solves It |
|---------|------------------------|
| Ambiguous requirements | Surfaces as "Open Questions" for human review |
| Missing information | Fills with explicit "Assumptions Made" |
| Scope creep | Separates MVP from "Out of Scope" |
| Rambling input | Extracts into structured sections |
| Contradictions | Flags for human resolution |

### Human Checkpoint

After Phase 0, human MUST review `compiled-prompt.md` and:
1. Answer open questions
2. Validate assumptions
3. Confirm MVP scope

Only then does the workflow proceed to Phase 1.

---

## File Structure

```
.ai/
  context/
    compiled-prompt.md      # Phase 0 output (new)
    feature.yaml            # Phase 4 input
    task-breakdown.md       # Phase 5 output
  
  specs/
    functional-spec.md      # Phase 1 output
    architecture-plan.md    # Phase 2 output
    data-model.md           # Phase 3 output
    workflow-architecture.md # This document
  
  prompts/
    00_compile_prompt.md    # Phase 0 prompt (new)
    01_functional_spec.md   # Phase 1 prompt
    02_architecture_plan.md # Phase 2 prompt
    03_data_model.md        # Phase 3 prompt
    04_feature_breakdown.md # Phase 5 prompt
    05_implement_step.md    # Phase 6 prompt
    06_review.md            # Phase 7 prompt
  
  reviews/
    review-{feature}-{date}.md  # Phase 7 outputs

AGENTS.md                   # Technical constraints (immutable)
```

---

## Model Assignment Summary

| Phase | Name | Model | Rationale |
|-------|------|-------|-----------|
| 0 | Spec Prompt Compiler | Sonnet | Transform/structure task, not reasoning |
| 1 | Functional Spec | Opus | Deep product thinking required |
| 2 | Architecture Plan | Opus | System design reasoning required |
| 3 | Data Model | Opus | Schema design requires full context |
| 4 | Feature Definition | Human | Business decision |
| 5 | Feature Breakdown | Opus | Task decomposition requires judgment |
| 6 | Implementation | Sonnet | Execution, not invention |
| 7 | Review | Opus | Verification requires deep analysis |

---

## How This Improves Determinism

### Before (Without Compiler)

```
Human Input (variable quality)
        │
        ▼
Functional Spec Model
        │
        ▼
Highly variable output
(depends entirely on input quality)
```

### After (With Compiler)

```
Human Input (variable quality)
        │
        ▼
Spec Prompt Compiler ──► Normalized prompt (consistent structure)
        │
        ▼
Functional Spec Model
        │
        ▼
Consistent, high-quality output
(input quality is controlled)
```

**Key insight**: The compiler acts as a **normalizing layer**. Regardless of how the human expresses their idea, the Functional Spec model always receives the same structured format.

---

## How This Improves Scalability

1. **Reusable prompts**: The compiler prompt is the same for every project
2. **Predictable outputs**: Downstream phases can rely on consistent input format
3. **Parallel development**: Multiple humans can input ideas; compiler normalizes all
4. **Reduced iteration**: Fewer "that's not what I meant" loops
5. **Auditable trail**: Every transformation is persisted as a file

---

## Workflow Execution Commands

```bash
# Phase 0: Compile raw idea into structured prompt
Run .ai/prompts/00_compile_prompt.md with RAW_IDEA="your idea here"
# Human reviews .ai/context/compiled-prompt.md

# Phase 1: Generate functional spec
Run .ai/prompts/01_functional_spec.md

# Phase 2: Generate architecture plan
Run .ai/prompts/02_architecture_plan.md

# Phase 3: Generate data model
Run .ai/prompts/03_data_model.md

# Phase 4: Human edits .ai/context/feature.yaml

# Phase 5: Break down feature into tasks
Run .ai/prompts/04_feature_breakdown.md

# Phase 6: Implement each task
Run .ai/prompts/05_implement_step.md with STEP_NUMBER=1
Run .ai/prompts/05_implement_step.md with STEP_NUMBER=2
# ... repeat for all tasks

# Phase 7: Review implementation
Run .ai/prompts/06_review.md
```

---

## Summary

The Spec Prompt Compiler is the **quality gate** of the entire workflow.

It ensures that no matter how poorly a human expresses their idea, the downstream models receive consistent, structured, high-quality input.

This single addition transforms the workflow from "works if you prompt well" to "works regardless of how you prompt."

**Golden rule**: 
> If the Functional Spec is wrong, the Compiled Prompt was wrong.
> If the Compiled Prompt is wrong, the human didn't review it.

---

## Phase 1.5: UX Refinement (Iterative)

### Purpose

After the initial Functional Spec is created (or after initial implementation), analyze the proposed user experience critically and refine it before (or during) implementation.

### Why This Phase Exists

Initial specifications often have UX problems that only become apparent when you think deeply about the actual user experience:

- **Cold start problems**: Empty states that don't demonstrate value
- **High friction onboarding**: Too many steps before user sees benefit
- **Missed opportunities**: Places where AI/agents could reduce user effort
- **Unclear flows**: Paths that seem logical on paper but confuse real users

This phase exists to catch and fix these issues BEFORE they become entrenched in code.

### When to Trigger This Phase

1. **Proactively**: After Phase 1 (Functional Spec), before implementation
2. **Reactively**: When testing reveals UX issues
3. **Iteratively**: During implementation when better approaches become apparent

### Model Assignment

**Opus** (or human + Opus collaboration) — because this requires:
- Deep product thinking
- Understanding of user psychology
- Creative problem solving
- Judgment calls about trade-offs

### Input Contract

```yaml
Type: Existing spec + identified UX concerns
Sources: 
  - functional-spec.md
  - User feedback (if any)
  - Developer observations
  - Competitive analysis
Quality: Problem statement should be clear
Format: Natural language discussion or structured critique
```

### Output Contract

```yaml
Type: Updated specs + decision documentation
Locations:
  - .ai/specs/functional-spec.md (updated flows)
  - .ai/specs/ux-decisions.md (new decision records)
Format: Markdown
Quality: Clear rationale for each decision
```

### Process

```
1. Identify UX problem or improvement opportunity
2. Analyze root cause (why does current design fail?)
3. Propose alternatives (at least 2-3 approaches)
4. Evaluate trade-offs (pros/cons of each)
5. Make decision with rationale
6. Document in ux-decisions.md
7. Update functional-spec.md with new flow
8. Continue to implementation
```

### Decision Documentation Template

Each UX decision should be documented in `.ai/specs/ux-decisions.md` with:

```markdown
## Decision XXX: [Title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Approved | Implemented | Superseded
**Affects**: [What parts of the system]

### Problem Statement
[What's wrong with the current approach]

### Decision
[What we decided to do]

### Rationale
[Why this is the best approach]

### Alternatives Considered
[Other options and why they were rejected]

### Trade-offs
[What we're giving up with this decision]
```

### Integration with Main Workflow

```
Phase 1: Functional Spec
        │
        ▼
   ┌─────────────────────────────────────────┐
   │ Phase 1.5: UX Refinement (as needed)    │◄──┐
   │ • Identify issues                        │   │
   │ • Propose solutions                      │   │
   │ • Document decisions                     │   │
   │ • Update specs                           │   │
   └─────────────────────────────────────────┘   │
        │                                         │
        ▼                                         │
Phase 2: Architecture                            │
        │                                         │
        ▼                                         │
     ...                                          │
        │                                         │
        ▼                                         │
Phase 6: Implementation ──────────────────────────┘
        │                    (if UX issues found)
        ▼
Phase 7: Review
```

### Key Principle

**Document before implementing**. Even if you discover a UX improvement mid-implementation, pause to:
1. Update the functional spec
2. Document the decision in ux-decisions.md
3. Then implement

This ensures the specs remain the source of truth and future developers understand WHY things are built the way they are.

---

## Updated File Structure

```
.ai/
  context/
    compiled-prompt.md      # Phase 0 output
    feature.yaml            # Phase 4 input
    task-breakdown.md       # Phase 5 output
  
  specs/
    functional-spec.md      # Phase 1 output (updated by Phase 1.5)
    architecture-plan.md    # Phase 2 output
    data-model.md           # Phase 3 output
    ux-decisions.md         # Phase 1.5 output (NEW)
    workflow-architecture.md # This document
  
  prompts/
    00_compile_prompt.md
    01_functional_spec.md
    01.5_ux_review.md       # Phase 1.5 prompt (NEW)
    02_architecture_plan.md
    03_data_model.md
    04_feature_breakdown.md
    05_implement_step.md
    06_review.md
  
  reviews/
    review-{feature}-{date}.md
```

---

## Updated Model Assignment Summary

| Phase | Name | Model | Rationale |
|-------|------|-------|-----------|
| 0 | Spec Prompt Compiler | Sonnet | Transform/structure task |
| 1 | Functional Spec | Opus | Deep product thinking |
| **1.5** | **UX Refinement** | **Opus/Human** | **Product + UX judgment** |
| 2 | Architecture Plan | Opus | System design reasoning |
| 3 | Data Model | Opus | Schema design |
| 4 | Feature Definition | Human | Business decision |
| 5 | Feature Breakdown | Opus | Task decomposition |
| 6 | Implementation | Sonnet | Execution |
| 7 | Review | Opus | Verification |
