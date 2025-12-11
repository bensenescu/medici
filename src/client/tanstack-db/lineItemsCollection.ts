import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import { getAllLineItems } from "@/serverFunctions/lineItems";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client";
import type { ExpenseLineItem } from "@/db/schema";

export const lineItemsCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions<ExpenseLineItem, string>({
      queryKey: ["lineItems"],
      queryFn: async () => {
        const result = await getAllLineItems();
        return result.lineItems;
      },
      queryClient,
      getKey: (item) => item.id,
      // Line items are created/updated/deleted as part of expense operations
      // so we don't need individual CRUD handlers here - the collection
      // will be refreshed when expenses change
    }),
  ),
);
