# Rule: Integration Tests

## Summary
Integration tests verify that multiple units work together correctly. They test the boundaries between components, services, and external systems.

## DO ✅

### What to Test
- Component interactions
- API endpoint behavior
- Database queries and transactions
- Service-to-service communication
- User flows across components

### Test Boundaries
- Real database (test instance)
- Real HTTP calls to test server
- Real file system (temp directories)
- Mocked external services (third-party APIs)

### Setup/Teardown
- Reset state between tests
- Use transactions for database cleanup
- Clean up temp files
- Use test fixtures for consistent data

## DON'T ❌

- Mock everything (that's a unit test)
- Test the same thing as unit tests
- Skip cleanup between tests
- Use production databases
- Depend on external services' availability

## Examples

### Good ✅
```typescript
// ✅ API endpoint integration test
describe('POST /api/users', () => {
  let app: Express;
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = createApp(db);
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.exec('DELETE FROM users');
  });

  it('creates a user and returns 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'John',
      email: 'john@example.com',
    });

    // Verify database
    const users = await db.query('SELECT * FROM users');
    expect(users).toHaveLength(1);
  });

  it('returns 400 for duplicate email', async () => {
    await db.exec("INSERT INTO users (name, email) VALUES ('Existing', 'john@example.com')");

    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Email already exists');
  });
});

// ✅ Component integration with real state
describe('TodoApp', () => {
  it('adds and displays todos', async () => {
    render(<TodoApp />);

    // Add a todo
    const input = screen.getByPlaceholderText('Add todo');
    await userEvent.type(input, 'Buy milk');
    await userEvent.click(screen.getByText('Add'));

    // Verify it appears
    expect(screen.getByText('Buy milk')).toBeInTheDocument();

    // Add another
    await userEvent.type(input, 'Walk dog');
    await userEvent.click(screen.getByText('Add'));

    // Verify both exist
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Walk dog')).toBeInTheDocument();
  });

  it('completes todo and updates count', async () => {
    render(<TodoApp initialTodos={[{ id: '1', text: 'Test', completed: false }]} />);

    expect(screen.getByText('1 item left')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByText('0 items left')).toBeInTheDocument();
  });
});

// ✅ Service integration with database
describe('OrderService', () => {
  let orderService: OrderService;
  let inventoryService: InventoryService;
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
    inventoryService = new InventoryService(db);
    orderService = new OrderService(db, inventoryService);
  });

  beforeEach(async () => {
    await db.exec('BEGIN');
  });

  afterEach(async () => {
    await db.exec('ROLLBACK'); // Clean up via transaction rollback
  });

  it('creates order and updates inventory', async () => {
    // Seed inventory
    await db.exec("INSERT INTO inventory (product_id, quantity) VALUES ('SKU-1', 10)");

    const order = await orderService.createOrder({
      items: [{ productId: 'SKU-1', quantity: 3 }],
    });

    expect(order.status).toBe('created');

    // Verify inventory was decremented
    const inventory = await inventoryService.getQuantity('SKU-1');
    expect(inventory).toBe(7);
  });

  it('rejects order when insufficient inventory', async () => {
    await db.exec("INSERT INTO inventory (product_id, quantity) VALUES ('SKU-1', 2)");

    await expect(
      orderService.createOrder({
        items: [{ productId: 'SKU-1', quantity: 5 }],
      })
    ).rejects.toThrow('Insufficient inventory');

    // Verify inventory unchanged
    const inventory = await inventoryService.getQuantity('SKU-1');
    expect(inventory).toBe(2);
  });
});
```

### Bad ❌
```typescript
// ❌ Mocking everything - this is a unit test
describe('OrderService', () => {
  it('creates order', async () => {
    const mockDb = { insert: vi.fn() };
    const mockInventory = { decrement: vi.fn() };
    const service = new OrderService(mockDb, mockInventory);

    await service.createOrder({ items: [] });

    expect(mockDb.insert).toHaveBeenCalled(); // Not testing real behavior
  });
});

// ❌ No cleanup between tests
describe('UserService', () => {
  it('creates first user', async () => {
    await userService.create({ name: 'John' });
    expect(await userService.count()).toBe(1);
  });

  it('creates second user', async () => {
    await userService.create({ name: 'Jane' });
    expect(await userService.count()).toBe(2); // Depends on previous test!
  });
});

// ❌ Depending on external service
it('fetches weather data', async () => {
  const weather = await fetch('https://api.weather.com/current');
  expect(weather.temp).toBeDefined(); // Will fail if API is down
});
```

## Integration Test Patterns

### Database Transaction Cleanup
```typescript
// Wrap each test in transaction and rollback
let db: Database;

beforeEach(async () => {
  await db.query('BEGIN');
});

afterEach(async () => {
  await db.query('ROLLBACK');
});
```

### Test Fixtures
```typescript
// fixtures/users.ts
export const testUsers = {
  admin: { id: '1', name: 'Admin', role: 'admin' },
  regular: { id: '2', name: 'User', role: 'user' },
};

// In test
beforeEach(async () => {
  await db.insert(users).values(Object.values(testUsers));
});
```

### Mocking External Services
```typescript
// Mock third-party API at HTTP level
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('https://api.stripe.com/charges', () => {
    return HttpResponse.json({ data: [] });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Unit vs Integration

| Aspect | Unit Test | Integration Test |
|--------|-----------|------------------|
| Scope | Single function/class | Multiple components |
| Dependencies | All mocked | Some real, some mocked |
| Speed | <10ms | <1000ms |
| Database | Never | Test instance |
| Network | Never | Test server or mocked |

## Why This Matters

- Catches issues that unit tests miss
- Verifies real component interactions
- Tests actual database queries
- Validates API contracts
- Builds confidence in system behavior
