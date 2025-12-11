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
        const { modified: newRule } = transaction.mutations[0];
        await createRule({
          data: {
            id: newRule.id,
            rule: newRule.rule,
            category: newRule.category,
          },
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deleteRule({ data: { id: original.id } });
      },
    }),
  ),
);
