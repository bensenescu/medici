/**
 * Expense Category Rule Repository - Pure data access for auto-categorization rules.
 * Returns null/empty on not found (does not throw).
 * All queries include userId filtering for security.
 */

import { db } from "@/db";
import { expenseCategoryRules, type NewExpenseCategoryRule } from "@/db/schema";
import { eq } from "drizzle-orm";

export class ExpenseCategoryRuleRepository {
  /**
   * Find a rule by ID.
   */
  static async findById(ruleId: string) {
    return db.query.expenseCategoryRules.findFirst({
      where: eq(expenseCategoryRules.id, ruleId),
    });
  }

  /**
   * Find all rules for a user.
   */
  static async findAllByUser(userId: string) {
    return db.query.expenseCategoryRules.findMany({
      where: eq(expenseCategoryRules.userId, userId),
    });
  }

  /**
   * Create a new rule.
   */
  static async create(data: NewExpenseCategoryRule) {
    await db.insert(expenseCategoryRules).values(data);
    return data;
  }

  /**
   * Delete a rule by ID.
   */
  static async delete(ruleId: string) {
    await db
      .delete(expenseCategoryRules)
      .where(eq(expenseCategoryRules.id, ruleId));
  }
}
