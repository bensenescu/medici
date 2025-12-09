import { z } from "zod";
import { expenseCategories } from "../index";

export const createRuleSchema = z.object({
  id: z.string().uuid(),
  rule: z
    .string()
    .min(1, "Rule pattern is required")
    .max(100, "Pattern too long"),
  category: z.enum(expenseCategories),
});

export const deleteRuleSchema = z.object({
  id: z.string().uuid(),
});

export type CreateRule = z.infer<typeof createRuleSchema>;
