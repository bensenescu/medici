import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import { getAllRules, createRule, deleteRule } from "@/serverFunctions/rules";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client/lazyInitForWorkers";
import type { ExpenseCategoryRule } from "@/types";

export const rulesCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions<ExpenseCategoryRule, string>({
      queryKey: ["rules"],
      queryFn: async () => {
        const result = await getAllRules();
        return result.rules;
      },
      queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await createRule({
            data: {
              id: mutation.modified.id,
              rule: mutation.modified.rule,
              category: mutation.modified.category,
            },
          });
        }
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await deleteRule({ data: { id: mutation.original.id } });
        }
      },
    }),
  ),
);
