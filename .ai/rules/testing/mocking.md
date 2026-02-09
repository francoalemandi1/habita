# Rule: Mocking

## Summary
Mocks isolate code under test by replacing dependencies. Use them strategically—over-mocking leads to false confidence.

## DO ✅

### When to Mock
- External APIs (payment, email, SMS)
- Time/Date for deterministic tests
- Random number generators
- File system (sometimes)
- Network requests in unit tests
- Expensive operations

### Mock Boundaries
- Mock at module boundaries
- Mock external services, not internal code
- Keep mocks close to real behavior
- Update mocks when real API changes

### Mock Verification
- Verify mock was called with correct args
- Verify call count when it matters
- Reset mocks between tests

## DON'T ❌

- Mock what you own (prefer real implementation)
- Mock implementation details
- Create mocks that lie (return impossible data)
- Share mock state between tests
- Mock everything

## Examples

### Good ✅
```typescript
// ✅ Mock external API
describe('PaymentService', () => {
  const mockStripe = {
    charges: {
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates charge with correct amount', async () => {
    mockStripe.charges.create.mockResolvedValue({ id: 'ch_123', status: 'succeeded' });

    const service = new PaymentService(mockStripe);
    const result = await service.charge(1000, 'tok_visa');

    expect(mockStripe.charges.create).toHaveBeenCalledWith({
      amount: 1000,
      currency: 'usd',
      source: 'tok_visa',
    });
    expect(result.success).toBe(true);
  });

  it('handles declined card', async () => {
    mockStripe.charges.create.mockRejectedValue(
      new Error('Card declined')
    );

    const service = new PaymentService(mockStripe);
    const result = await service.charge(1000, 'tok_declined');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Card declined');
  });
});

// ✅ Mock time for deterministic tests
describe('TokenService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates token with correct expiry', () => {
    const token = TokenService.create({ userId: '123' });

    expect(token.expiresAt).toEqual(new Date('2024-01-01T01:00:00Z')); // 1 hour later
  });

  it('detects expired token', () => {
    const token = TokenService.create({ userId: '123' });

    vi.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours

    expect(TokenService.isValid(token)).toBe(false);
  });
});

// ✅ Mock module with vi.mock
vi.mock('./emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

import { sendEmail } from './emailService';

describe('NotificationService', () => {
  it('sends welcome email', async () => {
    const service = new NotificationService();
    await service.welcomeUser({ email: 'test@example.com', name: 'John' });

    expect(sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      template: 'welcome',
      data: { name: 'John' },
    });
  });
});

// ✅ Spy on existing method
describe('Logger', () => {
  it('logs errors to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    Logger.error('Something went wrong');

    expect(consoleSpy).toHaveBeenCalledWith('[ERROR]', 'Something went wrong');
    consoleSpy.mockRestore();
  });
});

// ✅ Mock fetch with MSW for realistic network behavior
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users/:id', ({ params }) => {
    if (params.id === '404') {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ id: params.id, name: 'John' });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Bad ❌
```typescript
// ❌ Mocking what you own
describe('UserService', () => {
  it('creates user', async () => {
    const mockUserRepo = { save: vi.fn() };
    const service = new UserService(mockUserRepo);

    await service.createUser({ name: 'John' });

    expect(mockUserRepo.save).toHaveBeenCalled();
    // This tests nothing! Just verifies wiring.
  });
});

// ❌ Mock that lies
const mockApi = {
  getUser: vi.fn().mockResolvedValue({
    id: 'user',
    impossibleField: true, // Real API never returns this
    createdAt: 'not-a-date', // Wrong type
  }),
};

// ❌ Shared mock state
const mockDb = { users: [] }; // Shared across tests!

it('test 1', () => {
  mockDb.users.push({ id: 1 }); // Pollutes other tests
});

it('test 2', () => {
  expect(mockDb.users).toHaveLength(0); // Fails!
});

// ❌ Over-mocking
describe('Calculator', () => {
  it('adds numbers', () => {
    const mockAdd = vi.fn().mockReturnValue(5);
    expect(mockAdd(2, 3)).toBe(5); // Testing the mock, not Calculator!
  });
});

// ❌ Mocking implementation details
describe('UserList', () => {
  it('renders users', () => {
    const setStateSpy = vi.spyOn(React, 'useState');
    render(<UserList />);
    expect(setStateSpy).toHaveBeenCalled(); // Too coupled
  });
});
```

## Mocking Patterns

### Partial Mocks
```typescript
// Only mock specific methods
const service = new RealService();
vi.spyOn(service, 'expensiveMethod').mockResolvedValue(cachedResult);
// Other methods remain real
```

### Mock Factories
```typescript
// Create consistent mocks
function createMockUser(overrides = {}): User {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

it('displays user name', () => {
  const user = createMockUser({ name: 'John' });
  render(<UserCard user={user} />);
  expect(screen.getByText('John')).toBeInTheDocument();
});
```

### Conditional Mocks
```typescript
mockApi.getUser
  .mockResolvedValueOnce({ id: '1', name: 'First' }) // First call
  .mockResolvedValueOnce({ id: '2', name: 'Second' }) // Second call
  .mockRejectedValueOnce(new Error('Not found')); // Third call
```

## Mock vs Stub vs Spy

| Type | Purpose | Example |
|------|---------|---------|
| **Mock** | Replace with fake implementation | `vi.fn().mockReturnValue(42)` |
| **Stub** | Provide canned answers | `{ getUser: () => testUser }` |
| **Spy** | Observe calls to real method | `vi.spyOn(service, 'method')` |

## Why This Matters

- Proper isolation enables fast, reliable tests
- Over-mocking gives false confidence
- Under-mocking causes flaky tests
- Good mocks mirror real behavior
- Tests should validate behavior, not implementation
