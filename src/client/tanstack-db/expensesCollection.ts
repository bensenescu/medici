import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/serverFunctions/expenses";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client/lazyInitForWorkers";
import type { Expense } from "@/types";

export const expensesCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions<Expense, string>({
      queryKey: ["expenses"],
      queryFn: async () => {
        const result = await getAllExpenses();
        // Flatten: remove paidBy for flat storage (balance is computed dynamically)
        return result.expenses.map(({ paidBy, ...expense }) => expense);
      },
      queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        const { modified: newExpense } = transaction.mutations[0];
        await createExpense({
          data: newExpense,
        });
      },
      onUpdate: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        await updateExpense({
          data: modified,
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deleteExpense({ data: { id: original.id } });
      },
    }),
  ),
);
