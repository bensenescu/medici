import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client";
import { db } from "@/db";
import {
  pools,
  poolMemberships,
  expenses,
  expenseLineItems,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { BalanceService } from "@/services/BalanceService";

// ============================================================================
// GET ALL POOLS (for current user)
// ============================================================================

export const getAllPools = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const userId = context.userId;

    // Get all pools where user is a member
    const userMemberships = await db.query.poolMemberships.findMany({
      where: eq(poolMemberships.userId, userId),
      with: {
        pool: true,
      },
    });

    // For each pool, get all memberships with users
    const poolsWithMemberships = await Promise.all(
      userMemberships.map(async (membership) => {
        const allMemberships = await db.query.poolMemberships.findMany({
          where: eq(poolMemberships.poolId, membership.poolId),
          with: {
            user: true,
          },
        });

        return {
          ...membership.pool,
          memberships: allMemberships.map((m) => ({
            ...m,
            user: m.user,
          })),
        };
      }),
    );

    return { pools: poolsWithMemberships };
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

    // Get pool with all memberships
    const pool = await db.query.pools.findFirst({
      where: eq(pools.id, data.poolId),
    });

    if (!pool) {
      throw new Response("Pool not found", { status: 404 });
    }

    const allMemberships = await db.query.poolMemberships.findMany({
      where: eq(poolMemberships.poolId, data.poolId),
      with: {
        user: true,
      },
    });

    return {
      pool: {
        ...pool,
        memberships: allMemberships.map((m) => ({
          ...m,
          user: m.user,
        })),
      },
    };
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
    const userId = context.userId;
    const now = new Date().toISOString();

    // Create pool
    await db.insert(pools).values({
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    });

    // Add creator as admin with 100% default split
    await db.insert(poolMemberships).values({
      id: crypto.randomUUID(),
      poolId: data.id,
      userId: userId,
      role: "ADMIN",
      defaultSplitPercentage: 100,
      createdAt: now,
    });

    return {
      pool: {
        id: data.id,
        name: data.name,
        description: data.description,
        createdAt: now,
        updatedAt: now,
      },
    };
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
    const userId = context.userId;

    // Verify user is admin
    const membership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, data.id),
        eq(poolMemberships.userId, userId),
      ),
    });

    if (!membership || membership.role !== "ADMIN") {
      throw new Response("Must be pool admin to update", { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;

    await db.update(pools).set(updateData).where(eq(pools.id, data.id));

    return { success: true };
  });

// ============================================================================
// DELETE POOL
// ============================================================================

export const deletePool = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Verify user is admin
    const membership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, data.id),
        eq(poolMemberships.userId, userId),
      ),
    });

    if (!membership || membership.role !== "ADMIN") {
      throw new Response("Must be pool admin to delete", { status: 403 });
    }

    // Delete pool (cascade will handle memberships, expenses, line items)
    await db.delete(pools).where(eq(pools.id, data.id));

    return { success: true };
  });

// ============================================================================
// SETTLE UP POOL
// ============================================================================

