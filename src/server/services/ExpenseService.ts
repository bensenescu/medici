/**
 * Expense Service - Business logic for expenses.
 * Verifies ownership BEFORE mutations.
 * Receives userId as first parameter for all operations.
 */

import type { ExpenseCategory } from "@/db/schema";
import { CURRENCY_TOLERANCE } from "@/utils/formatters";
import {
  ExpenseRepository,
  ExpenseLineItemRepository,
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
  lineItems: Array<{
    id: string;
    debtorUserId: string;
    amount: number;
  }>;
}

export interface UpdateExpenseInput {
  id: string;
  name?: string;
  amount?: number;
  category?: ExpenseCategory;
  description?: string | null;
  notes?: string | null;
  lineItems?: Array<{
    id: string;
    debtorUserId: string;
    amount: number;
  }>;
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
    // Verify user is a member and get all pool members
    const allMemberships = await PoolMembershipRepository.findAllByPool(
      input.poolId,
    );

    const userMembership = allMemberships.find((m) => m.userId === userId);
    if (!userMembership) {
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

    // If no line items provided, auto-generate equal split among all members
    let lineItems = input.lineItems;
    if (lineItems.length === 0) {
      const splitAmount = input.amount / allMemberships.length;
      lineItems = allMemberships.map((m) => ({
        id: crypto.randomUUID(),
        debtorUserId: m.userId,
        amount: splitAmount,
      }));
    }

    // Validate line items sum to expense amount
    const lineItemTotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
    if (Math.abs(lineItemTotal - input.amount) > CURRENCY_TOLERANCE) {
      throw new Error(
        `Line items total (${lineItemTotal.toFixed(2)}) must equal expense amount (${input.amount.toFixed(2)})`,
      );
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

    // Create line items
    await ExpenseLineItemRepository.createMany(
      lineItems.map((li) => ({
        id: li.id,
        expenseId: input.id,
        debtorUserId: li.debtorUserId,
        amount: li.amount,
        isSettled: false,
      })),
    );

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

    // If updating line items, validate sum
    const newAmount = input.amount ?? expense.amount;
    if (input.lineItems) {
      const lineItemTotal = input.lineItems.reduce(
        (sum, li) => sum + li.amount,
        0,
      );
      if (Math.abs(lineItemTotal - newAmount) > CURRENCY_TOLERANCE) {
        throw new Error("Line items total must equal expense amount");
      }
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

    // If line items provided, replace them
    if (input.lineItems) {
      await ExpenseLineItemRepository.deleteAllByExpense(input.id);

      await ExpenseLineItemRepository.createMany(
        input.lineItems.map((li) => ({
          id: li.id,
          expenseId: input.id,
          debtorUserId: li.debtorUserId,
          amount: li.amount,
          isSettled: false,
        })),
      );
    }

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
