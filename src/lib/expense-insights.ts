/**
 * Pure functions for computing expense insights from raw query data.
 * Provides an emotional stability panel: "cómo estás" instead of "cuánto gastaste".
 *
 * Separates fixed expenses (rent, utilities, service-linked) from variable
 * expenses, computes 3-month averages, and generates interpretive summaries.
 *
 * No side effects, no DB access — fully deterministic and testable.
 */

import type { ExpenseCategory } from "@prisma/client";

// ============================================
// Types
// ============================================

export interface ExpenseRow {
  amount: number;
  category: ExpenseCategory;
  title: string;
  date: string;
  hasInvoice: boolean;
}

export interface LastMonthExpenseRow {
  amount: number;
  category: ExpenseCategory;
  title: string;
  date: string;
  hasInvoice: boolean;
}

/** Raw rows from a historical month — used to build HistoricalMonthSummary. */
export interface HistoricalExpenseRow {
  amount: number;
  category: ExpenseCategory;
  title: string;
  hasInvoice: boolean;
}

export interface ActiveServiceRow {
  lastAmount: number | null;
  frequency: string;
}

export interface CategoryAmount {
  category: ExpenseCategory;
  amount: number;
}

export interface FrequentExpense {
  title: string;
  amount: number;
  category: ExpenseCategory;
  count: number;
}

export interface SpendingTip {
  id: string;
  emoji: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
}

/** Aggregated data for a historical month (no individual rows needed at compute time). */
export interface HistoricalMonthSummary {
  variableTotal: number;
  categoryBreakdown: CategoryAmount[];
  totalDays: number;
}

/** Emotional status of the month. */
export type MonthStatus = "stable" | "above_average" | "well_below";

/** The category that grew the most vs its historical average. */
export interface CategoryGrowthInsight {
  category: ExpenseCategory;
  currentAmount: number;
  averageAmount: number;
  growthPercent: number;
}

export interface ExpenseInsightsContext {
  thisMonthExpenses: ExpenseRow[];
  lastMonthExpenses: LastMonthExpenseRow[];
  activeServices: ActiveServiceRow[];
  upcomingServices: Array<{ lastAmount: number | null }>;
  daysElapsedThisMonth: number;
  totalDaysInMonth: number;
  lastMonthTotalDays: number;
  twoMonthsAgoSummary: HistoricalMonthSummary | null;
  threeMonthsAgoSummary: HistoricalMonthSummary | null;
}

export interface ExpenseInsightsResponse {
  /** Daily pace of variable spending */
  variableDailyAverage: number;
  /** Projected variable spending for the full month */
  variableProjected: number;

  /** Fixed spending this month */
  fixedThisMonth: number;
  /** Expected monthly fixed cost from active services */
  expectedFixedMonthly: number;

  /** Total (fixed + variable) */
  thisMonthTotal: number;

  /** Projected total for the month: fijos pagados + fijos pendientes + variable projected */
  projectedTotal: number;

  /** Upcoming services */
  upcomingServicesCost: number;
  upcomingServicesCount: number;

  /** Quick-add frequent expenses */
  frequentExpenses: FrequentExpense[];

  /** Actionable spending tips based on detected patterns */
  spendingTips: SpendingTip[];

  daysElapsedThisMonth: number;
  totalDaysInMonth: number;

  // ── Emotional panel fields ──

  /** 3-month average of variable spending (null if no history) */
  variableMonthlyAverage: number | null;
  /** Projected total vs average */
  variableVsAverageTrend: "up" | "down" | "flat";
  variableVsAveragePercent: number;

  /** Emotional month status */
  monthStatus: MonthStatus;

  /** Historical daily average from past months */
  historicalDailyAverage: number | null;
  dailyVsAverageTrend: "up" | "down" | "flat";
  dailyVsAveragePercent: number;

  /** The category that grew the most vs its 3-month average */
  topGrowthCategory: CategoryGrowthInsight | null;

