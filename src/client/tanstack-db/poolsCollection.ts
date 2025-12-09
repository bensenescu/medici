import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllPools,
  createPool,
  updatePool,
  deletePool,
} from "@/serverFunctions/pools";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client";
import type { Pool } from "@/types";

export const poolsCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions<Pool, string>({
      queryKey: ["pools"],
      queryFn: async () => {
        const result = await getAllPools();
        // Flatten: remove memberships for flat storage (they're in a separate collection)
        return result.pools.map(({ memberships, ...pool }) => pool);
      },
      queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        const { modified: newPool } = transaction.mutations[0];
        await createPool({ data: newPool });
      },
      onUpdate: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        await updatePool({ data: modified });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deletePool({ data: { id: original.id } });
      },
    }),
  ),
);
