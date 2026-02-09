# AI Engineering System

A modular, scalable AI-driven software development system built on three abstractions:

- **Skills** → Reusable knowledge and reasoning patterns
- **Agents** → Decision makers that orchestrate skills and tools
- **Tools** → Executable actions over the codebase

## Directory Structure

```
.ai/
├── README.md              # This file
├── skills/                # Reusable reasoning patterns
│   ├── spec-compilation.md
│   ├── functional-analysis.md
│   ├── system-architecture-design.md
│   ├── data-model-design.md
│   ├── implementation-planning.md
│   ├── code-implementation.md
│   ├── review.md                    # Unified: impl/PR/audit reviews
│   ├── validate-specs.md            # Cross-spec consistency checking
│   ├── schema-migration.md          # Safe database migrations
│   ├── verification.md              # Comprehensive build verification
│   ├── ux-analysis.md
│   ├── error-recovery-playbook.md   # Consolidated error handling
│   ├── checkpoint-protocol.md       # Human checkpoint definitions
│   └── conflict-resolution.md       # Trade-off decision framework
├── agents/                # Orchestration decision makers
│   ├── agent-architecture.md
│   ├── agent-feature.md
│   ├── agent-review.md
│   └── agent-ux.md
├── tools/                 # Executable codebase actions
│   ├── read-files.md           # Unified: specs/code/schema/config
│   ├── write-code.md
│   ├── write-specs.md
│   ├── run-verification.md
│   ├── scan-pr-changes.md
│   ├── analyze-codebase.md     # Pattern extraction
│   └── validate-schema.md      # Schema change validation
├── workflows/             # Situation → Agent mappings
│   ├── new-project.md
│   ├── new-feature.md
│   ├── review-pr.md
│   ├── improve-ux.md
│   └── hotfix.md               # Emergency bug fixes
├── templates/             # Input templates for developers
│   ├── new-project-template.md
│   ├── feature-request-template.md
│   ├── ux-improvement-template.md
│   ├── pr-review-template.md
│   └── spec-checklist.md       # Validation checklist
├── specs/                 # Generated specification documents
│   ├── functional-spec.md
│   ├── architecture-plan.md
│   ├── data-model.md
│   ├── ux-decisions.md
│   └── decisions/              # Conflict resolution records
├── context/               # Working context files
│   ├── compiled-prompt.md
│   ├── task-breakdown.md
│   ├── migration-plan-*.md
│   ├── checkpoint-*.md
│   └── error-state-*.md
└── reviews/               # Review outputs
    ├── review-*.md
    ├── spec-validation-*.md
    ├── audit-*.md
    └── postmortem-*.md
```

---

## Core Concepts

### Skills
Skills are **reusable reasoning patterns** that know HOW to think about specific problems. They:
- Describe WHEN to use them
- Define expected INPUT and OUTPUT
- Contain the reasoning instructions
- Specify which model to use

**Skills think, they don't act.**

### Agents
Agents are **decision makers** that orchestrate skills and tools. They:
- Decide WHICH skills to invoke
- Decide WHICH tools to use
- Define the ORDER of operations
- Handle **error recovery**
- Define **human checkpoints**

**Agents decide, skills think, tools act.**

### Tools
Tools are **executable actions** over the codebase. They:
- Describe what ACTION they perform
- Define HOW to execute
- Don't make decisions

**Tools act, they don't think.**

---

## Quick Start

### Starting a New Project

1. Fill `.ai/templates/new-project-template.md`
2. Say: **"Use agent-architecture to design this system"**
3. **🛑 BLOCKING**: Review and answer questions in compiled prompt
4. Let the agent complete all specifications
5. **🛑 BLOCKING if conflicts**: Review spec validation results
6. Implement features with agent-feature

### Implementing a Feature

1. Fill `.ai/templates/feature-request-template.md`
2. Say: **"Use agent-feature to implement this"**
3. **⚠️ APPROVAL**: Review task breakdown
4. If schema changes needed, review migration plan
5. Let the agent implement task by task
6. Request agent-review when done

### Fixing a Critical Bug

1. Say: **"Hotfix: [description of bug]"**
2. Agent will diagnose, fix, verify
3. **⚠️ APPROVAL**: Quick review of minimal fix
4. Deploy immediately
5. Create post-mortem within 24 hours

### Reviewing a PR

1. Say: **"Use agent-review to review PR #123"**
2. Review feedback
3. Address critical issues
4. Iterate until approved

---

## Workflow Quick Reference

| Situation | Workflow | Primary Agent |
|-----------|----------|---------------|
| New project from idea | new-project | agent-architecture |
| Add feature to existing project | new-feature | agent-feature |
| Review pull request | review-pr | agent-review |
| Fix UX issues | improve-ux | agent-ux |
| Critical bug in production | hotfix | (direct) |

---

## Skills Quick Reference

### Design Skills (Opus)
| Skill | Purpose |
|-------|---------|
| spec-compilation | Raw idea → Structured prompt |
| functional-analysis | Prompt → Functional spec |
| system-architecture-design | Spec → Architecture plan |
| data-model-design | Architecture → Data model |
| ux-analysis | Flows → UX decisions |

