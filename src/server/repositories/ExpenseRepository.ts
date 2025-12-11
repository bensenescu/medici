/**
 * Expense Repository - Pure data access for expenses.
 * Returns null/empty on not found (does not throw).
 */

import { db } from "@/db";
import { expenses, type NewExpense } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export class ExpenseRepository {
  /**
   * Find an expense by ID.
   */
  static async findById(expenseId: string) {
    return db.query.expenses.findFirst({
      where: eq(expenses.id, expenseId),
    });
  }

  /**
   * Find all expenses for a pool.
   */
  static async findAllByPool(poolId: string) {
    return db.query.expenses.findMany({
      where: eq(expenses.poolId, poolId),
      orderBy: [desc(expenses.createdAt)],
    });
  }

  /**
   * Find all expenses for a pool with relations.
   */
  static async findAllByPoolWithRelations(poolId: string) {
    return db.query.expenses.findMany({
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
  }

  /**
   * Find all expenses for multiple pools with relations.
   */
  static async findAllByPoolIdsWithRelations(poolIds: string[]) {
    if (poolIds.length === 0) return [];
    return db.query.expenses.findMany({
      where: inArray(expenses.poolId, poolIds),
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
  }

  /**
   * Find all expenses for a pool with line items only.
   */
  static async findAllByPoolWithLineItems(poolId: string) {
    return db.query.expenses.findMany({
      where: eq(expenses.poolId, poolId),
      with: {
        lineItems: true,
      },
    });
  }

  /**
   * Find expense IDs for a pool.
   */
  static async findIdsByPool(poolId: string) {
    const result = await db.query.expenses.findMany({
      where: eq(expenses.poolId, poolId),
      columns: { id: true },
    });
    return result.map((e) => e.id);
  }

  /**
   * Create a new expense.
   */
  static async create(data: NewExpense) {
    await db.insert(expenses).values(data);
    return data;
  }

  /**
   * Update an expense by ID.
   */
  static async update(
    expenseId: string,
    data: Partial<
      Pick<
        NewExpense,
        | "name"
        | "amount"
        | "category"
        | "description"
        | "notes"
        | "isSettled"
        | "updatedAt"
      >
    >,
  ) {
    await db.update(expenses).set(data).where(eq(expenses.id, expenseId));
  }

  /**
   * Mark all unsettled expenses in a pool as settled.
   */
  static async settleAllByPool(poolId: string, updatedAt: string) {
    await db
      .update(expenses)
      .set({ isSettled: true, updatedAt })
      .where(and(eq(expenses.poolId, poolId), eq(expenses.isSettled, false)));
  }

  /**
   * Delete an expense by ID.
   */
  static async delete(expenseId: string) {
    await db.delete(expenses).where(eq(expenses.id, expenseId));
  }
}
