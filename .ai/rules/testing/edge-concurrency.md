# Rule: Concurrency Edge Cases

## Summary
Concurrent operations cause race conditions, data corruption, and inconsistent states. Test these scenarios explicitly.

## Critical Edge Cases

### Race Conditions
- Simultaneous reads and writes
- Multiple users editing same resource
- Stale data updates
- Double submission

### Async Operations
- Request order vs response order
- Cancelled requests
- Timeout handling
- Retry logic

### State Consistency
- Optimistic updates with failures
- Partial failures in transactions
- Cache invalidation timing
- Event ordering

## Examples

### Good Test Cases ✅
```typescript
describe('Race Conditions', () => {
  describe('double submit prevention', () => {
    it('prevents duplicate form submissions', async () => {
      const mockSubmit = vi.fn().mockResolvedValue({ id: 1 });
      render(<SubmitForm onSubmit={mockSubmit} />);

      const button = screen.getByRole('button', { name: 'Submit' });

      // Rapid double click
      await userEvent.click(button);
      await userEvent.click(button);

      // Wait for submission
      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1); // Only once!
      });
    });

    it('disables button during submission', async () => {
      const slowSubmit = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<SubmitForm onSubmit={slowSubmit} />);
      const button = screen.getByRole('button');

      await userEvent.click(button);
      expect(button).toBeDisabled();

      await waitFor(() => expect(button).toBeEnabled());
    });
  });

  describe('concurrent edits', () => {
    it('detects stale data on update', async () => {
      // User A loads version 1
      const userA = await fetchResource(1);
      expect(userA.version).toBe(1);

      // User B loads and updates (version becomes 2)
      const userB = await fetchResource(1);
      await updateResource(1, { ...userB, title: 'B edit' });

      // User A tries to update with stale version
      await expect(
        updateResource(1, { ...userA, title: 'A edit' })
      ).rejects.toThrow('Conflict: resource was modified');
    });

    it('supports optimistic locking', async () => {
      const resource = await fetchResource(1);

      const result = await updateResource(1, {
        ...resource,
        title: 'Updated',
        expectedVersion: resource.version,
      });

      expect(result.version).toBe(resource.version + 1);
    });
  });
});

describe('Async Operation Ordering', () => {
  describe('request/response ordering', () => {
    it('uses latest response when requests complete out of order', async () => {
      let resolvers: ((value: string) => void)[] = [];

      const mockSearch = vi.fn().mockImplementation(
        (query) => new Promise(resolve => {
          resolvers.push((v) => resolve({ query, results: v }));
        })
      );

      const { result } = renderHook(() => useSearch(mockSearch));

      // Fire two searches
      act(() => result.current.search('a'));
      act(() => result.current.search('ab'));

      // Resolve in reverse order (second request finishes first)
      act(() => resolvers[1]?.('results for ab'));
      act(() => resolvers[0]?.('results for a'));

      // Should show 'ab' results, not 'a'
      await waitFor(() => {
        expect(result.current.results).toBe('results for ab');
      });
    });

    it('cancels pending request when new one starts', async () => {
      const abortSpy = vi.fn();

      const mockFetch = vi.fn().mockImplementation((url, { signal }) => {
        signal.addEventListener('abort', abortSpy);
        return new Promise(() => {}); // Never resolves
      });

      const { result } = renderHook(() => useFetch(mockFetch));

      act(() => result.current.fetch('/first'));
      act(() => result.current.fetch('/second'));

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('timeout handling', () => {
    it('times out slow requests', async () => {
      vi.useFakeTimers();

      const slowFetch = vi.fn().mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const promise = fetchWithTimeout(slowFetch, 5000);

      vi.advanceTimersByTime(5001);

      await expect(promise).rejects.toThrow('Request timeout');

      vi.useRealTimers();
    });

    it('clears timeout on successful response', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const fastFetch = vi.fn().mockResolvedValue({ data: 'ok' });
      await fetchWithTimeout(fastFetch, 5000);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});

describe('Optimistic Updates', () => {
  describe('rollback on failure', () => {
    it('reverts optimistic update when server fails', async () => {
      const queryClient = new QueryClient();

      // Initial state
      queryClient.setQueryData(['todos'], [{ id: 1, text: 'Original' }]);

      const mutation = createMutation({
        mutationFn: () => Promise.reject(new Error('Server error')),
        onMutate: async (newTodo) => {
          const previous = queryClient.getQueryData(['todos']);
          queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);
          return { previous };
        },
        onError: (err, newTodo, context) => {
          queryClient.setQueryData(['todos'], context.previous);
        },
      });

      // Attempt mutation
      await expect(
        mutation.mutateAsync({ id: 2, text: 'New todo' })
      ).rejects.toThrow();

      // Should be rolled back
      expect(queryClient.getQueryData(['todos'])).toEqual([
        { id: 1, text: 'Original' },
      ]);
    });
  });
});

describe('Transaction Consistency', () => {
  describe('partial failure handling', () => {
    it('rolls back all changes on partial failure', async () => {
      const db = createTestDb();

      // Start with known state
      await db.insert(accounts).values([
        { id: 1, balance: 100 },
        { id: 2, balance: 50 },
      ]);

      // Transfer that should fail (insufficient funds check fails mid-transaction)
      await expect(
        transferFunds(db, { from: 1, to: 2, amount: 150 })
      ).rejects.toThrow('Insufficient funds');

      // Both balances unchanged
      const [account1] = await db.select().from(accounts).where(eq(accounts.id, 1));
      const [account2] = await db.select().from(accounts).where(eq(accounts.id, 2));

      expect(account1?.balance).toBe(100);
      expect(account2?.balance).toBe(50);
    });
  });
});

describe('Event Ordering', () => {
  it('processes events in correct order', async () => {
    const events: string[] = [];

    const eventBus = createEventBus();

    eventBus.on('event', (data) => events.push(data));

    // Emit events rapidly
    eventBus.emit('event', 'first');
    eventBus.emit('event', 'second');
    eventBus.emit('event', 'third');

    await waitForEvents();

    expect(events).toEqual(['first', 'second', 'third']);
  });
});
```

## Patterns for Handling Concurrency

### Debouncing
```typescript
// Prevent rapid-fire API calls
const debouncedSearch = useMemo(
  () => debounce((query: string) => search(query), 300),
  []
);
```

### Request Cancellation
```typescript
// Cancel previous request when new one starts
useEffect(() => {
  const controller = new AbortController();

  fetch(url, { signal: controller.signal })
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') throw err;
    });

  return () => controller.abort();
}, [url]);
```

### Optimistic Locking
```typescript
// Include version in updates
await db.update(resources)
  .set({ title: 'New Title', version: sql`version + 1` })
  .where(and(
    eq(resources.id, id),
    eq(resources.version, expectedVersion) // Fails if version changed
  ));
```

## Why This Matters

- Race conditions cause data corruption
- Stale updates overwrite valid changes
- Missing timeout handling causes hung UIs
- Partial failures leave inconsistent state
- These bugs are intermittent and hard to reproduce
