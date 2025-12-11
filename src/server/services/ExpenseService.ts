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
} from "@/server/repositories";

export interface CreateExpenseInput {
  id: string;
  poolId: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  description?: string | null;
  notes?: string | null;
}

export interface UpdateExpenseInput {
  id: string;
  name?: string;
  amount?: number;
  category?: ExpenseCategory;
  description?: string | null;
  notes?: string | null;
}

export class ExpenseService {
  /**
   * Get all expenses for a user across all their pools.
   */
  static async getAllExpenses(userId: string) {
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
  static async getExpensesByPool(userId: string, poolId: string) {
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    return ExpenseRepository.findAllByPoolWithRelations(poolId);
  }

  /**
   * Create a new expense.
   * Verifies user is a member and applies auto-categorization rules.
   */
  static async createExpense(userId: string, input: CreateExpenseInput) {
    // Verify user is a member of the pool
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      input.poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    // Apply auto-categorization rules if category is default
    let category = input.category;
    if (category === "miscellaneous") {
      const userRules =
        await ExpenseCategoryRuleRepository.findAllByUser(userId);
      const expenseNameLower = input.name.toLowerCase();

      for (const rule of userRules) {
        if (expenseNameLower.includes(rule.rule.toLowerCase())) {
          category = rule.category;
          break;
        }
      }
    }

    const now = new Date().toISOString();

    // Create expense
    await ExpenseRepository.create({
      id: input.id,
      poolId: input.poolId,
      paidByUserId: userId,
      name: input.name,
      amount: input.amount,
      category,
      description: input.description,
      notes: input.notes,
      isSettled: false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: input.id,
      poolId: input.poolId,
      paidByUserId: userId,
      name: input.name,
      amount: input.amount,
      category,
      description: input.description,
      notes: input.notes,
      isSettled: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update an expense.
   * Verifies user is a member of the pool.
   */
  static async updateExpense(userId: string, input: UpdateExpenseInput) {
    // Get the expense to verify access
    const expense = await ExpenseRepository.findById(input.id);

    if (!expense) {
      throw new Error("Expense not found");
    }

    // Verify user is a member of the pool
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      expense.poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.notes !== undefined) updateData.notes = input.notes;

    await ExpenseRepository.update(input.id, updateData);

    return { success: true };
  }

  /**
   * Delete an expense.
   * Verifies user is a member of the pool.
   */
  static async deleteExpense(userId: string, expenseId: string) {
    // Get the expense to verify access
    const expense = await ExpenseRepository.findById(expenseId);

    if (!expense) {
      throw new Error("Expense not found");
    }

    // Verify user is a member of the pool
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      expense.poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    await ExpenseRepository.delete(expenseId);

    return { success: true };
  }
}
