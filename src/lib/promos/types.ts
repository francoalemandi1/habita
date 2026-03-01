/**
 * Shared types for the bank promotions pipeline.
 */

/** Single promotion from the promoarg.com API. */
export interface PromoargPromotion {
  id: string;
  bankId: string;
  storeName: string;
  title: string;
  description: string;
  discountPercentage: number | null;
  capAmount: number | null;
  validDays: string[];
  validUntil: string | null;
  categories: string[];
  imageUrl: string | null;
  paymentMethods: string[];
  eligiblePlans: string[];
  detailsUrl: string | null;
}

/** Paginated API response from promoarg.com. */
export interface PromoargResponse {
  promotions: PromoargPromotion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** All promos fetched for one store. */
export interface StorePromosResult {
  storeName: string;
  promos: PromoargPromotion[];
}

/** Pipeline outcome for logging. */
export interface PromosPipelineOutcome {
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  promosFound: number;
  promosCreated: number;
  durationMs: number;
  errorMessage?: string;
}
