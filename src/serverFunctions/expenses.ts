import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client";
import { db } from "@/db";
import {
  expenses,
  expenseLineItems,
  poolMemberships,
  expenseCategories,
  expenseCategoryRules,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// ============================================================================
// GET ALL EXPENSES (for current user across all pools)
// ============================================================================

export const getAllExpenses = createServerFn()
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
      return { expenses: [] };
    }

    // Get all expenses from those pools
    const allExpenses = [];
    for (const poolId of poolIds) {
      const poolExpenses = await db.query.expenses.findMany({
        where: eq(expenses.poolId, poolId),
        with: {
          paidBy: true,
          lineItems: {
            with: {
              debtor: true,
            },
          },
        },
        orderBy: [desc(expenses.createdAt)],
      });
      allExpenses.push(...poolExpenses);
    }

    // Sort by createdAt desc
    allExpenses.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return { expenses: allExpenses };
  });

// ============================================================================
// GET EXPENSES BY POOL
// ============================================================================

export const getExpensesByPool = createServerFn()
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

    // Get all expenses for this pool
    const poolExpenses = await db.query.expenses.findMany({
      where: eq(expenses.poolId, data.poolId),
      with: {
        paidBy: true,
        lineItems: {
          with: {
            debtor: true,
          },
        },
      },
      orderBy: [desc(expenses.createdAt)],
    });

    return { expenses: poolExpenses };
  });

// ============================================================================
// CREATE EXPENSE
// ============================================================================

export const createExpense = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string(),
        poolId: z.string(),
        name: z.string().min(1),
        amount: z.number().positive(),
        category: z.enum(expenseCategories).default("miscellaneous"),
        description: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        lineItems: z.array(
          z.object({
            id: z.string(),
            debtorUserId: z.string(),
            amount: z.number(),
          }),
        ),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Verify user is a member and get all pool members
    const allMemberships = await db.query.poolMemberships.findMany({
      where: eq(poolMemberships.poolId, data.poolId),
    });

    const userMembership = allMemberships.find((m) => m.userId === userId);
    if (!userMembership) {
      throw new Response("Not a member of this pool", { status: 403 });
    }

    // Apply auto-categorization rules if category is default
    let category = data.category;
    if (category === "miscellaneous") {
      const userRules = await db.query.expenseCategoryRules.findMany({
        where: eq(expenseCategoryRules.userId, userId),
      });

      const expenseNameLower = data.name.toLowerCase();
      for (const rule of userRules) {
        if (expenseNameLower.includes(rule.rule.toLowerCase())) {
          category = rule.category;
          break;
        }
      }
    }

    // If no line items provided, auto-generate equal split among all members
    let lineItems = data.lineItems;
    if (lineItems.length === 0) {
      const splitAmount = data.amount / allMemberships.length;
      lineItems = allMemberships.map((m) => ({
        id: crypto.randomUUID(),
        debtorUserId: m.userId,
        amount: splitAmount,
      }));
    }

    // Validate line items sum to expense amount
    const lineItemTotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
    if (Math.abs(lineItemTotal - data.amount) > 0.01) {
      throw new Response(
        `Line items total (${lineItemTotal.toFixed(2)}) must equal expense amount (${data.amount.toFixed(2)})`,
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // Create expense
    await db.insert(expenses).values({
      id: data.id,
      poolId: data.poolId,
      paidByUserId: userId,
      name: data.name,
      amount: data.amount,
      category,
      description: data.description,
      notes: data.notes,
      isSettled: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create line items
    for (const li of lineItems) {
      await db.insert(expenseLineItems).values({
        id: li.id,
        expenseId: data.id,
        debtorUserId: li.debtorUserId,
        amount: li.amount,
        isSettled: false,
      });
    }

    return {
      expense: {
        id: data.id,
        poolId: data.poolId,
        paidByUserId: userId,
        name: data.name,
        amount: data.amount,
        category,
        description: data.description,
        notes: data.notes,
        isSettled: false,
        createdAt: now,
        updatedAt: now,
      },
    };
  });

// ============================================================================
// UPDATE EXPENSE
// ============================================================================

export const updateExpense = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string(),
        name: z.string().min(1).optional(),
        amount: z.number().positive().optional(),
        category: z.enum(expenseCategories).optional(),
        description: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        lineItems: z
          .array(
            z.object({
              id: z.string(),
              debtorUserId: z.string(),
              amount: z.number(),
            }),
          )
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Get the expense to verify access
    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, data.id),
    });

    if (!expense) {
      throw new Response("Expense not found", { status: 404 });
    }

    // Verify user is a member of the pool
    const membership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, expense.poolId),
        eq(poolMemberships.userId, userId),
      ),
    });

    if (!membership) {
      throw new Response("Not a member of this pool", { status: 403 });
    }

    // If updating line items, validate sum
    const newAmount = data.amount ?? expense.amount;
    if (data.lineItems) {
      const lineItemTotal = data.lineItems.reduce(
        (sum, li) => sum + li.amount,
        0,
      );
      if (Math.abs(lineItemTotal - newAmount) > 0.05) {
        throw new Response(`Line items total must equal expense amount`, {
          status: 400,
        });
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await db.update(expenses).set(updateData).where(eq(expenses.id, data.id));

    // If line items provided, replace them
    if (data.lineItems) {
      // Delete existing line items
      await db
        .delete(expenseLineItems)
        .where(eq(expenseLineItems.expenseId, data.id));

      // Insert new line items
      for (const li of data.lineItems) {
        await db.insert(expenseLineItems).values({
          id: li.id,
          expenseId: data.id,
          debtorUserId: li.debtorUserId,
          amount: li.amount,
          isSettled: false,
        });
      }
    }

    return { success: true };
  });

// ============================================================================
// DELETE EXPENSE
// ============================================================================

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Get the expense to verify access
    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, data.id),
    });

    if (!expense) {
      throw new Response("Expense not found", { status: 404 });
    }

    // Verify user is a member of the pool
    const membership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, expense.poolId),
        eq(poolMemberships.userId, userId),
      ),
    });

    if (!membership) {
      throw new Response("Not a member of this pool", { status: 403 });
    }

    // Delete expense (cascade will handle line items)
    await db.delete(expenses).where(eq(expenses.id, data.id));

    return { success: true };
  });