### Implementation Skills (Sonnet)
| Skill | Purpose |
|-------|---------|
| code-implementation | Task → Working code |
| verification | Code → Verification report |

### Quality Skills (Opus)
| Skill | Purpose |
|-------|---------|
| validate-specs | Cross-validate all specs |
| review | Code → Review report (impl/PR/audit) |
| implementation-planning | Feature → Task breakdown |
| schema-migration | Schema changes → Migration plan |

### Meta Skills
| Skill | Purpose | Model |
|-------|---------|-------|
| error-recovery-playbook | Consolidated error handling | Sonnet |
| checkpoint-protocol | Human checkpoint definitions | Sonnet |
| conflict-resolution | Trade-off decision framework | Opus |

---

## Tools Quick Reference

| Tool | Purpose |
|------|---------|
| read-files | Read any file: specs, code, schema, config |
| write-code | Create/modify source code files |
| write-specs | Create/update specification documents |
| run-verification | Execute typecheck, build, tests |
| scan-pr-changes | Analyze PR diffs |
| analyze-codebase | Extract patterns from existing code |
| validate-schema | Check schema changes before applying |

---

## Error Severity Levels

Use these consistently everywhere:

| Level | Symbol | Meaning | Action |
|-------|--------|---------|--------|
| **CRITICAL** | 🔴 | Cannot proceed | STOP, document, notify human |
| **HIGH** | 🟠 | Should not proceed | Attempt 1 fix, then notify |
| **MEDIUM** | 🟡 | Proceed with caution | Log warning, continue |
| **LOW** | 🟢 | Minor/informational | Log, continue normally |

---

## Checkpoint Types

| Type | Symbol | Behavior |
|------|--------|----------|
| 🛑 **BLOCKING** | Must stop | Wait indefinitely for human |
| ⚠️ **APPROVAL** | Should stop | Wait for timeout, then proceed |
| ℹ️ **NOTIFICATION** | Inform only | Continue immediately |

See `checkpoint-protocol.md` for full details.

---

## Human Checkpoints

| Checkpoint | Type | Timeout | Default |
|------------|------|---------|---------|
| After spec-compilation | 🛑 BLOCKING | None | WAIT |
| After functional-spec | ⚠️ APPROVAL | 4h | Proceed |
| After architecture-plan | ⚠️ APPROVAL | 4h | Proceed |
| After validate-specs (conflicts) | 🛑 BLOCKING | None | WAIT |
| After task-breakdown | ⚠️ APPROVAL | 2h | Proceed |
| After schema-migration (HIGH risk) | 🛑 BLOCKING | None | WAIT |
| After agent-review (critical) | 🛑 BLOCKING | None | WAIT |

---

## Specifications

The `.ai/specs/` directory contains the source of truth documents:

| Document | Purpose | Created By |
|----------|---------|------------|
| functional-spec.md | WHAT the system does | functional-analysis |
| architecture-plan.md | HOW the system is built | system-architecture-design |
| data-model.md | Database schema | data-model-design |
| ux-decisions.md | UX decision log | ux-analysis |
| decisions/*.md | Conflict resolution records | conflict-resolution |

These specs are **immutable sources of truth**. Code must match specs. If specs are wrong, update them first.

---

## Key Principles

1. **Separation of concerns**: Skills think, Agents decide, Tools act
2. **Specs before code**: Always have specifications before implementing
3. **Validate specs**: Check consistency across all spec documents
4. **Small tasks**: Break work into 1-2 file changes
5. **Verify continuously**: Check after every change
6. **Safe migrations**: Never drop data without explicit approval
7. **Document decisions**: UX, architecture, and conflict decisions are logged
8. **Human checkpoints**: BLOCKING checkpoints require explicit approval
9. **Error recovery**: Every agent knows how to handle failures
10. **Consistent severity**: Use CRITICAL/HIGH/MEDIUM/LOW everywhere

---

## Templates

| Template | Use For |
|----------|---------|
| new-project-template.md | Starting from raw idea |
| feature-request-template.md | Adding a feature |
| ux-improvement-template.md | Improving user experience |
| pr-review-template.md | Reviewing a PR |
| spec-checklist.md | Validating spec quality |

---

## Archive

Old prompt files are preserved in `.ai/archive/prompts/` for reference.

---

## Rules (Best Practices)

The `rules/` directory contains **passive knowledge** that agents apply during execution. Unlike skills (which are processes), rules are **constraints and patterns** to follow.

### Rule Categories

| Category | Contents |
|----------|----------|
| `rules/code/` | naming, functions, error-handling, comments, anti-patterns |
| `rules/typescript/` | types, strict-mode, imports |
| `rules/react/` | components, hooks-useeffect, hooks-state, hooks-memoization, hooks-custom, state, patterns-imports |
| `rules/database/` | schema-design, queries |
| `rules/testing/` | unit-tests, integration, mocking, edge-cases, edge-datetime, edge-validation, edge-concurrency |
| `rules/security/` | data-isolation, input-validation |
| `rules/performance/` | bundle-size, lazy-loading, queries |

### When Rules Are Applied

- **During code-implementation**: Check relevant rules before writing code
- **During review**: Validate code against applicable rules
- **During planning**: Consider rules when designing tasks

See `rules/README.md` for full documentation.
