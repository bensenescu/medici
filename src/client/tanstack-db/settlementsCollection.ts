import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllSettlements,
  createSettlement,
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
      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await createSettlement({
            data: {
              poolId: mutation.modified.poolId,
              toUserId: mutation.modified.toUserId,
              amount: mutation.modified.amount,
              note: mutation.modified.note ?? undefined,
            },
          });
        }
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await deleteSettlement({
            data: { settlementId: mutation.original.id },
          });
        }
      },
    }),
  ),
);
