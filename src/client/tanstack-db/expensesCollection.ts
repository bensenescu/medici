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
        for (const mutation of transaction.mutations) {
          await createExpense({ data: mutation.modified });
        }
      },
      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await updateExpense({ data: mutation.modified });
        }
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await deleteExpense({ data: { id: mutation.original.id } });
        }
      },
    }),
  ),
);
