/**
 * MCP tool: get_product_catalog.
 *
 * Returns Habita's curated Argentine grocery product catalog. Intended for
 * building realistic shopping lists — use `term` as the search term in
 * compare_cart for better matching than a freeform guess.
 */

import { z } from "zod";
import { GroceryCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const getProductCatalogInputSchema = {
  category: z
    .nativeEnum(GroceryCategory)
    .optional()
    .describe("Restrict to this grocery category."),
  essentialsOnly: z
    .boolean()
    .default(false)
    .describe("Only return products pre-marked as household essentials."),
};

export interface ProductCatalogOutput {
  name: string;
  category: GroceryCategory;
  isEssential: boolean;
  /** Use this as the `term` value in compare_cart for better matching. */
  term: string;
}

export async function runGetProductCatalog(input: {
  category?: GroceryCategory;
  essentialsOnly?: boolean;
}): Promise<{ products: ProductCatalogOutput[] }> {
  const products = await prisma.productCatalog.findMany({
    where: {
      isActive: true,
      ...(input.category ? { category: input.category } : {}),
      ...(input.essentialsOnly ? { isEssential: true } : {}),
    },
    select: { name: true, category: true, isEssential: true, searchTerms: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return {
    products: products.map((p) => ({
      name: p.name,
      category: p.category,
      isEssential: p.isEssential,
      term: p.searchTerms.trim() || p.name,
    })),
  };
}

export async function handleGetProductCatalog(args: {
  category?: GroceryCategory;
  essentialsOnly?: boolean;
}): Promise<CallToolResult> {
  try {
    const result = await runGetProductCatalog(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    console.error("[mcp/get_product_catalog] Tool failed:", error);
    return {
      content: [{ type: "text", text: "Failed to fetch the product catalog. Please try again." }],
      isError: true,
    };
  }
}
