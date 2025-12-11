import { z } from "zod";
import { expenseCategories } from "../index";

export const lineItemSchema = z.object({
  id: z.string().uuid(),
  debtorUserId: z.string(),
  amount: z.number().min(0),
});

export const createExpenseSchema = z.object({
  id: z.string().uuid(),
  poolId: z.string().uuid(),
  name: z.string().min(1, "Expense name is required").max(255, "Name too long"),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum(expenseCategories).default("miscellaneous"),
  description: z.string().max(500, "Description too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item required"),
});

export const updateExpenseSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, "Expense name is required")
    .max(255, "Name too long")
    .optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  category: z.enum(expenseCategories).optional(),
  description: z
    .string()
    .max(500, "Description too long")
    .optional()
    .nullable(),
  notes: z.string().max(1000, "Notes too long").optional().nullable(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "At least one line item required")
    .optional(),
});

export const deleteExpenseSchema = z.object({
  id: z.string().uuid(),
});

export const settleUpPoolSchema = z.object({
  poolId: z.string().uuid(),
});

export type CreateExpense = z.infer<typeof createExpenseSchema>;
export type UpdateExpense = z.infer<typeof updateExpenseSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;
