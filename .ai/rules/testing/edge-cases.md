# Rule: Edge Cases to Test

## Summary
Comprehensive list of edge cases to consider during implementation and testing.

## Data Edge Cases

### Empty & Null
- [ ] Empty arrays: `[]`
- [ ] Empty strings: `""`
- [ ] Null values: `null`
- [ ] Undefined: `undefined`
- [ ] Empty objects: `{}`
- [ ] Zero: `0`
- [ ] False vs null vs undefined

### Boundaries
- [ ] Minimum values (0, 1, MIN_INT)
- [ ] Maximum values (MAX_INT, MAX_SAFE_INTEGER)
- [ ] Just below boundary
- [ ] Just above boundary
- [ ] Exact boundary

### Strings
- [ ] Empty string
- [ ] Single character
- [ ] Very long strings (>1000 chars)
- [ ] Unicode characters (emoji, CJK)
- [ ] Special characters (`<>&"'`)
- [ ] Whitespace only
- [ ] Leading/trailing whitespace
- [ ] Newlines and tabs
- [ ] HTML/script injection attempts

### Numbers
- [ ] Zero
- [ ] Negative numbers
- [ ] Decimals (floating point precision)
- [ ] Very large numbers
- [ ] NaN
- [ ] Infinity

### Collections
- [ ] Empty collection
- [ ] Single item
- [ ] Many items (performance)
- [ ] Duplicate items
- [ ] Items in wrong order

## Time & Date Edge Cases

### Dates
- [ ] Today
- [ ] Yesterday/tomorrow
- [ ] Far past (1900-01-01)
- [ ] Far future (2100-12-31)
- [ ] Leap years (Feb 29)
- [ ] End of month (Jan 31, Feb 28/29)
- [ ] End of year (Dec 31)
- [ ] Start of year (Jan 1)
- [ ] Invalid dates (Feb 30, etc.)

### Timezones
- [ ] UTC conversion
- [ ] Daylight saving transitions
- [ ] User timezone different from server
- [ ] Date that's different day in different timezone
- [ ] Midnight boundary

### Time-based Logic
- [ ] Just before deadline
- [ ] Exactly at deadline
- [ ] Just after deadline
- [ ] Tasks spanning midnight
- [ ] Tasks spanning timezone change

## User Interaction Edge Cases

### First-Time User
- [ ] No data exists yet
- [ ] No household
- [ ] No members
- [ ] No tasks
- [ ] Onboarding not complete

### Returning User
- [ ] Stale cached data
- [ ] Data changed by another user
- [ ] Session expired
- [ ] Concurrent edits

### Multi-User
- [ ] Same household, different users
- [ ] User removed from household
- [ ] User added to household
- [ ] Concurrent modifications
- [ ] Race conditions

## Concurrent Operations

### Race Conditions
- [ ] Double-click submit
- [ ] Same task assigned by two users
- [ ] Edit while another user deletes
- [ ] Optimistic update conflicts

### Order of Operations
- [ ] Parent deleted while creating child
- [ ] Reference deleted while in use
- [ ] Cascade delete effects

## Error Conditions

### Network
- [ ] Request timeout
- [ ] Server error (500)
- [ ] Not found (404)
- [ ] Unauthorized (401)
- [ ] Rate limited (429)
- [ ] No internet connection
- [ ] Slow connection

### Validation
- [ ] Required field missing
- [ ] Field too long
- [ ] Invalid format
- [ ] Constraint violation
- [ ] Foreign key missing

### State
- [ ] Invalid state transition
- [ ] Already completed task
- [ ] Already deleted item
- [ ] Stale data

## Application-Specific Examples

### Task Management
```typescript
// Edge cases for task assignment
describe('assignTask', () => {
  it('handles household with no members', async () => {
    // Should fail gracefully, not crash
  });
  
  it('handles all members inactive', async () => {
    // Should not assign to inactive member
  });
  
  it('handles single member household', async () => {
    // Should always assign to that member
  });
  
  it('handles concurrent assignment', async () => {
    // Two users assign same task simultaneously
  });
  
  it('handles assignment when member just deleted', async () => {
    // Member deleted between load and assign
  });
});

// Edge cases for fairness calculation
describe('calculateFairness', () => {
  it('handles member with zero tasks', async () => {
    // New member, no history
  });
  
  it('handles all tasks have zero weight', async () => {
    // Avoid division by zero
  });
  
  it('handles tasks spanning year boundary', async () => {
    // Task assigned Dec 31, completed Jan 1
  });
});
```

## Why This Matters

Edge cases are where bugs hide. Most bugs occur at:
- Boundaries (off-by-one)
- Empty states (null pointers)
- Concurrent access (race conditions)
- Time boundaries (timezone, DST)

Testing edge cases prevents production incidents.
