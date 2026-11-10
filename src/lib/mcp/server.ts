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

export function createAhorraMcpServer(identity?: McpIdentity | null): McpServer {
  const server = new McpServer({ name: "habita-ahorra", version: "1.0.0" });

  server.registerTool(
    "search_product_prices",
    {
      description:
        "Search Argentine supermarkets for a product by name and return the best-priced matches per store, in ARS. Spanish product terms work best (e.g. 'leche entera', 'papel higienico').",
      inputSchema: searchProductPricesInputSchema,
    },
    handleSearchProductPrices,
  );

  server.registerTool(
    "compare_cart",
    {
      description:
        "Compare the total cost of a shopping list (multiple products with quantities) across Argentine supermarkets, in ARS. Returns one cart per store with totals, found/missing items, and which store is cheapest per item.",
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
