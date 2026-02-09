# UX Decisions Log

This document captures significant UX/Product decisions made during development, including the rationale behind each decision.

---

## Decision 001: Intelligent Onboarding with AI-Generated Tasks

**Date**: 2026-02-05  
**Status**: Approved  
**Affects**: Onboarding flow, Task creation, User experience

### Problem Statement

The original onboarding flow had several UX issues:

1. **High initial friction**: User had to choose between "Create" or "Join" without context
2. **Cold start problem**: After creating a household, the app was empty - no tasks
3. **Manual task creation burden**: User had to think of and create each task manually
4. **No immediate value demonstration**: User doesn't see the app's value until they've done all the setup work

### Decision

Implement an "intelligent onboarding" flow where:

1. **Name first, decision later**: Ask for the user's name before asking about household creation/joining
2. **Natural language context collection**: User describes their household in their own words (text or voice)
3. **AI-powered task generation**: An agent analyzes the context and generates personalized task suggestions
4. **User review and control**: User can modify, add, or remove suggested tasks before finalizing

### Rationale

- **Show value before commitment**: User sees relevant tasks generated for their specific situation before creating anything
- **Reduce cognitive load**: User doesn't have to think about what tasks to create
- **Personalization**: AI can suggest tasks appropriate for the household type (couple vs family vs roommates)
- **Natural interaction**: Voice/text input feels conversational, not like filling a form

### Implementation Details

**New Onboarding Flow**:
```
1. Name input → 2. Household context (text/voice) → 3. AI generates tasks → 
4. User reviews/edits → 5. Household created with tasks → 6. Invite screen
```

**Server Changes**:
- New `generateSuggestedTasks` function using `sdk.callLLM`
- Modified `createHousehold` to accept initial tasks array
- New prompt template at `src/prompts/suggest-tasks.handlebars`

**Client Changes**:
- Multi-step onboarding component
- Voice recording capability (Web Audio API)
- Task selection/editing UI

### Alternatives Considered

1. **Static task templates**: Pre-defined task sets for "couple", "family", "roommates"
   - Rejected: Not personalized enough, misses context like pets, garden, etc.

2. **Form-based context collection**: Dropdowns for household type, checkboxes for features
   - Rejected: Feels bureaucratic, limits what user can express

3. **Skip suggestions entirely**: Just improve the empty state with better guidance
   - Rejected: Doesn't solve the core "what tasks should I create?" problem

### Success Metrics

- Time to first completed task (should decrease)
- Task creation rate during onboarding (should be > 3 tasks on average)
- User retention at day 7 (hypothesis: better onboarding = better retention)

---

## Decision 002: Multimodal Input (Text + Voice)

**Date**: 2026-02-05  
**Status**: Approved  
**Affects**: Onboarding flow, Accessibility

### Problem Statement

Users have different preferences for input. Some prefer typing, others find it easier to speak, especially on mobile devices.

### Decision

Support both text and voice input for the household context step:
- Text: Textarea with placeholder examples
- Voice: Microphone button that records and transcribes

### Rationale

- **Natural expression**: People often describe things better verbally
- **Accessibility**: Voice input helps users with typing difficulties
- **Mobile-first**: Speaking is often faster than typing on phones
- **Richer context**: Users tend to provide more detail when speaking

### Implementation Details

- Web Audio API for recording
- Server-side transcription (or browser Speech-to-Text API)
- Same LLM prompt receives transcribed text

### Trade-offs

- **Latency**: Voice adds transcription step before task generation
- **Complexity**: Need to handle microphone permissions, recording UI
- **Privacy**: Some users may be uncomfortable with voice recording

---

## Decision 003: Task Suggestions are Pre-selected

**Date**: 2026-02-05  
**Status**: Approved  
**Affects**: Task selection UI

### Problem Statement

When presenting AI-generated task suggestions, should they be pre-selected (opt-out) or unselected (opt-in)?

### Decision

All suggested tasks are pre-selected (checked) by default. User unchecks what they don't want.

### Rationale

- **Default to action**: If the AI suggested it, it's probably relevant
- **Easier to remove than add**: Unchecking is simpler than checking multiple items
- **Demonstrates value**: Seeing a populated list shows the app "gets" their situation
- **Psychological**: Feels like the app did work for them

### Trade-offs

- Risk of users accepting tasks they don't actually want (but they can delete later)
- Some users may feel "pushed" into accepting defaults

---

## Future Decisions to Document

- [ ] Invite mechanism: Code vs Link vs QR
- [ ] Task editing after creation
- [ ] Member removal flow
- [ ] Notification strategy
