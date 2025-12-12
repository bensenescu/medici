import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllPoolMembers,
  type PoolMemberWithUser,
} from "@/serverFunctions/poolMembers";
import { removeMemberFromPool } from "@/serverFunctions/pools";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client/lazyInitForWorkers";

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
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          await removeMemberFromPool({
            data: {
              poolId: mutation.original.poolId,
              memberId: mutation.original.userId,
            },
          });
        }
      },
    }),
  ),
);