  /** Fixed expenses count this month */
  fixedExpensesCount: number;
  /** Fixed expenses as percent of total */
  fixedPercentOfTotal: number;
}

// ============================================
// Constants
// ============================================

const TREND_THRESHOLD_PERCENT = 1;
const MAX_FREQUENT_EXPENSES = 3;
const MIN_FREQUENCY_COUNT = 2;

/** Categories that are inherently fixed even without a service link. */
const FIXED_CATEGORIES: ReadonlySet<ExpenseCategory> = new Set<ExpenseCategory>(["RENT", "UTILITIES"]);

/**
 * Keywords in expense titles that indicate a fixed/recurring payment,
 * even when entered manually without a Service link.
 */
const FIXED_TITLE_KEYWORDS = [
  // Alquiler
  "alquiler", "renta", "inmobiliaria",
  // Servicios públicos
  "luz", "gas natural", "agua", "electricidad",
  "edenor", "edesur", "metrogas", "aysa", "absa",
  // Internet / teléfono
  "internet", "wifi", "fibertel", "telecom", "personal", "claro", "movistar",
  "tuenti", "flow", "directv", "starlink",
  // Impuestos y tasas
  "expensas", "monotributo", "abl", "inmobiliario", "arba", "afip", "iibb",
  // Seguros
  "seguro", "prepaga", "osde", "swiss medical", "galeno",
  // Suscripciones de servicios (no entretenimiento)
  "icloud", "google one", "dropbox", "chatgpt", "microsoft 365",
  // Educación fija
  "cuota colegio", "cuota universidad", "cuota facultad",
];

const MAX_SPENDING_TIPS = 2;
const DELIVERY_KEYWORDS = ["rappi", "pedidosya", "pedidos ya", "ifood", "globo", "didi food"];
const KIOSCO_KEYWORDS = ["kiosco", "maxikiosco", "minimarket", "almacen", "drugstore"];

/** Multiplier to normalize service frequency to monthly equivalent. */
const FREQUENCY_TO_MONTHLY: Record<string, number> = {
  WEEKLY: 4.33,
  MONTHLY: 1,
  BIMONTHLY: 0.5,
  QUARTERLY: 0.333,
  YEARLY: 0.083,
};

/** Minimum growth % and absolute amount to consider a category for the growth insight. */
const GROWTH_MIN_PERCENT = 10;
const GROWTH_MIN_AMOUNT = 1_000;

// ============================================
// Helpers (exported for API route aggregation)
// ============================================

