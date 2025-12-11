import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import { getAllSettlements } from "@/serverFunctions/settlements";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client";
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
      // Settlements are created/deleted via server functions
      // The collection will be refetched after mutations
    }),
  ),
);
