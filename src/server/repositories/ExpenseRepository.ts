/**
 * Expense Repository - Pure data access for expenses.
 * Returns null/empty on not found (does not throw).
 */

import { db } from "@/db";
import { expenses, type NewExpense } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

/**
 * Find an expense by ID.
 */
async function findById(expenseId: string) {
  return db.query.expenses.findFirst({
    where: eq(expenses.id, expenseId),
  });
}

/**
 * Find all expenses for a pool.
 */
async function findAllByPool(poolId: string) {
  return db.query.expenses.findMany({
    where: eq(expenses.poolId, poolId),
    orderBy: [desc(expenses.createdAt)],
  });
}

/**
 * Find all expenses for a pool with relations.
 */
async function findAllByPoolWithRelations(poolId: string) {
  return db.query.expenses.findMany({
    where: eq(expenses.poolId, poolId),
    with: {
      paidBy: true,
    },
    orderBy: [desc(expenses.createdAt)],
  });
}

/**
 * Find all expenses for multiple pools with relations.
 */
async function findAllByPoolIdsWithRelations(poolIds: string[]) {
  if (poolIds.length === 0) return [];
  return db.query.expenses.findMany({
    where: inArray(expenses.poolId, poolIds),
    with: {
      paidBy: true,
    },
    orderBy: [desc(expenses.createdAt)],
  });
}

/**
 * Find expense IDs for a pool.
 */
async function findIdsByPool(poolId: string) {
  const result = await db.query.expenses.findMany({
    where: eq(expenses.poolId, poolId),
    columns: { id: true },
  });
  return result.map((e) => e.id);
}

/**
 * Create a new expense.
 */
async function create(data: NewExpense) {
  await db.insert(expenses).values(data);
  return data;
}

/**
 * Update an expense by ID.
 */
async function update(
  expenseId: string,
  data: Partial<
    Pick<NewExpense, "name" | "amount" | "category" | "isSettled" | "updatedAt">
  >,
) {
  await db.update(expenses).set(data).where(eq(expenses.id, expenseId));
}

/**
 * Mark all unsettled expenses in a pool as settled.
 */
async function settleAllByPool(poolId: string, updatedAt: string) {
  await db
    .update(expenses)
    .set({ isSettled: true, updatedAt })
    .where(and(eq(expenses.poolId, poolId), eq(expenses.isSettled, false)));
}

/**
 * Delete an expense by ID.
 */
async function deleteExpense(expenseId: string) {
  await db.delete(expenses).where(eq(expenses.id, expenseId));
}

export const ExpenseRepository = {
  findById,
  findAllByPool,
  findAllByPoolWithRelations,
  findAllByPoolIdsWithRelations,
  findIdsByPool,
  create,
  update,
  settleAllByPool,
  delete: deleteExpense,
};
