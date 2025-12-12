import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllPools,
  createPool,
  updatePool,
  deletePool,
} from "@/serverFunctions/pools";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client/lazyInitForWorkers";
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
        for (const mutation of transaction.mutations) {
          await createPool({ data: mutation.modified });
        }
      },
      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await updatePool({ data: mutation.modified });
        }
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await deletePool({ data: { id: mutation.original.id } });
        }
      },
    }),
  ),
);
