import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client/useSessionTokenClientMiddleware";
import { PoolService } from "@/server/services";

// ============================================================================
// GET ALL POOLS (for current user)
// ============================================================================

export const getAllPools = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const pools = await PoolService.getAllPools(context.userId);
    return { pools };
  });

// ============================================================================
// GET SINGLE POOL
// ============================================================================

export const getPool = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ poolId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const pool = await PoolService.getPool(context.userId, data.poolId);
    return { pool };
  });

// ============================================================================
// CREATE POOL
// ============================================================================

export const createPool = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const pool = await PoolService.createPool(context.userId, data);
    return { pool };
  });

// ============================================================================
// UPDATE POOL
// ============================================================================

export const updatePool = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return PoolService.updatePool(context.userId, data);
  });

// ============================================================================
// DELETE POOL
// ============================================================================

export const deletePool = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    return PoolService.deletePool(context.userId, data.id);
  });

// ============================================================================
// ADD MEMBER TO POOL
// ============================================================================

export const addMemberToPool = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        poolId: z.string(),
        friendId: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return PoolService.addMemberToPool(
      context.userId,
      data.poolId,
      data.friendId,
    );
  });

// ============================================================================
// REMOVE MEMBER FROM POOL
// ============================================================================

export const removeMemberFromPool = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        poolId: z.string(),
        memberId: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return PoolService.removeMemberFromPool(
      context.userId,
      data.poolId,
      data.memberId,
    );
  });

// ============================================================================
// GET POOL BALANCES
// ============================================================================

export const getPoolBalances = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ poolId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const balances = await PoolService.getPoolBalances(
      context.userId,
      data.poolId,
    );
    return { balances };
  });