export function normalizeTitle(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function isFixedExpense(expense: { hasInvoice: boolean; category: ExpenseCategory; title: string }): boolean {
  if (expense.hasInvoice || FIXED_CATEGORIES.has(expense.category)) return true;

  const normalized = normalizeTitle(expense.title);
  return FIXED_TITLE_KEYWORDS.some((kw) => normalized.includes(kw));
}

function computeTrend(
  current: number,
  previous: number,
): { trend: "up" | "down" | "flat"; percent: number } {
  if (previous === 0) {
    if (current === 0) return { trend: "flat", percent: 0 };
    return { trend: "up", percent: 100 };
  }

  const percent = ((current - previous) / previous) * 100;

  if (percent > TREND_THRESHOLD_PERCENT) return { trend: "up", percent: Math.round(Math.abs(percent)) };
  if (percent < -TREND_THRESHOLD_PERCENT) return { trend: "down", percent: Math.round(Math.abs(percent)) };
  return { trend: "flat", percent: 0 };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function matchesKeywords(normalizedTitle: string, keywords: string[]): boolean {
  return keywords.some((kw) => normalizedTitle.includes(kw));
}

function computeExpectedMonthlyFixed(services: ActiveServiceRow[]): number {
  return services.reduce((sum, s) => {
    const monthlyFactor = FREQUENCY_TO_MONTHLY[s.frequency] ?? 1;
    return sum + (s.lastAmount ?? 0) * monthlyFactor;
  }, 0);
}

// ============================================
// Historical month aggregation
// ============================================

/**
 * Aggregate raw expense rows into a HistoricalMonthSummary.
 * Used by the API route to pre-process month -2 and month -3 data.
 */
export function aggregateHistoricalMonth(
  expenses: HistoricalExpenseRow[],
  totalDays: number,
): HistoricalMonthSummary {
  const variableExpenses = expenses.filter((e) => !isFixedExpense(e));
  const variableTotal = variableExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryMap = new Map<ExpenseCategory, number>();
  for (const expense of variableExpenses) {
    categoryMap.set(expense.category, (categoryMap.get(expense.category) ?? 0) + expense.amount);
  }

  return {
    variableTotal: round2(variableTotal),
    categoryBreakdown: Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
    totalDays,
  };
}

// ============================================
// 3-month average computations
// ============================================

function computeVariableMonthlyAverage(
  lastMonthVariableTotal: number,
  twoMonthsAgo: HistoricalMonthSummary | null,
  threeMonthsAgo: HistoricalMonthSummary | null,
): number | null {
  const months: number[] = [];
  if (lastMonthVariableTotal > 0) months.push(lastMonthVariableTotal);
  if (twoMonthsAgo && twoMonthsAgo.variableTotal > 0) months.push(twoMonthsAgo.variableTotal);
  if (threeMonthsAgo && threeMonthsAgo.variableTotal > 0) months.push(threeMonthsAgo.variableTotal);

  if (months.length === 0) return null;
  return round2(months.reduce((a, b) => a + b, 0) / months.length);
}

function computeHistoricalDailyAverage(
  lastMonthVariableTotal: number,
  lastMonthTotalDays: number,
  twoMonthsAgo: HistoricalMonthSummary | null,
  threeMonthsAgo: HistoricalMonthSummary | null,
): number | null {
  const dailies: number[] = [];

  if (lastMonthVariableTotal > 0 && lastMonthTotalDays > 0) {
    dailies.push(lastMonthVariableTotal / lastMonthTotalDays);
  }
  if (twoMonthsAgo && twoMonthsAgo.variableTotal > 0 && twoMonthsAgo.totalDays > 0) {
    dailies.push(twoMonthsAgo.variableTotal / twoMonthsAgo.totalDays);
  }
  if (threeMonthsAgo && threeMonthsAgo.variableTotal > 0 && threeMonthsAgo.totalDays > 0) {
    dailies.push(threeMonthsAgo.variableTotal / threeMonthsAgo.totalDays);
  }

  if (dailies.length === 0) return null;
  return round2(dailies.reduce((a, b) => a + b, 0) / dailies.length);
}

// ============================================
// Month status
// ============================================

function computeMonthStatus(
  vsAverageTrend: "up" | "down" | "flat",
  vsAveragePercent: number,
): MonthStatus {
  if (vsAverageTrend === "down" && vsAveragePercent > 15) return "well_below";
  if (vsAverageTrend === "up" && vsAveragePercent > 10) return "above_average";
  return "stable";
}

// ============================================
// Top growth category
// ============================================

function computeTopGrowthCategory(
  currentBreakdown: CategoryAmount[],
  lastMonthVariableExpenses: LastMonthExpenseRow[],
  twoMonthsAgo: HistoricalMonthSummary | null,
  threeMonthsAgo: HistoricalMonthSummary | null,
): CategoryGrowthInsight | null {
  const lastMonthCategoryMap = new Map<ExpenseCategory, number>();
  for (const expense of lastMonthVariableExpenses) {
    lastMonthCategoryMap.set(
      expense.category,
      (lastMonthCategoryMap.get(expense.category) ?? 0) + expense.amount,
    );
  }

  let bestGrowth: CategoryGrowthInsight | null = null;

  for (const current of currentBreakdown) {
    if (current.amount < GROWTH_MIN_AMOUNT) continue;

    const historicalAmounts: number[] = [];

    const lastMonthAmount = lastMonthCategoryMap.get(current.category) ?? 0;
    if (lastMonthAmount > 0) historicalAmounts.push(lastMonthAmount);

    if (twoMonthsAgo) {
      const found = twoMonthsAgo.categoryBreakdown.find((c) => c.category === current.category);
      if (found && found.amount > 0) historicalAmounts.push(found.amount);
    }

    if (threeMonthsAgo) {
      const found = threeMonthsAgo.categoryBreakdown.find((c) => c.category === current.category);
      if (found && found.amount > 0) historicalAmounts.push(found.amount);
    }

    if (historicalAmounts.length === 0) continue;

    const averageAmount = historicalAmounts.reduce((a, b) => a + b, 0) / historicalAmounts.length;
    if (averageAmount === 0) continue;

    const growthPercent = Math.round(((current.amount - averageAmount) / averageAmount) * 100);

    if (growthPercent >= GROWTH_MIN_PERCENT) {
      if (!bestGrowth || growthPercent > bestGrowth.growthPercent) {
        bestGrowth = {
          category: current.category,
          currentAmount: round2(current.amount),
          averageAmount: round2(averageAmount),
          growthPercent,
        };
      }
    }
  }

  return bestGrowth;
}

// ============================================
// Spending Tips
// ============================================

function formatTipAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  }
  if (amount >= 10_000) {
    return `$${Math.round(amount / 1_000).toLocaleString("es-AR")}k`;
  }
  return `$${amount.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Compute contextual banners that cross-link to other Habita features.
 *
 * Philosophy: banners are invitations, not financial advice.
 * If the user bought groceries → we offer price comparison.
 * If they ordered delivery → we offer recipes.
 * If they ate out → we offer restaurant discovery.
 * Low thresholds: the trigger is "you did this", not "you did this too much".
 */
function computeSpendingTips(
  variableExpenses: ExpenseRow[],
  variableTotal: number,
  variableCategoryBreakdown: CategoryAmount[],
): SpendingTip[] {
  if (variableTotal === 0 || variableExpenses.length === 0) return [];

  const tips: SpendingTip[] = [];

  // Aggregate delivery, kiosco, and grocery spending from titles
  let deliveryTotal = 0;
  let deliveryCount = 0;
  let kioscoTotal = 0;
  let kioscoCount = 0;
  let groceryTotal = 0;
  let groceryCount = 0;

  for (const expense of variableExpenses) {
    const normalized = normalizeTitle(expense.title);
    if (matchesKeywords(normalized, DELIVERY_KEYWORDS)) {
      deliveryTotal += expense.amount;
      deliveryCount++;
    } else if (matchesKeywords(normalized, KIOSCO_KEYWORDS)) {
      kioscoTotal += expense.amount;
      kioscoCount++;
    } else if (expense.category === "GROCERIES") {
      groceryTotal += expense.amount;
      groceryCount++;
    }
  }

  // Category totals
  const categoryTotals = new Map<ExpenseCategory, number>();
  for (const cat of variableCategoryBreakdown) {
    categoryTotals.set(cat.category, cat.amount);
  }
  const foodTotal = categoryTotals.get("FOOD") ?? 0;
  const entertainmentTotal = categoryTotals.get("ENTERTAINMENT") ?? 0;

  // ── Banner: Grocery → Price comparison ──
  if (groceryCount >= 2) {
    tips.push({
      id: "grocery_compare",
      emoji: "\uD83D\uDED2", // 🛒
      message: `Gastaste ${formatTipAmount(groceryTotal)} en super este mes. Mirá precios en distintas cadenas`,
      action: { label: "Comparar precios", href: "/compras" },
    });
  }

  // ── Banner: Delivery → Recipes ──
  if (tips.length < MAX_SPENDING_TIPS && deliveryCount >= 2) {
    tips.push({
      id: "delivery_recipes",
      emoji: "\uD83C\uDF73", // 🍳
      message: `Pediste delivery ${deliveryCount} veces (${formatTipAmount(deliveryTotal)}). Sacale una foto a tu heladera y te sugerimos recetas`,
      action: { label: "Buscar recetas", href: "/cocina" },
    });
  }

  // ── Banner: Kiosco → Shopping list ──
  if (tips.length < MAX_SPENDING_TIPS && kioscoCount >= 3) {
    tips.push({
      id: "kiosco_list",
      emoji: "\uD83C\uDFEA", // 🏪
      message: `Fuiste ${kioscoCount} veces al kiosco por ${formatTipAmount(kioscoTotal)}. ¿Querés armar una lista para el super?`,
      action: { label: "Armar lista", href: "/compras" },
    });
  }

  // ── Banner: Eating out → Discover restaurants ──
  if (tips.length < MAX_SPENDING_TIPS && foodTotal > 0) {
    const foodExpenseCount = variableExpenses.filter((e) => e.category === "FOOD").length;
    if (foodExpenseCount >= 2) {
      tips.push({
        id: "food_discover",
        emoji: "\uD83C\uDF7D\uFE0F", // 🍽️
        message: `${formatTipAmount(foodTotal)} en salidas y comida. Descubrí restaurantes y bares cerca tuyo`,
        action: { label: "Explorar", href: "/descubrir" },
      });
    }
  }

  // ── Banner: Entertainment → Discover plans ──
  if (tips.length < MAX_SPENDING_TIPS && entertainmentTotal > 0) {
    const entertainmentCount = variableExpenses.filter((e) => e.category === "ENTERTAINMENT").length;
    if (entertainmentCount >= 2) {
      tips.push({
        id: "entertainment_discover",
        emoji: "\uD83C\uDFAD", // 🎭
        message: `Gastaste ${formatTipAmount(entertainmentTotal)} en entretenimiento. Mirá qué planes hay cerca`,
        action: { label: "Ver planes", href: "/descubrir" },
      });
    }
  }

  return tips.slice(0, MAX_SPENDING_TIPS);
}

// ============================================
// Main computation
// ============================================

export function computeExpenseInsights(context: ExpenseInsightsContext): ExpenseInsightsResponse {
  const {
    thisMonthExpenses,
    lastMonthExpenses,
    activeServices,
    upcomingServices,
    daysElapsedThisMonth,
    totalDaysInMonth,
    lastMonthTotalDays,
    twoMonthsAgoSummary,
    threeMonthsAgoSummary,
  } = context;

  // ── Split this month into fixed vs variable ──

  const variableThisMonthExpenses = thisMonthExpenses.filter((e) => !isFixedExpense(e));
  const fixedThisMonthExpenses = thisMonthExpenses.filter((e) => isFixedExpense(e));

  const variableThisMonth = variableThisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const fixedThisMonth = fixedThisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthTotal = variableThisMonth + fixedThisMonth;

  // ── Last month: variable only ──

  const variableLastMonth = lastMonthExpenses.filter((e) => !isFixedExpense(e));
  const variableLastMonthFull = variableLastMonth.reduce((sum, e) => sum + e.amount, 0);

  // ── Daily pace (variable only) ──

  const variableDailyAverage =
    daysElapsedThisMonth > 0 ? round2(variableThisMonth / daysElapsedThisMonth) : 0;
  const variableProjected = round2(variableDailyAverage * totalDaysInMonth);

  // ── Expected fixed monthly ──

  const expectedFixedMonthly = round2(computeExpectedMonthlyFixed(activeServices));

  // ── Projected total: fijos ya pagados + fijos pendientes estimados + variable projected ──
  // If expected > already paid, the remainder is pending. Otherwise, all fijos are paid.

  const pendingFixedEstimate = Math.max(0, expectedFixedMonthly - fixedThisMonth);
  const projectedTotal = round2(variableProjected + fixedThisMonth + pendingFixedEstimate);

  // ── Category breakdown (variable only, for growth + tips computation) ──

  const categoryMap = new Map<ExpenseCategory, number>();
  for (const expense of variableThisMonthExpenses) {
    categoryMap.set(
      expense.category,
      (categoryMap.get(expense.category) ?? 0) + expense.amount,
    );
  }

  const variableCategoryBreakdown: CategoryAmount[] = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);

  // ── Upcoming services ──

  const upcomingServicesCount = upcomingServices.length;
  const upcomingServicesCost = upcomingServices.reduce(
    (sum, s) => sum + (s.lastAmount ?? 0),
    0,
  );

  // ── Frequent expenses (grouped by normalized title) ──

  const titleGroups = new Map<string, { title: string; totalAmount: number; count: number; category: ExpenseCategory }>();
  for (const expense of thisMonthExpenses) {
    const normalized = normalizeTitle(expense.title);
    const existing = titleGroups.get(normalized);
    if (existing) {
      existing.totalAmount += expense.amount;
      existing.count += 1;
    } else {
      titleGroups.set(normalized, {
        title: expense.title,
        totalAmount: expense.amount,
        count: 1,
        category: expense.category,
      });
    }
  }

  const frequentExpenses: FrequentExpense[] = Array.from(titleGroups.values())
    .filter((g) => g.count >= MIN_FREQUENCY_COUNT)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_FREQUENT_EXPENSES)
    .map((g) => ({
      title: g.title,
      amount: round2(g.totalAmount / g.count),
      category: g.category,
      count: g.count,
    }));

  // ── Spending tips ──

  const spendingTips = computeSpendingTips(
    variableThisMonthExpenses,
    variableThisMonth,
    variableCategoryBreakdown,
  );

  // ── 3-month average ──

  const variableMonthlyAverage = computeVariableMonthlyAverage(
    variableLastMonthFull,
    twoMonthsAgoSummary,
    threeMonthsAgoSummary,
  );

  const vsAverageResult = variableMonthlyAverage
    ? computeTrend(variableProjected, variableMonthlyAverage)
    : { trend: "flat" as const, percent: 0 };

  // ── Historical daily average ──

  const historicalDailyAverage = computeHistoricalDailyAverage(
    variableLastMonthFull,
    lastMonthTotalDays,
    twoMonthsAgoSummary,
    threeMonthsAgoSummary,
  );

  const dailyVsAverageResult = historicalDailyAverage
    ? computeTrend(variableDailyAverage, historicalDailyAverage)
    : { trend: "flat" as const, percent: 0 };

  // ── Month status ──

  const monthStatus = computeMonthStatus(vsAverageResult.trend, vsAverageResult.percent);

  const topGrowthCategory = computeTopGrowthCategory(
    variableCategoryBreakdown,
    variableLastMonth,
    twoMonthsAgoSummary,
    threeMonthsAgoSummary,
  );

  // ── Fixed count & percent ──

  const fixedExpensesCount = fixedThisMonthExpenses.length;
  const fixedPercentOfTotal = thisMonthTotal > 0
    ? Math.round((fixedThisMonth / thisMonthTotal) * 100)
    : 0;

  return {
    variableDailyAverage,
    variableProjected,

    fixedThisMonth: round2(fixedThisMonth),
    expectedFixedMonthly,

    thisMonthTotal: round2(thisMonthTotal),
    projectedTotal,

    upcomingServicesCost: round2(upcomingServicesCost),
    upcomingServicesCount,

    frequentExpenses,
    spendingTips,

    daysElapsedThisMonth,
    totalDaysInMonth,

    variableMonthlyAverage,
    variableVsAverageTrend: vsAverageResult.trend,
    variableVsAveragePercent: vsAverageResult.percent,

    monthStatus,

    historicalDailyAverage,
    dailyVsAverageTrend: dailyVsAverageResult.trend,
    dailyVsAveragePercent: dailyVsAverageResult.percent,

    topGrowthCategory,

    fixedExpensesCount,
    fixedPercentOfTotal,
  };
}