export const settleUpPool = createServerFn({ method: "POST" })
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

    const now = new Date().toISOString();

    // Mark all expenses in pool as settled
    await db
      .update(expenses)
      .set({ isSettled: true, updatedAt: now })
      .where(
        and(eq(expenses.poolId, data.poolId), eq(expenses.isSettled, false)),
      );

    // Mark all line items for expenses in this pool as settled
    const poolExpenses = await db.query.expenses.findMany({
      where: eq(expenses.poolId, data.poolId),
      columns: { id: true },
    });

    const expenseIds = poolExpenses.map((e) => e.id);

    if (expenseIds.length > 0) {
      // SQLite doesn't support IN with subquery easily, so we update each
      for (const expenseId of expenseIds) {
        await db
          .update(expenseLineItems)
          .set({ isSettled: true })
          .where(
            and(
              eq(expenseLineItems.expenseId, expenseId),
              eq(expenseLineItems.isSettled, false),
            ),
          );
      }
    }

    return { success: true };
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
    const userId = context.userId;

    // Verify requester is admin
    const membership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, data.poolId),
        eq(poolMemberships.userId, userId),
      ),
    });

    if (!membership || membership.role !== "ADMIN") {
      throw new Response("Must be pool admin to add members", { status: 403 });
    }

    // Check if friend is already a member
    const existingMembership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, data.poolId),
        eq(poolMemberships.userId, data.friendId),
      ),
    });

    if (existingMembership) {
      throw new Response("User is already a member of this pool", {
        status: 400,
      });
    }

    // Add new member as participant
    await db.insert(poolMemberships).values({
      id: crypto.randomUUID(),
      poolId: data.poolId,
      userId: data.friendId,
      role: "PARTICIPANT",
      defaultSplitPercentage: 0, // Will need to be recalculated
      createdAt: new Date().toISOString(),
    });

    return { success: true };
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
    const userId = context.userId;

    // Verify requester is admin
    const membership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, data.poolId),
        eq(poolMemberships.userId, userId),
      ),
    });

    if (!membership || membership.role !== "ADMIN") {
      throw new Response("Must be pool admin to remove members", {
        status: 403,
      });
    }

    // Can't remove yourself if you're the only admin
    if (data.memberId === userId) {
      const adminCount = await db.query.poolMemberships.findMany({
        where: and(
          eq(poolMemberships.poolId, data.poolId),
          eq(poolMemberships.role, "ADMIN"),
        ),
      });

      if (adminCount.length === 1) {
        throw new Response("Cannot remove the only admin from pool", {
          status: 400,
        });
      }
    }

    // Remove member
    await db
      .delete(poolMemberships)
      .where(
        and(
          eq(poolMemberships.poolId, data.poolId),
          eq(poolMemberships.userId, data.memberId),
        ),
      );

    return { success: true };
  });

// ============================================================================
// FIX MISSING LINE ITEMS
// ============================================================================

export const fixMissingLineItems = createServerFn({ method: "POST" })
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

    // Get all memberships
    const allMemberships = await db.query.poolMemberships.findMany({
      where: eq(poolMemberships.poolId, data.poolId),
    });

    const memberIds = new Set(allMemberships.map((m) => m.userId));

    // Get all expenses with their line items
    const poolExpenses = await db.query.expenses.findMany({
      where: eq(expenses.poolId, data.poolId),
      with: {
        lineItems: true,
      },
    });

    let fixedCount = 0;
    let updatedCount = 0;

    for (const expense of poolExpenses) {
      if (expense.lineItems.length === 0) {
        // No line items at all - create equal split for all current members
        const splitAmount = expense.amount / allMemberships.length;

        for (const m of allMemberships) {
          await db.insert(expenseLineItems).values({
            id: crypto.randomUUID(),
            expenseId: expense.id,
            debtorUserId: m.userId,
            amount: splitAmount,
            isSettled: expense.isSettled,
          });
        }

        fixedCount++;
      } else {
        // Line items exist - check if we need to add new members
        const existingDebtorIds = new Set(
          expense.lineItems.map((li) => li.debtorUserId),
        );
        const missingMemberIds = allMemberships.filter(
          (m) => !existingDebtorIds.has(m.userId),
        );

        if (missingMemberIds.length > 0) {
          // Recalculate split amount for ALL members (including existing)
          const newSplitAmount = expense.amount / allMemberships.length;

          // Delete existing line items
          await db
            .delete(expenseLineItems)
            .where(eq(expenseLineItems.expenseId, expense.id));

          // Create new line items for all members with equal split
          for (const m of allMemberships) {
            await db.insert(expenseLineItems).values({
              id: crypto.randomUUID(),
              expenseId: expense.id,
              debtorUserId: m.userId,
              amount: newSplitAmount,
              isSettled: expense.isSettled,
            });
          }

          updatedCount++;
        }
      }
    }

    return { fixedCount, updatedCount, totalExpenses: poolExpenses.length };
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

    // Get all memberships with user info
    const allMemberships = await db.query.poolMemberships.findMany({
      where: eq(poolMemberships.poolId, data.poolId),
      with: {
        user: true,
      },
    });

    // Get all expenses with line items
    const poolExpenses = await db.query.expenses.findMany({
      where: eq(expenses.poolId, data.poolId),
      with: {
        paidBy: true,
        lineItems: true,
      },
      orderBy: [desc(expenses.createdAt)],
    });

    // Build users map for display names
    const usersMap = new Map(
      allMemberships.map((m) => [
        m.userId,
        {
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
        },
      ]),
    );

    // Calculate balances
    const memberUserIds = allMemberships.map((m) => m.userId);
    const balanceResult = BalanceService.computePoolBalances(
      poolExpenses,
      memberUserIds,
      usersMap,
    );

    return {
      balances: balanceResult,
    };
  });
