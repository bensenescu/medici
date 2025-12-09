/**
 * Balance calculation service for expense pools.
 *
 * Computes net balances for each pool member and simplifies debts
 * to minimize the number of transactions needed to settle up.
 *
 * Algorithm:
 * 1. Calculate raw balance: For each user, sum up what they paid minus what they owe
 * 2. Simplify debts: Match creditors (positive balance) with debtors (negative balance)
 *    to minimize total number of transactions
 */

import type { Expense, ExpenseLineItem, User } from "@/db/schema";

// Types for balance calculations
export interface MemberBalance {
  userId: string;
  user?: Pick<User, "id" | "firstName" | "lastName" | "email">;
  balance: number; // Positive = owed money (creditor), Negative = owes money (debtor)
}

export interface SimplifiedDebt {
  fromUserId: string;
  fromUser?: Pick<User, "id" | "firstName" | "lastName" | "email">;
  toUserId: string;
  toUser?: Pick<User, "id" | "firstName" | "lastName" | "email">;
  amount: number;
}

export interface PoolBalanceResult {
  memberBalances: MemberBalance[];
  simplifiedDebts: SimplifiedDebt[];
  totalUnsettled: number;
}

// Extended types for expenses with line items
type ExpenseWithLineItems = Expense & {
  lineItems: ExpenseLineItem[];
  paidBy?: Pick<User, "id" | "firstName" | "lastName" | "email">;
};

export class BalanceService {
  /**
   * Calculate balances for all members in a pool.
   *
   * @param expenses - All expenses in the pool with their line items
   * @param memberUserIds - All member user IDs in the pool
   * @param usersMap - Optional map of userId to user data for display
   * @returns Pool balance result with member balances and simplified debts
   */
  static computePoolBalances(
    expenses: ExpenseWithLineItems[],
    memberUserIds: string[],
    usersMap?: Map<
      string,
      Pick<User, "id" | "firstName" | "lastName" | "email">
    >,
  ): PoolBalanceResult {
    // Initialize net balances for all members
    const netBalances = new Map<string, number>();
    for (const userId of memberUserIds) {
      netBalances.set(userId, 0);
    }

    let totalUnsettled = 0;

    // Process each unsettled expense
    for (const expense of expenses) {
      if (expense.isSettled) continue;

      const payerId = expense.paidByUserId;

      // Process each line item
      for (const lineItem of expense.lineItems) {
        if (lineItem.isSettled) continue;

        const debtorId = lineItem.debtorUserId;
        const amount = lineItem.amount;

        totalUnsettled += amount;

        // Skip if payer is also the debtor (they owe themselves)
        if (payerId === debtorId) continue;

        // Payer is owed this amount (positive balance)
        const payerBalance = netBalances.get(payerId) ?? 0;
        netBalances.set(payerId, payerBalance + amount);

        // Debtor owes this amount (negative balance)
        const debtorBalance = netBalances.get(debtorId) ?? 0;
        netBalances.set(debtorId, debtorBalance - amount);
      }
    }

    // Convert to MemberBalance array
    const memberBalances: MemberBalance[] = Array.from(netBalances.entries())
      .map(([userId, balance]) => ({
        userId,
        user: usersMap?.get(userId),
        balance: Math.round(balance * 100) / 100, // Round to 2 decimal places
      }))
      .sort((a, b) => b.balance - a.balance); // Sort by balance descending (creditors first)

    // Simplify debts to minimize transactions
    const simplifiedDebts = this.simplifyDebts(netBalances, usersMap);

    return {
      memberBalances,
      simplifiedDebts,
      totalUnsettled: Math.round(totalUnsettled * 100) / 100,
    };
  }

  /**
   * Simplify debts using a greedy algorithm.
   *
   * The algorithm:
   * 1. Separate users into creditors (positive balance) and debtors (negative balance)
   * 2. Match the largest creditor with the largest debtor
   * 3. Transfer the minimum of what's owed/owed
   * 4. Repeat until all balanced
   *
   * This produces an optimal or near-optimal solution for minimizing transactions.
   */
  private static simplifyDebts(
    netBalances: Map<string, number>,
    usersMap?: Map<
      string,
      Pick<User, "id" | "firstName" | "lastName" | "email">
    >,
  ): SimplifiedDebt[] {
    const debts: SimplifiedDebt[] = [];

    // Create mutable copies of balances, filtering out zero balances
    const balances = new Map<string, number>();
    for (const [userId, balance] of netBalances) {
      // Round to avoid floating point issues
      const rounded = Math.round(balance * 100) / 100;
      if (Math.abs(rounded) > 0.01) {
        balances.set(userId, rounded);
      }
    }

    // Process until all balances are settled
    while (balances.size > 0) {
      // Find max creditor (most positive balance)
      let maxCreditor: string | null = null;
      let maxCredit = 0;
      for (const [userId, balance] of balances) {
        if (balance > maxCredit) {
          maxCredit = balance;
          maxCreditor = userId;
        }
      }

      // Find max debtor (most negative balance)
      let maxDebtor: string | null = null;
      let maxDebt = 0;
      for (const [userId, balance] of balances) {
        if (balance < -maxDebt) {
          maxDebt = -balance;
          maxDebtor = userId;
        }
      }

      // If no creditor or debtor found, we're done
      if (!maxCreditor || !maxDebtor) break;

      // Transfer the minimum of what's owed
      const transferAmount = Math.min(maxCredit, maxDebt);

      if (transferAmount > 0.01) {
        debts.push({
          fromUserId: maxDebtor,
          fromUser: usersMap?.get(maxDebtor),
          toUserId: maxCreditor,
          toUser: usersMap?.get(maxCreditor),
          amount: Math.round(transferAmount * 100) / 100,
        });
      }

      // Update balances
      const newCreditorBalance = maxCredit - transferAmount;
      const newDebtorBalance = -maxDebt + transferAmount;

      // Remove or update creditor
      if (Math.abs(newCreditorBalance) < 0.01) {
        balances.delete(maxCreditor);
      } else {
        balances.set(maxCreditor, newCreditorBalance);
      }

      // Remove or update debtor
      if (Math.abs(newDebtorBalance) < 0.01) {
        balances.delete(maxDebtor);
      } else {
        balances.set(maxDebtor, newDebtorBalance);
      }
    }

    return debts;
  }

  /**
   * Calculate balance for a specific user in a pool.
   */
  static computeUserBalance(
    expenses: ExpenseWithLineItems[],
    userId: string,
  ): number {
    let balance = 0;

    for (const expense of expenses) {
      if (expense.isSettled) continue;

      const payerId = expense.paidByUserId;

      for (const lineItem of expense.lineItems) {
        if (lineItem.isSettled) continue;

        const debtorId = lineItem.debtorUserId;
        const amount = lineItem.amount;

        // Skip self-payments
        if (payerId === debtorId) continue;

        // If user paid, they're owed
        if (payerId === userId) {
          balance += amount;
        }

        // If user is the debtor, they owe
        if (debtorId === userId) {
          balance -= amount;
        }
      }
    }

    return Math.round(balance * 100) / 100;
  }
}
