/**
 * Expense Service - Business logic for expenses.
 * Verifies ownership BEFORE mutations.
 * Receives userId as first parameter for all operations.
 *
 * Note: Balances are computed using equal splits among all pool members.
 * This is handled by BalanceService, not stored in the database.
 */

import type { ExpenseCategory } from "@/db/schema";
import {
  ExpenseRepository,
  PoolMembershipRepository,
  ExpenseCategoryRuleRepository,
  verifyPoolMembership,
} from "@/server/repositories";
import { applyCategoryRules } from "@/utils/categoryRules";

export interface CreateExpenseInput {
  id: string;
  poolId: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
}

export interface UpdateExpenseInput {
  id: string;
  name?: string;
  amount?: number;
  category?: ExpenseCategory;
}

/**
 * Get all expenses for a user across all their pools.
 */
async function getAllExpenses(userId: string) {
  const poolIds = await PoolMembershipRepository.findPoolIdsByUser(userId);

  if (poolIds.length === 0) {
    return [];
  }

  return ExpenseRepository.findAllByPoolIdsWithRelations(poolIds);
}

/**
 * Get all expenses for a specific pool.
 * Verifies user is a member of the pool.
 */
async function getExpensesByPool(userId: string, poolId: string) {
  await verifyPoolMembership(userId, poolId);
  return ExpenseRepository.findAllByPoolWithRelations(poolId);
}

/**
 * Create a new expense.
 * Verifies user is a member and applies auto-categorization rules.
 */
async function createExpense(userId: string, input: CreateExpenseInput) {
  await verifyPoolMembership(userId, input.poolId);

  // Apply auto-categorization rules if category is default
  let category = input.category;
  if (category === "miscellaneous") {
    const userRules = await ExpenseCategoryRuleRepository.findAllByUser(userId);
    category = applyCategoryRules(input.name, userRules, input.category);
  }

  const now = new Date().toISOString();

  const expenseData = {
    id: input.id,
    poolId: input.poolId,
    paidByUserId: userId,
    name: input.name,
    amount: input.amount,
    category,
    isSettled: false,
    createdAt: now,
    updatedAt: now,
  };

  await ExpenseRepository.create(expenseData);

  return expenseData;
}

/**
 * Update an expense.
 * Verifies user is a member of the pool.
 */
async function updateExpense(userId: string, input: UpdateExpenseInput) {
  const expense = await ExpenseRepository.findById(input.id);
  if (!expense) {
    throw new Error("Expense not found");
  }

  await verifyPoolMembership(userId, expense.poolId);

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.amount !== undefined) updateData.amount = input.amount;
  if (input.category !== undefined) updateData.category = input.category;

  await ExpenseRepository.update(input.id, updateData);

  return { success: true };
}

/**
 * Delete an expense.
 * Verifies user is a member of the pool.
 */
async function deleteExpense(userId: string, expenseId: string) {
  const expense = await ExpenseRepository.findById(expenseId);
  if (!expense) {
    throw new Error("Expense not found");
  }

  await verifyPoolMembership(userId, expense.poolId);
  await ExpenseRepository.delete(expenseId);

  return { success: true };
}

export const ExpenseService = {
  getAllExpenses,
  getExpensesByPool,
  createExpense,
  updateExpense,
  deleteExpense,
};
