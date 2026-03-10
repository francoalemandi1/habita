# Skill: Debug Prisma performance

## Cuándo usar
Cuando se revisan queries Prisma por performance, se optimizan endpoints lentos, o se previenen anti-patterns al escribir código nuevo.

## Anti-patterns a evitar

### 1. N+1 en loops
```typescript
// MAL — N queries en loop
for (const item of items) {
  const related = await prisma.model.findMany({
    where: { parentId: item.id },
  });
}

// BIEN — 1 query batch + agrupar en memoria
const allRelated = await prisma.model.findMany({
  where: { parentId: { in: items.map(i => i.id) } },
});
const grouped = new Map<string, typeof allRelated>();
for (const r of allRelated) {
  const list = grouped.get(r.parentId) ?? [];
  list.push(r);
  grouped.set(r.parentId, list);
}
for (const item of items) {
  const related = grouped.get(item.id) ?? [];
}
```

### 2. Queries independientes secuenciales
```typescript
// MAL — 3 queries secuenciales (~150ms cada una = 450ms)
const members = await prisma.member.findMany({ where: { householdId } });
const tasks = await prisma.task.findMany({ where: { householdId } });
const expenses = await prisma.expense.findMany({ where: { householdId } });

// BIEN — 3 queries en paralelo (~150ms total)
const [members, tasks, expenses] = await Promise.all([
  prisma.member.findMany({ where: { householdId } }),
  prisma.task.findMany({ where: { householdId } }),
  prisma.expense.findMany({ where: { householdId } }),
]);
```

### 3. Over-fetching con include
```typescript
// MAL — trae TODAS las columnas + relaciones completas
const expense = await prisma.expense.findUnique({
  where: { id },
  include: { splits: true, paidBy: true },
});

// BIEN — solo los campos necesarios
const expense = await prisma.expense.findUnique({
  where: { id },
  select: {
    id: true,
    amount: true,
    title: true,
    splits: { select: { id: true, memberId: true, amount: true } },
    paidBy: { select: { id: true, name: true } },
  },
});
```

### 4. Queries sin límite (unbounded)
```typescript
// MAL — puede devolver miles de rows
const assignments = await prisma.assignment.findMany({
  where: { householdId },
});

// BIEN — limitar siempre
const assignments = await prisma.assignment.findMany({
  where: { householdId },
  take: 100,
  orderBy: { createdAt: "desc" },
});
```

### 5. Existence check trayendo todo el objeto
```typescript
// MAL — trae todas las columnas para ver si existe
const exists = await prisma.task.findFirst({
  where: { householdId, name: title },
});

// BIEN — mínimo necesario
const exists = await prisma.task.findFirst({
  where: { householdId, name: title },
  select: { id: true },
});

// TAMBIÉN BIEN — count si solo necesitás boolean
const count = await prisma.task.count({
  where: { householdId, name: title },
});
```

## Buenos patrones del proyecto

### Promise.all para dashboards
```typescript
// src/app/api/stats/route.ts — 9 queries en paralelo
const [members, weeklyCompletions, monthlyCompletions, ...] = await Promise.all([
  prisma.member.findMany({ where: { householdId }, select: { ... } }),
  prisma.assignment.findMany({ where: { ... }, select: { ... } }),
  prisma.assignment.groupBy({ by: ["memberId"], _count: true, ... }),
  // ...
]);
```

### Transactions para operaciones atómicas
```typescript
// Usar $transaction cuando múltiples writes deben ser all-or-nothing
await prisma.$transaction(async (tx) => {
  await tx.assignment.updateMany({ where: { ... }, data: { status: "CANCELLED" } });
  await tx.member.update({ where: { id: memberId }, data: { isActive: false } });
});

// Array syntax para operaciones simples sin dependencias
await prisma.$transaction([
  prisma.expense.update({ where: { id }, data }),
  prisma.expenseSplit.deleteMany({ where: { expenseId: id } }),
  prisma.expenseSplit.createMany({ data: newSplits }),
]);
```

### Paginación con count paralelo
```typescript
const [items, total] = await Promise.all([
  prisma.model.findMany({ where, take: limit, skip: offset, orderBy }),
  prisma.model.count({ where }),
]);
```

## Cuándo es aceptable no optimizar

- **Datos de referencia estáticos** (ej: TaskCatalog) — pocos rows, cambian rara vez
- **Crons con pocas iteraciones** (ej: 5 ciudades) — el overhead de batch no vale
- **Queries dentro de transactions** — no se pueden paralelizar (comparten conexión)
- **findFirst/findUnique** — ya retornan 1 row máximo

## Checklist para queries nuevas

- [ ] ¿Hay queries independientes? → `Promise.all`
- [ ] ¿Hay query en loop? → Batch con `{ in: [...] }` + Map
- [ ] ¿Se usa `include`? → ¿Se necesitan todos los campos? → `select`
- [ ] ¿Es `findMany` sin `take`? → ¿Puede crecer sin límite? → agregar `take`
- [ ] ¿Es solo existence check? → usar `select: { id: true }` o `count`
- [ ] ¿Son múltiples writes dependientes? → `$transaction`
- [ ] Decimal: `.toFixed(2)` al crear, `.toNumber()` al serializar
