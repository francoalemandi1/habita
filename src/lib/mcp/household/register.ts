/**
 * Registers the household read tools on a server instance for a specific
 * authenticated identity. Called from `createAhorraMcpServer` only when the
 * identity's scope includes `habita`.
 */

import { getHouseholdInputSchema, handleGetHousehold } from "./tools/get-household";
import { listMyTasksInputSchema, handleListMyTasks } from "./tools/list-my-tasks";
import { getShoppingListInputSchema, handleGetShoppingList } from "./tools/get-shopping-list";
import { getExpenseBalancesInputSchema, handleGetExpenseBalances } from "./tools/get-expense-balances";
import { listRecentExpensesInputSchema, handleListRecentExpenses } from "./tools/list-recent-expenses";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpIdentity } from "../identity";

const READ_ONLY_ANNOTATIONS = { readOnlyHint: true, destructiveHint: false };

export function registerHouseholdTools(server: McpServer, identity: McpIdentity): void {
  server.registerTool(
    "get_household",
    {
      description: "Get the user's households and the members of the selected household (id, name, member type).",
      inputSchema: getHouseholdInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) => handleGetHousehold(identity, args),
  );

  server.registerTool(
    "list_my_tasks",
    {
      description: "List the caller's pending household task assignments, ordered by due date.",
      inputSchema: listMyTasksInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) => handleListMyTasks(identity, args),
  );

  server.registerTool(
    "get_shopping_list",
    {
      description: "Get the household's shared shopping list, unchecked items first.",
      inputSchema: getShoppingListInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) => handleGetShoppingList(identity, args),
  );

  server.registerTool(
    "get_expense_balances",
    {
      description: "Get who owes whom in the household, per currency, with simplified settle-up transactions.",
      inputSchema: getExpenseBalancesInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) => handleGetExpenseBalances(identity, args),
  );

  server.registerTool(
    "list_recent_expenses",
    {
      description: "List the household's most recent expenses, newest first.",
      inputSchema: listRecentExpensesInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) => handleListRecentExpenses(identity, args),
  );
}
