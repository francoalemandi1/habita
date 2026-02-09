# Rule: Unit Tests

## Summary
Unit tests verify isolated pieces of logic. They should be fast, deterministic, and focused on a single unit of behavior.

## DO ✅

### Test Structure
- One assertion concept per test (can have multiple asserts for same concept)
- Use descriptive test names that explain the scenario
- Follow Arrange-Act-Assert (AAA) pattern
- Group related tests with describe blocks

### What to Test
- Pure functions
- Business logic
- Utility functions
- State reducers
- Custom hooks (with renderHook)
- Edge cases and boundaries

### Isolation
- Mock external dependencies
- No network calls
- No database access
- No file system access
- Tests can run in any order

## DON'T ❌

- Test implementation details
- Test framework/library code
- Have tests depend on each other
- Use random data without seeding
- Write slow tests (>100ms)
- Test trivial code (getters, simple mappings)

## Examples

### Good ✅
```typescript
// ✅ Clear name, single concept, AAA pattern
describe('calculateTotal', () => {
  it('sums item prices with quantity', () => {
    // Arrange
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 },
    ];

    // Act
    const total = calculateTotal(items);

    // Assert
    expect(total).toBe(35);
  });

  it('returns 0 for empty cart', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('applies discount when total exceeds threshold', () => {
    const items = [{ price: 100, quantity: 2 }];
    const total = calculateTotal(items, { discountThreshold: 150 });
    expect(total).toBe(180); // 200 - 10% discount
  });
});

// ✅ Testing edge cases
describe('parseDate', () => {
  it('parses ISO format', () => {
    expect(parseDate('2024-01-15')).toEqual(new Date(2024, 0, 15));
  });

  it('returns null for invalid date', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });

  it('handles empty string', () => {
    expect(parseDate('')).toBeNull();
  });

  it('handles leap year', () => {
    expect(parseDate('2024-02-29')).toEqual(new Date(2024, 1, 29));
  });
});

// ✅ Testing reducer
describe('todosReducer', () => {
  const initialState = { items: [], filter: 'all' };

  it('adds a todo', () => {
    const action = { type: 'ADD', payload: { text: 'Test' } };
    const state = todosReducer(initialState, action);

    expect(state.items).toHaveLength(1);
    expect(state.items[0].text).toBe('Test');
  });

  it('toggles todo completion', () => {
    const state = { items: [{ id: '1', text: 'Test', completed: false }], filter: 'all' };
    const action = { type: 'TOGGLE', payload: '1' };

    const newState = todosReducer(state, action);

    expect(newState.items[0].completed).toBe(true);
  });
});

// ✅ Mocking dependencies
describe('UserService', () => {
  const mockApi = {
    fetchUser: vi.fn(),
    updateUser: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and transforms user data', async () => {
    mockApi.fetchUser.mockResolvedValue({ id: 1, name: 'John' });

    const service = new UserService(mockApi);
    const user = await service.getUser(1);

    expect(mockApi.fetchUser).toHaveBeenCalledWith(1);
    expect(user).toEqual({ id: 1, name: 'John', displayName: 'John' });
  });
});
```

### Bad ❌
```typescript
// ❌ Testing implementation details
it('calls setState with correct value', () => {
  const setStateSpy = vi.spyOn(React, 'useState');
  render(<Counter />);
  fireEvent.click(screen.getByText('Increment'));
  expect(setStateSpy).toHaveBeenCalledWith(1); // Too coupled to implementation
});

// ❌ Vague test name
it('works correctly', () => {
  expect(process(data)).toBeTruthy();
});

// ❌ Multiple unrelated assertions
it('handles user operations', () => {
  expect(createUser({ name: 'John' })).toBeDefined();
  expect(updateUser(1, { name: 'Jane' })).toBeTruthy();
  expect(deleteUser(1)).toBe(true);
  expect(listUsers()).toHaveLength(0);
});

// ❌ Tests depend on each other
let userId: number;
it('creates user', () => {
  userId = createUser({ name: 'Test' }).id; // Sets state for next test
});
it('updates user', () => {
  updateUser(userId, { name: 'Updated' }); // Depends on previous test!
});

// ❌ Non-deterministic
it('generates unique id', () => {
  const id = generateId();
  expect(id).toBeTruthy(); // Will always pass but proves nothing
});

// ❌ Testing trivial code
it('returns the name', () => {
  const user = { name: 'John' };
  expect(user.name).toBe('John'); // Pointless
});
```

## Test Patterns

### Testing Async Code
```typescript
// ✅ Async/await
it('fetches data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// ✅ Testing rejected promises
it('handles fetch error', async () => {
  mockFetch.mockRejectedValue(new Error('Network error'));
  await expect(fetchData()).rejects.toThrow('Network error');
});
```

### Testing Errors
```typescript
// ✅ Testing thrown errors
it('throws on invalid input', () => {
  expect(() => validateEmail('')).toThrow('Email required');
  expect(() => validateEmail('invalid')).toThrow('Invalid email format');
});
```

### Parameterized Tests
```typescript
// ✅ Test multiple cases efficiently
it.each([
  ['valid@email.com', true],
  ['invalid', false],
  ['@missing.local', false],
  ['test@domain.co', true],
])('validates email %s as %s', (email, expected) => {
  expect(isValidEmail(email)).toBe(expected);
});
```

## Why This Matters

- Fast feedback during development
- Catches regressions early
- Documents expected behavior
- Enables confident refactoring
- Isolated tests are reliable and maintainable
