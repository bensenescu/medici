import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client";
import { db } from "@/db";
import { expenseLineItems, expenses, poolMemberships } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// ============================================================================
// GET ALL LINE ITEMS (for current user's pools)
// ============================================================================

export const getAllLineItems = createServerFn()
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
      return { lineItems: [] };
    }

    // Get all expense IDs from those pools
    const poolExpenses = await db.query.expenses.findMany({
      where: inArray(expenses.poolId, poolIds),
      columns: { id: true },
    });

    const expenseIds = poolExpenses.map((e) => e.id);

    if (expenseIds.length === 0) {
      return { lineItems: [] };
    }

    // Get all line items for those expenses
    const lineItems = await db.query.expenseLineItems.findMany({
      where: inArray(expenseLineItems.expenseId, expenseIds),
    });

    return { lineItems };
  });
