import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client/useSessionTokenClientMiddleware";
import { SettlementService } from "@/server/services";

// ============================================================================
// CREATE SETTLEMENT (Record Payment)
// ============================================================================

export const createSettlement = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        poolId: z.string(),
        toUserId: z.string(), // who is being paid (creditor)
        amount: z.number().positive(),
        note: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return SettlementService.createSettlement(context.userId, data);
  });

// ============================================================================
// GET ALL SETTLEMENTS (for current user's pools)
// ============================================================================

export const getAllSettlements = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const settlements = await SettlementService.getAllSettlements(
      context.userId,
    );
    return { settlements };
  });

// ============================================================================
// GET POOL SETTLEMENTS
// ============================================================================

export const getPoolSettlements = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ poolId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const settlements = await SettlementService.getPoolSettlements(
      context.userId,
      data.poolId,
    );
    return { settlements };
  });

// ============================================================================
// DELETE SETTLEMENT
// ============================================================================

export const deleteSettlement = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ settlementId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    return SettlementService.deleteSettlement(
      context.userId,
      data.settlementId,
    );
  });
