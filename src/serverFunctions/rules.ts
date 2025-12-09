import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client";
import { db } from "@/db";
import { expenseCategoryRules, expenseCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// GET ALL RULES (for current user)
// ============================================================================

export const getAllRules = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const userId = context.userId;

    const rules = await db.query.expenseCategoryRules.findMany({
      where: eq(expenseCategoryRules.userId, userId),
    });

    return { rules };
  });

// ============================================================================
// CREATE RULE
// ============================================================================

export const createRule = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string(),
        rule: z.string().min(1), // The text pattern to match
        category: z.enum(expenseCategories),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const now = new Date().toISOString();

    await db.insert(expenseCategoryRules).values({
      id: data.id,
      userId,
      rule: data.rule.toLowerCase(), // Store lowercase for case-insensitive matching
      category: data.category,
      createdAt: now,
    });

    return {
      rule: {
        id: data.id,
        userId,
        rule: data.rule.toLowerCase(),
        category: data.category,
        createdAt: now,
      },
    };
  });

// ============================================================================
// DELETE RULE
// ============================================================================

export const deleteRule = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Verify rule belongs to user
    const rule = await db.query.expenseCategoryRules.findFirst({
      where: eq(expenseCategoryRules.id, data.id),
    });

    if (!rule) {
      throw new Response("Rule not found", { status: 404 });
    }

    if (rule.userId !== userId) {
      throw new Response("Not authorized to delete this rule", { status: 403 });
    }

    await db
      .delete(expenseCategoryRules)
      .where(eq(expenseCategoryRules.id, data.id));

    return { success: true };
  });

// ============================================================================
// APPLY RULES TO EXPENSE NAME
// Returns the suggested category based on user's rules
// ============================================================================

export const suggestCategory = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ expenseName: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Get user's rules
    const rules = await db.query.expenseCategoryRules.findMany({
      where: eq(expenseCategoryRules.userId, userId),
    });

    const expenseNameLower = data.expenseName.toLowerCase();

    // Find first matching rule
    for (const rule of rules) {
      if (expenseNameLower.includes(rule.rule)) {
        return { category: rule.category };
      }
    }

    // No matching rule found
    return { category: null };
  });
