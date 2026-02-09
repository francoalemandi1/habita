# Rule: Validation Edge Cases

## Summary
Input validation is your first line of defense. Test boundaries, special characters, and malformed inputs systematically.

## Critical Edge Cases

### String Inputs
- Empty string
- Whitespace only
- Very long strings
- Unicode/emoji
- Special characters
- HTML/script injection

### Numeric Inputs
- Zero
- Negative numbers
- Decimal precision
- Very large numbers
- NaN, Infinity
- Number as string

### Arrays/Collections
- Empty array
- Single item
- Duplicate items
- Very large arrays
- Null/undefined items

### Objects
- Empty object
- Missing required fields
- Extra unexpected fields
- Null values
- Nested objects

## Examples

### Good Test Cases ✅
```typescript
describe('EmailValidator', () => {
  describe('valid emails', () => {
    it.each([
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user@sub.domain.com',
      'a@b.co', // Minimum valid
    ])('accepts %s', (email) => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  describe('invalid emails', () => {
    it.each([
      ['', 'empty string'],
      ['   ', 'whitespace only'],
      ['notanemail', 'no @ symbol'],
      ['@example.com', 'no local part'],
      ['user@', 'no domain'],
      ['user@.com', 'dot at domain start'],
      ['user@domain', 'no TLD'],
      ['user@@domain.com', 'double @'],
      ['user@domain..com', 'double dot'],
    ])('rejects %s (%s)', (email) => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles very long email', () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });

    it('handles unicode', () => {
      expect(validateEmail('用户@example.com')).toBe(false); // or true, depending on spec
    });

    it('trims whitespace', () => {
      expect(validateEmail('  user@example.com  ')).toBe(true);
    });
  });
});

describe('PasswordValidator', () => {
  describe('strength requirements', () => {
    it.each([
      ['short', false, 'too short'],
      ['nouppercase1!', false, 'no uppercase'],
      ['NOLOWERCASE1!', false, 'no lowercase'],
      ['NoNumbers!!', false, 'no numbers'],
      ['NoSpecial123', false, 'no special chars'],
      ['Valid1Password!', true, 'meets all requirements'],
    ])('%s is %s (%s)', (password, expected) => {
      expect(isStrongPassword(password)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('handles empty password', () => {
      expect(isStrongPassword('')).toBe(false);
    });

    it('handles password with only spaces', () => {
      expect(isStrongPassword('        ')).toBe(false);
    });

    it('handles unicode characters', () => {
      expect(isStrongPassword('Pässwörd1!')).toBe(true); // Depends on requirements
    });

    it('handles emoji', () => {
      expect(isStrongPassword('Password1😀')).toBe(true); // Depends on requirements
    });
  });
});

describe('NumberInput', () => {
  describe('numeric boundaries', () => {
    it.each([
      [0, true, 'zero'],
      [-1, false, 'negative'],
      [100, true, 'valid positive'],
      [999999999, true, 'large number'],
      [Number.MAX_SAFE_INTEGER + 1, false, 'beyond safe integer'],
    ])('validates %d as %s (%s)', (num, expected) => {
      expect(isValidQuantity(num)).toBe(expected);
    });
  });

  describe('decimal handling', () => {
    it('rounds currency to 2 decimal places', () => {
      expect(formatCurrency(10.999)).toBe('11.00');
      expect(formatCurrency(10.001)).toBe('10.00');
    });

    it('handles floating point precision', () => {
      // 0.1 + 0.2 = 0.30000000000000004
      expect(addPrices(0.1, 0.2)).toBe(0.30);
    });
  });

  describe('type coercion', () => {
    it('handles number as string', () => {
      expect(parseQuantity('42')).toBe(42);
    });

    it('rejects non-numeric strings', () => {
      expect(parseQuantity('abc')).toBeNaN();
    });

    it('handles empty string', () => {
      expect(parseQuantity('')).toBeNaN();
    });
  });
});

describe('ArrayValidator', () => {
  describe('collection edge cases', () => {
    it('handles empty array', () => {
      expect(validateItems([])).toEqual({ valid: true, items: [] });
    });

    it('handles single item', () => {
      expect(validateItems([{ id: 1 }])).toEqual({ valid: true, items: [{ id: 1 }] });
    });

    it('handles duplicates', () => {
      const items = [{ id: 1 }, { id: 1 }];
      expect(validateItems(items).valid).toBe(false);
      expect(validateItems(items).error).toBe('Duplicate IDs found');
    });

    it('handles null items in array', () => {
      expect(validateItems([{ id: 1 }, null, { id: 2 }]).valid).toBe(false);
    });

    it('handles very large array', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
      const result = validateItems(largeArray);
      expect(result.valid).toBe(true);
    });
  });
});

describe('FormData', () => {
  describe('missing fields', () => {
    it('rejects missing required fields', () => {
      const result = validateForm({});
      expect(result.errors).toContain('name is required');
      expect(result.errors).toContain('email is required');
    });

    it('accepts missing optional fields', () => {
      const result = validateForm({ name: 'John', email: 'john@example.com' });
      expect(result.valid).toBe(true);
    });
  });

  describe('extra fields', () => {
    it('ignores unknown fields', () => {
      const result = validateForm({
        name: 'John',
        email: 'john@example.com',
        unknownField: 'value',
      });
      expect(result.valid).toBe(true);
      expect(result.data.unknownField).toBeUndefined();
    });
  });

  describe('null handling', () => {
    it('treats null as missing', () => {
      const result = validateForm({ name: null, email: 'john@example.com' });
      expect(result.errors).toContain('name is required');
    });
  });
});
```

## Security-Critical Validation

```typescript
describe('XSS Prevention', () => {
  it.each([
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    'javascript:alert(1)',
    '<a href="javascript:alert(1)">click</a>',
    '"><script>alert(1)</script>',
  ])('sanitizes dangerous input: %s', (input) => {
    const sanitized = sanitizeInput(input);
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('onerror');
  });
});

describe('SQL Injection Prevention', () => {
  it.each([
    "'; DROP TABLE users; --",
    "1 OR 1=1",
    "1; DELETE FROM users",
  ])('escapes dangerous SQL input: %s', (input) => {
    // Should use parameterized queries, not escaping
    expect(() => db.query(sanitizeForSQL(input))).not.toThrow();
  });
});
```

## Why This Matters

- Invalid input causes crashes
- Boundary conditions cause subtle bugs
- Missing validation enables security exploits
- Null/undefined handling prevents runtime errors
- Type coercion bugs are hard to find
