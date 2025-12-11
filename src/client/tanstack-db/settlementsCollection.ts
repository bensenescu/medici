import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllSettlements,
  deleteSettlement,
} from "@/serverFunctions/settlements";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client/lazyInitForWorkers";
import type { Settlement } from "@/db/schema";

export const settlementsCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions<Settlement, string>({
      queryKey: ["settlements"],
      queryFn: async () => {
        const result = await getAllSettlements();
        return result.settlements;
      },
      queryClient,
      getKey: (item) => item.id,
      // Settlements are created via createOptimisticAction (see createSettlement.ts)
      // which handles the "pool fully settled" edge case with refetches
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deleteSettlement({ data: { settlementId: original.id } });
      },
    }),
  ),
);
