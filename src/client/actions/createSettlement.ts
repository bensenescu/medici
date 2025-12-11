import { createOptimisticAction } from "@tanstack/react-db";
import {
  settlementsCollection,
  expensesCollection,
} from "@/client/tanstack-db";
import { createSettlement as createSettlementServer } from "@/serverFunctions/settlements";

type CreateSettlementParams = {
  poolId: string;
  /** Used only for optimistic UI updates. The server uses the authenticated user's ID. */
  optimisticFromUserId: string;
  toUserId: string;
  amount: number;
  note?: string;
};

/**
 * Action to create a settlement (record a payment).
 * Optimistically adds the settlement to the collection, then syncs with server.
 * If the pool becomes fully settled, all expenses are marked as settled
 * and settlements are cleared.
 */
export const createSettlement = createOptimisticAction<CreateSettlementParams>({
  onMutate: ({ poolId, optimisticFromUserId, toUserId, amount, note }) => {
    const now = new Date().toISOString();
    const settlementId = crypto.randomUUID();

    // Optimistically insert the settlement
    settlementsCollection.insert({
      id: settlementId,
      poolId,
      fromUserId: optimisticFromUserId,
      toUserId,
      amount,
      note: note || null,
      createdAt: now,
      createdByUserId: optimisticFromUserId,
    });
  },
  mutationFn: async ({ poolId, toUserId, amount, note }) => {
    const result = await createSettlementServer({
      data: {
        poolId,
        toUserId,
        amount,
        note,
      },
    });

    // Refetch to sync optimistic state with server
    // This handles the case where the pool becomes fully settled
    // and expenses/settlements are updated by the server
    await Promise.all([
      settlementsCollection.utils.refetch(),
      expensesCollection.utils.refetch(),
    ]);

    return result;
  },
});
