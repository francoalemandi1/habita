/**
 * Shared query key factories for React Query.
 * Platform-agnostic — used by both web and mobile.
 */
export const queryKeys = {
  fund: {
    all: () => ["fund"] as const,
    detail: () => [...queryKeys.fund.all(), "detail"] as const,
  },
  events: {
    all: () => ["events"] as const,
    list: (params?: { city?: string; category?: string; q?: string }) =>
      [...queryKeys.events.all(), "list", params] as const,
    weekend: (cityId?: string) =>
      [...queryKeys.events.all(), "weekend", cityId] as const,
    pipelineStatus: () =>
      [...queryKeys.events.all(), "pipeline-status"] as const,
  },
  expenses: {
    all: () => ["expenses"] as const,
    list: () => [...queryKeys.expenses.all(), "list"] as const,
    insights: () => [...queryKeys.expenses.all(), "insights"] as const,
    balances: () => [...queryKeys.expenses.all(), "balances"] as const,
  },
  services: {
    all: () => ["services"] as const,
    list: () => [...queryKeys.services.all(), "list"] as const,
  },
  grocery: {
    all: () => ["grocery"] as const,
    shoppingPlan: () => [...queryKeys.grocery.all(), "plan"] as const,
    productSelection: () =>
      [...queryKeys.grocery.all(), "product-selection"] as const,
    deals: (category?: string) =>
      [...queryKeys.grocery.all(), "deals", category] as const,
    topDeals: () => [...queryKeys.grocery.all(), "top-deals"] as const,
  },
  saved: {
    all: () => ["saved"] as const,
    events: () => [...queryKeys.saved.all(), "events"] as const,
    recipes: () => [...queryKeys.saved.all(), "recipes"] as const,
    deals: () => [...queryKeys.saved.all(), "deals"] as const,
    carts: () => [...queryKeys.saved.all(), "carts"] as const,
  },
  cocina: {
    all: () => ["cocina"] as const,
    recipes: () => [...queryKeys.cocina.all(), "recipes"] as const,
  },
  assignments: {
    all: () => ["assignments"] as const,
    my: () => [...queryKeys.assignments.all(), "my"] as const,
  },
  tasks: {
    all: () => ["tasks"] as const,
    list: () => [...queryKeys.tasks.all(), "list"] as const,
    catalog: () => [...queryKeys.tasks.all(), "catalog"] as const,
  },
  transfers: {
    all: () => ["transfers"] as const,
    list: (type?: string) =>
      [...queryKeys.transfers.all(), type ?? "all"] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
    list: (unreadOnly?: boolean) =>
      [...queryKeys.notifications.all(), unreadOnly] as const,
  },
  members: {
    all: () => ["members"] as const,
  },
  households: {
    all: () => ["households"] as const,
  },
  stats: {
    all: () => ["stats"] as const,
    briefing: () => [...queryKeys.stats.all(), "briefing"] as const,
  },
  preferences: {
    all: () => ["preferences"] as const,
  },
  promos: {
    all: () => ["promos"] as const,
    list: () => [...queryKeys.promos.all(), "list"] as const,
    pipelineStatus: () =>
      [...queryKeys.promos.all(), "pipeline-status"] as const,
  },
  cities: {
    all: () => ["cities"] as const,
    search: (query: string) =>
      [...queryKeys.cities.all(), query] as const,
  },
  aiJobs: {
    all: () => ["ai-jobs"] as const,
    status: (jobType: string) =>
      [...queryKeys.aiJobs.all(), "status", jobType] as const,
    result: (jobId: string) =>
      [...queryKeys.aiJobs.all(), "result", jobId] as const,
  },
} as const;
