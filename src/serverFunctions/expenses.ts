import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client/useSessionTokenClientMiddleware";
import { expenseCategories } from "@/db/schema";
import { ExpenseService } from "@/server/services";

// ============================================================================
// GET ALL EXPENSES (for current user across all pools)
// ============================================================================

export const getAllExpenses = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const expenses = await ExpenseService.getAllExpenses(context.userId);
    return { expenses };
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
    const expenses = await ExpenseService.getExpensesByPool(
      context.userId,
      data.poolId,
    );
    return { expenses };
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
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const expense = await ExpenseService.createExpense(context.userId, data);
    return { expense };
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
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return ExpenseService.updateExpense(context.userId, data);
  });

// ============================================================================
// DELETE EXPENSE
// ============================================================================

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    return ExpenseService.deleteExpense(context.userId, data.id);
  });
