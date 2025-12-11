/**
 * Expense Line Item Repository - Pure data access for expense line items.
 * Returns null/empty on not found (does not throw).
 */

import { db } from "@/db";
import { expenseLineItems, type NewExpenseLineItem } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export class ExpenseLineItemRepository {
  /**
   * Find all line items for an expense.
   */
  static async findAllByExpense(expenseId: string) {
    return db.query.expenseLineItems.findMany({
      where: eq(expenseLineItems.expenseId, expenseId),
    });
  }

  /**
   * Create a new line item.
   */
  static async create(data: NewExpenseLineItem) {
    await db.insert(expenseLineItems).values(data);
    return data;
  }

  /**
   * Create multiple line items.
   */
  static async createMany(items: NewExpenseLineItem[]) {
    for (const item of items) {
      await db.insert(expenseLineItems).values(item);
    }
  }

  /**
   * Delete all line items for an expense.
   */
  static async deleteAllByExpense(expenseId: string) {
    await db
      .delete(expenseLineItems)
      .where(eq(expenseLineItems.expenseId, expenseId));
  }

  /**
   * Mark all unsettled line items for an expense as settled.
   */
  static async settleAllByExpense(expenseId: string) {
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
