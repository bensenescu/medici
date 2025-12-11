import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllPoolMembers,
  type PoolMemberWithUser,
} from "@/serverFunctions/poolMembers";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client";

export type { PoolMemberWithUser };

export const poolMembersCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions<PoolMemberWithUser, string>({
      queryKey: ["poolMembers"],
      queryFn: async () => {
        const result = await getAllPoolMembers();
        return result.poolMembers;
      },
      queryClient,
      getKey: (item) => item.id,
      // Pool members are managed through pool operations, so we don't need
      // individual CRUD handlers here - the collection will be refreshed
      // when pool membership changes
    }),
  ),
);
