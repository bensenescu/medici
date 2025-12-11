/**
 * Rule Service - Business logic for auto-categorization rules.
 * Verifies ownership BEFORE mutations.
 * Receives userId as first parameter for all operations.
 */

import type { ExpenseCategory } from "@/db/schema";
import { ExpenseCategoryRuleRepository } from "@/server/repositories";

export interface CreateRuleInput {
  id: string;
  rule: string;
  category: ExpenseCategory;
}

export class RuleService {
  /**
   * Get all rules for a user.
   */
  static async getAllRules(userId: string) {
    return ExpenseCategoryRuleRepository.findAllByUser(userId);
  }

  /**
   * Create a new rule.
   */
  static async createRule(userId: string, input: CreateRuleInput) {
    const now = new Date().toISOString();
    const ruleLower = input.rule.toLowerCase();

    await ExpenseCategoryRuleRepository.create({
      id: input.id,
      userId,
      rule: ruleLower,
      category: input.category,
      createdAt: now,
    });

    return {
      id: input.id,
      userId,
      rule: ruleLower,
      category: input.category,
      createdAt: now,
    };
  }

  /**
   * Delete a rule.
   * Verifies user owns the rule.
   */
  static async deleteRule(userId: string, ruleId: string) {
    const rule = await ExpenseCategoryRuleRepository.findById(ruleId);

    if (!rule) {
      throw new Error("Rule not found");
    }

    if (rule.userId !== userId) {
      throw new Error("Not authorized to delete this rule");
    }

    await ExpenseCategoryRuleRepository.delete(ruleId);

    return { success: true };
  }

  /**
   * Suggest a category based on expense name and user's rules.
   */
  static async suggestCategory(
    userId: string,
    expenseName: string,
  ): Promise<ExpenseCategory | null> {
    const rules = await ExpenseCategoryRuleRepository.findAllByUser(userId);
    const expenseNameLower = expenseName.toLowerCase();

    for (const rule of rules) {
      if (expenseNameLower.includes(rule.rule)) {
        return rule.category;
      }
    }

    return null;
  }
}
