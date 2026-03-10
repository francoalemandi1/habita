# Skill: Expense management (splits, settlements, balances)

## Cuándo usar
Cuando se trabaja con gastos compartidos: creación, splits, actualización de montos, liquidaciones o balances.

## Modelo de datos

```
Expense (amount: Decimal(10,2), splitType: EQUAL|CUSTOM|PERCENTAGE, paidById)
  └─ ExpenseSplit[] (memberId, amount: Decimal(10,2), settled: Boolean, settledAt?)
```

## Split types

| Tipo | Cálculo | Monto editable? |
|------|---------|-----------------|
| **EQUAL** | `amount / activeMembers.length` | Sí (recalcula splits automáticamente) |
| **CUSTOM** | Montos explícitos por member | **No** — hay que eliminar y recrear |
| **PERCENTAGE** | `amount * (percentage / 100)` | **No** — hay que eliminar y recrear |

## Precisión Decimal (CRÍTICO)

### Crear Decimal para DB
```typescript
import { Prisma } from "@prisma/client";

// SIEMPRE .toFixed(2) antes del constructor
const shareAmount = amount / memberCount;
amount: new Prisma.Decimal(shareAmount.toFixed(2))
```

### Serializar para cliente
```typescript
// SIEMPRE .toNumber() antes de enviar JSON
amount: expense.amount.toNumber(),
splits: expense.splits.map(s => ({
  ...s,
  amount: s.amount.toNumber(),
}))
```

### Comparar balances (threshold de 1 centavo)
```typescript
// NO usar ===, usar threshold
const isZero = Math.abs(balance) < 0.01;
const rounded = Math.round(balance * 100) / 100;
```

## Crear expense con splits

### buildSplitsData pattern
```typescript
// EQUAL — se crean splits para TODOS los members activos
const activeMembers = await prisma.member.findMany({
  where: { householdId, isActive: true },
  select: { id: true },
});
const shareAmount = amount / activeMembers.length;
const splitsData = activeMembers.map(m => ({
  memberId: m.id,
  amount: new Prisma.Decimal(shareAmount.toFixed(2)),
}));

// CUSTOM — montos explícitos del cliente
const splitsData = splits.map(s => ({
  memberId: s.memberId,
  amount: new Prisma.Decimal((s.amount ?? 0).toFixed(2)),
}));

// PERCENTAGE — calculado server-side
const splitsData = splits.map(s => ({
  memberId: s.memberId,
  amount: new Prisma.Decimal(((amount * (s.percentage ?? 0)) / 100).toFixed(2)),
}));
```

## Actualizar monto (solo EQUAL)

```typescript
// CUSTOM/PERCENTAGE → rechazar
if (expense.splitType !== "EQUAL" && body.amount !== undefined) {
  throw new BadRequestError(
    "Para cambiar el monto de un gasto con división custom, eliminá y creá de nuevo"
  );
}

// EQUAL → recalcular atómicamente
if (body.amount && expense.splitType === "EQUAL") {
  const activeMembers = await prisma.member.findMany({
    where: { householdId: member.householdId, isActive: true },
    select: { id: true },
  });
  const shareAmount = body.amount / activeMembers.length;

  await prisma.$transaction([
    prisma.expense.update({ where: { id: expenseId }, data: updateData }),
    prisma.expenseSplit.deleteMany({ where: { expenseId } }),
    prisma.expenseSplit.createMany({
      data: activeMembers.map(m => ({
        expenseId,
        memberId: m.id,
        amount: new Prisma.Decimal(shareAmount.toFixed(2)),
      })),
    }),
  ]);
}
```

## Settlement

### Individual: `POST /api/expenses/[expenseId]/settle`
```typescript
// Marca splits específicos como liquidados
{ splitIds: string[] }
// → update: { settled: true, settledAt: new Date() }
```

### Batch: `POST /api/expenses/settle-between`
```typescript
// Liquida TODAS las deudas entre dos members
{ fromMemberId, toMemberId }
// → busca splits: memberId === from AND paidById === to AND settled === false
// → update all: { settled: true, settledAt: new Date() }
```

## Balance y simplificación de deudas

### Cálculo de balance
- Solo splits `settled: false`
- Payer: balance += sum de splits ajenos
- Split member: balance -= split amount
- Positivo = te deben, Negativo = debés

### Simplificación (greedy algorithm)
1. Separar creditors (balance > 0.01) y debtors (balance < -0.01)
2. Ordenar ambos descendente por monto
3. Match: transferir `min(creditor, debtor)` entre el más grande de cada grupo
4. Output: `DebtTransaction[]` mínimo

## Shared Fund integration

```typescript
// Si chargeToFund: true y fondo activo con categoría permitida
if (chargeToFund && activeFund?.isActive && fundCategories.includes(category)) {
  // Crear FundExpense vinculado dentro de la misma operación
  fundExpense: { create: { fundId, title, amount, category, date, notes } }
}
```

## Validación (contracts)

```typescript
// Create: amount > 0, max 99_999_999, paidById required
createExpenseSchema = z.object({
  title: z.string().min(1).max(100),
  amount: z.number().positive().max(99_999_999),
  paidById: z.string().min(1),
  splitType: splitTypeSchema.default("EQUAL"),
  splits: z.array(...).optional(),  // Solo para CUSTOM/PERCENTAGE
})

// Update: splitType NO es editable
updateExpenseSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  amount: z.number().positive().max(99_999_999).optional(),
  category: expenseCategorySchema.optional(),
  notes: z.string().max(500).nullable().optional(),
})
```

## Checklist

- [ ] `Prisma.Decimal` con `.toFixed(2)` para guardar
- [ ] `.toNumber()` para serializar al cliente
- [ ] Threshold `0.01` para comparar balances
- [ ] `isActive: true` al buscar members para splits
- [ ] Transaction (`$transaction`) para update + delete + recreate splits
- [ ] CUSTOM/PERCENTAGE: bloquear update de amount (HTTP 400)
- [ ] Notificación fire-and-forget al crear expense compartido
- [ ] Data isolation: filtrar expense por `householdId`
- [ ] Settlement: verificar que ambos members pertenecen al mismo household
