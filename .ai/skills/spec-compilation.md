# Skill: Spec Compilation

## Purpose
Transform raw, unstructured human ideas into well-structured specification prompts that downstream reasoning agents can process deterministically.

## When to Use
- Starting a new project from a vague idea
- When human input is ambiguous, incomplete, or contradictory
- Before any functional specification work begins
- When normalizing input quality is critical

## Input
```yaml
type: Raw text
format: Unstructured (verbal, written, bullet points, voice transcript)
quality: Variable (may be incomplete, ambiguous, contradictory)
```

## Output
```yaml
type: Structured prompt document
format: Markdown with required sections
location: .ai/context/compiled-prompt.md
```

## Output Structure

```markdown
# Compiled Spec Prompt

## Product Vision
[One clear paragraph describing what this product is]

## Problem Statement
[What real-world problem does this solve? Why does it matter?]

## Target Users
[Who will use this? In what context?]

## Core Capabilities (MVP)
- [Capability 1 - extracted from input]
- [Capability 2 - extracted from input]
- [Capability 3 - extracted from input]

## Explicitly Out of Scope (Future)
- [Feature mentioned but not MVP]
- [Feature implied but should wait]

## Open Questions
[Questions that need human clarification before proceeding]
- [Question 1]
- [Question 2]

## Assumptions Made
[Gaps filled with reasonable assumptions]
- [Assumption 1]
- [Assumption 2]

## Raw Input (Preserved)
[The exact original input, verbatim]
```

## Reasoning Instructions

You are a prompt compiler. Your job is to TRANSFORM, not to CREATE.

### DO:
- Extract the core product vision from noise
- Identify the problem being solved (explicit or implied)
- List target users (explicit or implied)
- Separate MVP features from future/nice-to-have
- Surface ambiguities as explicit open questions
- Document assumptions made to fill gaps
- Preserve the original input verbatim

### DO NOT:
- Invent features not mentioned or clearly implied
- Make product decisions
- Add scope beyond what was described
- Guess when you can ask
- Reinterpret what the human meant

## Quality Rules

1. **Never invent features** not mentioned or clearly implied
2. **Always surface ambiguity** rather than guessing
3. **Be conservative with MVP** — when in doubt, mark as future
4. **Preserve intent** — don't reinterpret what the human meant
5. **Flag contradictions** — if the input contradicts itself, ask

## Post-Execution

Human MUST review the compiled prompt and:
1. Answer open questions
2. Validate assumptions
3. Confirm MVP scope

Only then should downstream agents proceed.

## Model Recommendation
**Sonnet** — This is a transformation task, not a reasoning task.
