/**
 * MCP prompt: monthly_shopping.
 *
 * Instructs the assistant to build a realistic monthly grocery list using
 * get_product_catalog, price it with a single compare_cart call, and present
 * a savings-focused recommendation.
 */

import { z } from "zod";

import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";

export const monthlyShoppingArgsSchema = {
  household: z.string().describe("Who lives there, e.g. 'two adults in their 20s'."),
  diet: z.string().optional().describe("Dietary notes, e.g. 'vegetarian', 'no dairy'."),
  budget: z.string().optional().describe("Monthly budget in ARS, if any."),
  city: z.string().optional().describe("Argentine city, to restrict stores with local coverage."),
  paymentMethods: z.string().optional().describe("Comma-separated bank/wallet names available, e.g. 'Galicia, MODO'."),
};

export function buildMonthlyShoppingPrompt(args: {
  household: string;
  diet?: string;
  budget?: string;
  city?: string;
  paymentMethods?: string;
}): GetPromptResult {
  const dietLine = args.diet ? `Diet: ${args.diet}.` : "No specific diet constraints.";
  const budgetLine = args.budget
    ? `Monthly budget: ARS ${args.budget}. If the cheapest total exceeds this, suggest specific cuts.`
    : "No stated budget — just optimize for savings.";
  const cityLine = args.city ? `City: ${args.city}.` : "No city given — search all stores.";
  const paymentMethodsLine = args.paymentMethods
    ? `Available payment methods: ${args.paymentMethods}.`
    : "No payment methods given — don't filter promos by payment method.";

  const text = `Build a monthly grocery shopping plan for: ${args.household}.
${dietLine}
${budgetLine}
${cityLine}
${paymentMethodsLine}

Steps:
1. Call get_product_catalog to see available products and their catalog terms.
2. Build a realistic MONTHLY shopping list (quantities sized for a full month, at most 40 items), preferring catalog "term" values for better price matching, adjusted for the household and diet above.
3. Call compare_cart exactly once with that list of items, plus city and paymentMethods (comma-separated list, split into an array) if given.
4. Present a rich document (or artifact) with:
   - The monthly list (item, quantity).
   - Per-store totals, both with and without promos (totalPrice vs bestTotal).
   - The recommended store + payment method (from cheapestWithPromos), with estimated savings vs the most expensive store.
   - Items not found (notFound) and stores that failed (unavailableStores).
   - The promo disclaimer, verbatim.
5. If a budget was given and the cheapest total exceeds it, suggest specific items to cut or substitute.`;

  return {
    description: "Build and price a realistic monthly grocery shopping list for a household.",
    messages: [{ role: "user", content: { type: "text", text } }],
  };
}
