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
import { addShoppingListItemsInputSchema, handleAddShoppingListItems } from "./tools/add-shopping-list-items";
import {
  setShoppingListItemCheckedInputSchema,
  handleSetShoppingListItemChecked,
} from "./tools/set-shopping-list-item-checked";
import { completeTaskInputSchema, handleCompleteTask } from "./tools/complete-task";
import { createTaskInputSchema, handleCreateTask } from "./tools/create-task";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpIdentity } from "../identity";

const READ_ONLY_ANNOTATIONS = { readOnlyHint: true, destructiveHint: false };
const WRITE_ANNOTATIONS = { readOnlyHint: false, destructiveHint: false, idempotentHint: true };

export function registerHouseholdTools(server: McpServer, identity: McpIdentity): void {
  server.registerTool(
    "get_household",
    {
      description: "Get the user's households (id, name, city) and the members of the selected household (id, name, member type).",
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

  server.registerTool(
    "add_shopping_list_items",
    {
      description:
        "Add one or more items to the household's shared shopping list. Generate a fresh unique clientId for each item and reuse the same value on retries — a replay returns the same item instead of adding a duplicate. Adding a name that matches an existing unchecked item bumps its quantity instead of duplicating it.",
      inputSchema: addShoppingListItemsInputSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    (args) => handleAddShoppingListItems(identity, args),
  );

  server.registerTool(
    "set_shopping_list_item_checked",
    {
      description: "Check or uncheck a shopping list item. Idempotent: setting an item to its current state is a no-op.",
      inputSchema: setShoppingListItemCheckedInputSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    (args) => handleSetShoppingListItemChecked(identity, args),
  );

  server.registerTool(
    "complete_task",
    {
      description:
        "Mark a household task assignment as completed. Idempotent: completing an already-completed assignment is a no-op success.",
      inputSchema: completeTaskInputSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    (args) => handleCompleteTask(identity, args),
  );

  server.registerTool(
    "create_task",
    {
      description:
        "Create a new household task. Generate a fresh unique idempotencyKey for each new task and reuse the same value on retries — a replay returns the same task instead of creating a duplicate. If no assignToMemberId is given, the task is auto-assigned to the best available member.",
      inputSchema: createTaskInputSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    (args) => handleCreateTask(identity, args),
  );
}
