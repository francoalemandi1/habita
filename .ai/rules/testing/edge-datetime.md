# Rule: DateTime Edge Cases

## Summary
Date and time handling is notoriously error-prone. Test these specific scenarios to avoid subtle bugs.

## Critical Edge Cases

### Timezones
- UTC vs local time conversions
- Daylight saving time transitions
- Users in different timezones
- Server timezone vs user timezone

### Boundaries
- Midnight (00:00:00)
- End of day (23:59:59)
- Month boundaries (Jan 31 → Feb 1)
- Year boundaries (Dec 31 → Jan 1)
- Leap years (Feb 29)

### Special Dates
- Leap year February
- Months with different day counts
- DST transition dates
- New Year's Eve/Day

## Examples

### Good Test Cases ✅
```typescript
describe('DateFormatter', () => {
  // Timezone handling
  describe('timezone conversions', () => {
    it('converts UTC to user timezone correctly', () => {
      const utcDate = '2024-06-15T14:00:00Z';
      expect(formatInTimezone(utcDate, 'America/New_York'))
        .toBe('June 15, 2024 10:00 AM'); // EDT = UTC-4
    });

    it('handles DST transition - spring forward', () => {
      // March 10, 2024 2:00 AM EST → 3:00 AM EDT
      const beforeDST = '2024-03-10T06:30:00Z'; // 1:30 AM EST
      const afterDST = '2024-03-10T07:30:00Z';  // 3:30 AM EDT

      expect(formatInTimezone(beforeDST, 'America/New_York'))
        .toBe('1:30 AM');
      expect(formatInTimezone(afterDST, 'America/New_York'))
        .toBe('3:30 AM');
    });

    it('handles DST transition - fall back', () => {
      // Nov 3, 2024 2:00 AM EDT → 1:00 AM EST (ambiguous hour)
      // 6:00 UTC = 2:00 AM EDT (before) or 1:00 AM EST (after)
    });
  });

  // Boundary cases
  describe('date boundaries', () => {
    it('handles midnight correctly', () => {
      expect(formatDate('2024-01-15T00:00:00Z')).toBe('January 15, 2024');
    });

    it('handles end of day', () => {
      expect(formatDate('2024-01-15T23:59:59Z')).toBe('January 15, 2024');
    });

    it('handles month boundary', () => {
      const jan31 = new Date('2024-01-31');
      expect(addDays(jan31, 1).toISOString()).toContain('2024-02-01');
    });

    it('handles year boundary', () => {
      const dec31 = new Date('2024-12-31');
      expect(addDays(dec31, 1).toISOString()).toContain('2025-01-01');
    });
  });

  // Leap year
  describe('leap year', () => {
    it('handles Feb 29 in leap year', () => {
      expect(isValidDate('2024-02-29')).toBe(true);  // 2024 is leap year
      expect(isValidDate('2023-02-29')).toBe(false); // 2023 is not
    });

    it('adds year correctly from Feb 29', () => {
      const feb29 = new Date('2024-02-29');
      // Adding 1 year: Feb 29, 2024 → Feb 28, 2025 (no Feb 29)
      expect(addYears(feb29, 1).toISOString()).toContain('2025-02-28');
    });

    it('handles leap year centuries', () => {
      expect(isLeapYear(2000)).toBe(true);  // Divisible by 400
      expect(isLeapYear(1900)).toBe(false); // Divisible by 100 but not 400
      expect(isLeapYear(2100)).toBe(false); // Divisible by 100 but not 400
    });
  });

  // Month lengths
  describe('month lengths', () => {
    it.each([
      ['2024-01-31', 31], // January
      ['2024-02-29', 29], // February (leap)
      ['2023-02-28', 28], // February (non-leap)
      ['2024-04-30', 30], // April
    ])('validates day %s in month with %d days', (date, maxDays) => {
      expect(isValidDate(date)).toBe(true);
    });

    it('handles adding month from Jan 31', () => {
      const jan31 = new Date('2024-01-31');
      // Jan 31 + 1 month = Feb 29 (leap year) or Feb 28
      expect(addMonths(jan31, 1).getDate()).toBeLessThanOrEqual(29);
    });
  });
});

describe('DateRangePicker', () => {
  it('disallows end date before start date', () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.setStartDate('2024-06-15');
      result.current.setEndDate('2024-06-10'); // Before start
    });

    expect(result.current.error).toBe('End date must be after start date');
  });

  it('handles same-day range', () => {
    const { result } = renderHook(() => useDateRange());

    act(() => {
      result.current.setStartDate('2024-06-15');
      result.current.setEndDate('2024-06-15');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.dayCount).toBe(1);
  });
});

describe('Recurring events', () => {
  it('handles monthly recurrence on 31st', () => {
    // Recurring on 31st: Jan 31 → Feb 28 → Mar 31 → Apr 30
    const occurrences = getMonthlyOccurrences('2024-01-31', 4);

    expect(occurrences).toEqual([
      '2024-01-31',
      '2024-02-29', // Leap year
      '2024-03-31',
      '2024-04-30', // April has 30 days
    ]);
  });
});
```

## Common Pitfalls

### Date Parsing
```typescript
// ❌ Inconsistent parsing
new Date('2024-01-15'); // Parsed as UTC
new Date('01/15/2024'); // Parsed as local time!

// ✅ Always be explicit
dayjs('2024-01-15').tz('UTC');
dayjs('2024-01-15').tz(userTimezone);
```

### Date Comparison
```typescript
// ❌ Comparing Date objects directly
date1 === date2 // Reference comparison!

// ✅ Compare timestamps or formatted strings
date1.getTime() === date2.getTime()
date1.toISOString() === date2.toISOString()
```

### Off-by-one Errors
```typescript
// ❌ JavaScript months are 0-indexed
new Date(2024, 1, 15); // February 15, not January!

// ✅ Use ISO strings or explicit APIs
new Date('2024-01-15');
dayjs().month(0); // January (still 0-indexed but clearer)
```

## Test Fixtures

```typescript
// Useful date fixtures for tests
const fixtures = {
  leapYearFeb29: '2024-02-29',
  nonLeapYearFeb28: '2023-02-28',
  dstSpringForward: '2024-03-10T07:00:00Z', // US DST start
  dstFallBack: '2024-11-03T06:00:00Z',      // US DST end
  yearEnd: '2024-12-31T23:59:59Z',
  yearStart: '2024-01-01T00:00:00Z',
  midnight: '2024-06-15T00:00:00Z',
  endOfDay: '2024-06-15T23:59:59Z',
};
```

## Why This Matters

- Date bugs often only appear on specific days
- Timezone bugs affect users in other regions
- DST bugs appear twice a year
- Leap year bugs appear once every 4 years
- These bugs are hard to reproduce and debug
