import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client";
import { db } from "@/db";
import { settlements, poolMemberships, expenses } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { BalanceService } from "@/services/BalanceService";

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
    const userId = context.userId; // the payer (debtor)

    // Verify user is a member of the pool
    const membership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, data.poolId),
        eq(poolMemberships.userId, userId),
      ),
    });

    if (!membership) {
      throw new Response("Not a member of this pool", { status: 403 });
    }

    // Verify the recipient is also a member
    const recipientMembership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, data.poolId),
        eq(poolMemberships.userId, data.toUserId),
      ),
    });

    if (!recipientMembership) {
      throw new Response("Recipient is not a member of this pool", {
        status: 400,
      });
    }

    // Cannot pay yourself
    if (userId === data.toUserId) {
      throw new Response("Cannot record a payment to yourself", {
        status: 400,
      });
    }

    // Get current balances to validate amount doesn't exceed debt
    const allMemberships = await db.query.poolMemberships.findMany({
      where: eq(poolMemberships.poolId, data.poolId),
      with: { user: true },
    });

    const poolExpenses = await db.query.expenses.findMany({
      where: eq(expenses.poolId, data.poolId),
    });

    const existingSettlements = await db.query.settlements.findMany({
      where: eq(settlements.poolId, data.poolId),
    });

    // Calculate current balances using equal splits + settlements
    const memberUserIds = allMemberships.map((m) => m.userId);
    const balanceResult = BalanceService.computePoolBalances(
      poolExpenses,
      existingSettlements,
      memberUserIds,
    );

    // Find the debt from current user to recipient
    const userDebtToRecipient = balanceResult.simplifiedDebts.find(
      (d) => d.fromUserId === userId && d.toUserId === data.toUserId,
    );

    const maxAmount = userDebtToRecipient?.amount ?? 0;

    if (data.amount > maxAmount + 0.01) {
      // Small tolerance for floating point
      throw new Response(
        `Amount exceeds what you owe. Maximum: $${maxAmount.toFixed(2)}`,
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const settlementId = crypto.randomUUID();

    // Create the settlement
    await db.insert(settlements).values({
      id: settlementId,
      poolId: data.poolId,
      fromUserId: userId,
      toUserId: data.toUserId,
      amount: data.amount,
      note: data.note || null,
      createdAt: now,
      createdByUserId: userId,
    });

    // Check if pool is now fully settled and auto-settle if so
    const updatedSettlements = await db.query.settlements.findMany({
      where: eq(settlements.poolId, data.poolId),
    });

    const updatedBalances = BalanceService.computePoolBalances(
      poolExpenses,
      updatedSettlements,
      memberUserIds,
    );

    // If all balances are zero (within tolerance), auto-settle all expenses
    const allSettled = updatedBalances.memberBalances.every(
      (b) => Math.abs(b.balance) < 0.01,
    );

    if (allSettled && poolExpenses.some((e) => !e.isSettled)) {
      // Mark all expenses as settled
      await db
        .update(expenses)
        .set({ isSettled: true, updatedAt: now })
        .where(
          and(eq(expenses.poolId, data.poolId), eq(expenses.isSettled, false)),
        );

      // Delete settlements since expenses are now settled
      await db.delete(settlements).where(eq(settlements.poolId, data.poolId));

      return { success: true, settlementId, poolSettled: true };
    }

    return { success: true, settlementId, poolSettled: false };
  });

// ============================================================================
// GET ALL SETTLEMENTS (for current user's pools)
// ============================================================================

export const getAllSettlements = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const userId = context.userId;

    // Get all pools the user is a member of
    const userMemberships = await db.query.poolMemberships.findMany({
      where: eq(poolMemberships.userId, userId),
      columns: { poolId: true },
    });

    const poolIds = userMemberships.map((m) => m.poolId);

    if (poolIds.length === 0) {
      return { settlements: [] };
    }

    // Get all settlements from those pools
    const allSettlements = [];
    for (const poolId of poolIds) {
      const poolSettlements = await db.query.settlements.findMany({
        where: eq(settlements.poolId, poolId),
        orderBy: [desc(settlements.createdAt)],
      });
      allSettlements.push(...poolSettlements);
    }

    return { settlements: allSettlements };
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
    const userId = context.userId;

    // Verify user is a member
    const membership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, data.poolId),
        eq(poolMemberships.userId, userId),
      ),
    });

    if (!membership) {
      throw new Response("Not a member of this pool", { status: 403 });
    }

    const poolSettlements = await db.query.settlements.findMany({
      where: eq(settlements.poolId, data.poolId),
      with: {
        fromUser: true,
        toUser: true,
        createdBy: true,
      },
      orderBy: [desc(settlements.createdAt)],
    });

    return { settlements: poolSettlements };
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
    const userId = context.userId;

    // Get the settlement
    const settlement = await db.query.settlements.findFirst({
      where: eq(settlements.id, data.settlementId),
    });

    if (!settlement) {
      throw new Response("Settlement not found", { status: 404 });
    }

    // Check if user can delete: must be creator OR pool admin
    const membership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, settlement.poolId),
        eq(poolMemberships.userId, userId),
      ),
    });

    if (!membership) {
      throw new Response("Not a member of this pool", { status: 403 });
    }

    const canDelete =
      settlement.createdByUserId === userId || membership.role === "ADMIN";

    if (!canDelete) {
      throw new Response(
        "Only the creator or pool admin can delete this settlement",
        { status: 403 },
      );
    }

    await db.delete(settlements).where(eq(settlements.id, data.settlementId));

    return { success: true };
  });
