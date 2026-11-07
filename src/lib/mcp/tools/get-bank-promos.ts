/**
 * MCP tool: get_bank_promos.
 *
 * Returns active bank/wallet discounts at Argentine supermarkets, fetched
 * live from promoarg.com (not the per-household BankPromo table).
 */

import { z } from "zod";

import { SUPERMARKET_STORES } from "@/lib/vtex-client";
import { loadPromoCatalog, isPromoExpired, promoAppliesOnDay, matchesBankFilter } from "../promo-catalog";
import { WEEKDAYS, getTodayDayNameInBuenosAires } from "../weekday";

import type { CachedPromo } from "../promo-catalog";
import type { Weekday } from "../weekday";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const MAX_RESULTS = 50;

function firstStoreName(): string {
  const [first] = SUPERMARKET_STORES;
  if (!first) throw new Error("SUPERMARKET_STORES must not be empty");
  return first.name;
}

const storeNameEnum = z.enum([firstStoreName(), ...SUPERMARKET_STORES.slice(1).map((s) => s.name)]);

export const getBankPromosInputSchema = {
  store: storeNameEnum.optional().describe("Restrict to this supermarket chain."),
  bank: z
    .string()
    .trim()
    .max(40)
    .optional()
    .describe("Bank or wallet name to filter by (e.g. 'Galicia', 'MODO'). Case and accent insensitive."),
  day: z
    .enum(WEEKDAYS)
    .optional()
    .describe("Spanish weekday to filter by. Defaults to today in Argentina (America/Argentina/Buenos_Aires)."),
};

export interface BankPromoOutput {
  store: string;
  bank: string;
  discountPercent: number;
  days: string[];
  paymentMethods: string[];
  capAmount: number | null;
  validUntil: string | null;
  title: string | null;
  sourceUrl: string | null;
}

export interface GetBankPromosResult {
  promos: BankPromoOutput[];
  truncated: boolean;
}

function toOutput(promo: CachedPromo): BankPromoOutput {
  return {
    store: promo.storeName,
    bank: promo.bankDisplayName,
    discountPercent: promo.discountPercent,
    days: promo.daysOfWeek,
    paymentMethods: promo.paymentMethods,
    capAmount: promo.capAmount,
    validUntil: promo.validUntil,
    title: promo.title,
    sourceUrl: promo.sourceUrl,
  };
}

export async function runGetBankPromos(input: {
  store?: string;
  bank?: string;
  day?: Weekday;
}): Promise<GetBankPromosResult> {
  const now = new Date();
  const day = input.day ?? getTodayDayNameInBuenosAires();

  const catalog = await loadPromoCatalog();

  const filtered = catalog.filter((promo) => {
    if (isPromoExpired(promo, now)) return false;
    if (input.store && promo.storeName !== input.store) return false;
    if (input.bank && !matchesBankFilter(promo, input.bank)) return false;
    if (!promoAppliesOnDay(promo, day)) return false;
    return true;
  });

  filtered.sort((a, b) => b.discountPercent - a.discountPercent);

  const truncated = filtered.length > MAX_RESULTS;
  const promos = filtered.slice(0, MAX_RESULTS).map(toOutput);

  return { promos, truncated };
}

export async function handleGetBankPromos(args: {
  store?: string;
  bank?: string;
  day?: Weekday;
}): Promise<CallToolResult> {
  try {
    const result = await runGetBankPromos(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    console.error("[mcp/get_bank_promos] Tool failed:", error);
    return {
      content: [{ type: "text", text: "Failed to fetch bank promos. Please try again." }],
      isError: true,
    };
  }
}
