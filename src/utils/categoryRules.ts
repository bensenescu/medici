/**
 * Utility for auto-categorization of expenses based on rules.
 */

import type { ExpenseCategory } from "@/types";

interface CategoryRule {
  rule: string;
  category: ExpenseCategory;
}

/**
 * Apply category rules to an expense name.
 * Returns the matched category or the default if no rules match.
 */
export function applyCategoryRules(
  expenseName: string,
  rules: CategoryRule[],
  defaultCategory: ExpenseCategory = "miscellaneous",
): ExpenseCategory {
  if (!expenseName.trim() || rules.length === 0) {
    return defaultCategory;
  }

  const expenseNameLower = expenseName.toLowerCase();
  for (const rule of rules) {
    if (expenseNameLower.includes(rule.rule.toLowerCase())) {
      return rule.category;
    }
  }

  return defaultCategory;
}
