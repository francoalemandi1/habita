/**
 * Factory for a fresh, stateless "habita-ahorra" MCP server instance.
 * Call this once per request — do not share a server across requests.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { searchProductPricesInputSchema, handleSearchProductPrices } from "./tools/search-product-prices";
import { compareCartInputSchema, handleCompareCart } from "./tools/compare-cart";
import { getBankPromosInputSchema, handleGetBankPromos } from "./tools/get-bank-promos";
import { getProductCatalogInputSchema, handleGetProductCatalog } from "./tools/get-product-catalog";
import { monthlyShoppingArgsSchema, buildMonthlyShoppingPrompt } from "./prompts/monthly-shopping";
import { registerHouseholdTools } from "./household/register";

import type { McpIdentity } from "./identity";

const SHOPPING_INSTRUCTIONS = `Habita Ahorrá compares grocery prices and bank promos across Argentine supermarkets.

Building or pricing a shopping list or cart (e.g. "armame la compra del mes"):
1. Before pricing, ask the user in ONE short message for whatever you don't know yet: their city, which banks/cards/wallets they can pay with (e.g. Galicia, MODO, Mercado Pago), and anything that changes the list (who lives there, pets, diet, what to leave out, budget). Skip what they already told you. If they'd rather not answer, continue without it.
2. Call get_product_catalog once and prefer its "term" values.
3. Price the WHOLE list with a single compare_cart call (up to 40 items), passing city and paymentMethods. Never price a list item by item with search_product_prices: it is slow and hits the rate limit.
4. Use search_product_prices only for a single product the user asks about, or to retry a few items compare_cart returned in notFound.`;

const HOUSEHOLD_INSTRUCTIONS = `

This connection can also read and edit the user's Habita household. Call get_household first: it returns the household city, so you don't need to ask for it. To save a list, use add_shopping_list_items in one batch.`;

function buildInstructions(identity: McpIdentity | null | undefined): string {
  return identity?.scopes.has("habita") ? SHOPPING_INSTRUCTIONS + HOUSEHOLD_INSTRUCTIONS : SHOPPING_INSTRUCTIONS;
}

export function createAhorraMcpServer(identity?: McpIdentity | null): McpServer {
  const server = new McpServer({ name: "habita-ahorra", version: "1.0.0" }, { instructions: buildInstructions(identity) });

  server.registerTool(
    "search_product_prices",
    {
      description:
        "Search Argentine supermarkets for ONE product by name and return the best-priced matches per store, in ARS. Spanish product terms work best (e.g. 'leche entera', 'papel higienico'). For a shopping list or cart, use compare_cart once with all items instead of calling this per item.",
      inputSchema: searchProductPricesInputSchema,
    },
    handleSearchProductPrices,
  );

  server.registerTool(
    "compare_cart",
    {
      description:
        "Compare the total cost of a whole shopping list (up to 40 products with quantities) across Argentine supermarkets in ONE call, in ARS, including bank promos for the given paymentMethods and day. Returns one cart per store with totals, found/missing items, and which store is cheapest per item. This is the tool for building or pricing a cart.",
      inputSchema: compareCartInputSchema,
    },
    handleCompareCart,
  );

  server.registerTool(
    "get_bank_promos",
    {
      description:
        "Get active bank and digital wallet discounts (e.g. MODO, Mercado Pago, Banco Galicia) at Argentine supermarkets. Filter by store, bank/wallet name, or day of the week (defaults to today in Argentina).",
      inputSchema: getBankPromosInputSchema,
    },
    handleGetBankPromos,
  );

  server.registerTool(
    "get_product_catalog",
    {
      description:
        "Get Habita's curated Argentine grocery product catalog. Use the returned `term` values as `term` in compare_cart for better price matching than a freeform guess.",
      inputSchema: getProductCatalogInputSchema,
    },
    handleGetProductCatalog,
  );

  server.registerPrompt(
    "monthly_shopping",
    {
      title: "Monthly shopping plan",
      description: "Build and price a realistic monthly grocery shopping list for a household, with bank promo savings.",
      argsSchema: monthlyShoppingArgsSchema,
    },
    buildMonthlyShoppingPrompt,
  );

  if (identity?.scopes.has("habita")) {
    registerHouseholdTools(server, identity);
  }

  return server;
}
