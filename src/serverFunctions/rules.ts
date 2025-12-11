import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client/useSessionTokenClientMiddleware";
import { expenseCategories } from "@/db/schema";
import { RuleService } from "@/server/services";

// ============================================================================
// GET ALL RULES (for current user)
// ============================================================================

export const getAllRules = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const rules = await RuleService.getAllRules(context.userId);
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
    const rule = await RuleService.createRule(context.userId, data);
    return { rule };
  });

// ============================================================================
// DELETE RULE
// ============================================================================

export const deleteRule = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    return RuleService.deleteRule(context.userId, data.id);
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
    const category = await RuleService.suggestCategory(
      context.userId,
      data.expenseName,
    );
    return { category };
  });
