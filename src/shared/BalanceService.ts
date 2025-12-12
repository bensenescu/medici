/**
 * Balance calculation service for expense pools.
 *
 * Computes net balances for each pool member and simplifies debts
 * to minimize the number of transactions needed to settle up.
 *
 * Algorithm:
 * 1. Calculate raw balance: For each user, sum up what they paid minus their equal share
 * 2. Apply settlements: Adjust balances based on recorded payments between users
 * 3. Simplify debts: Match creditors (positive balance) with debtors (negative balance)
 *    to minimize total number of transactions
 */

import type { Expense, Settlement, User } from "@/db/schema";
import { CURRENCY_TOLERANCE } from "@/utils/formatters";

/**
 * User fields needed for balance display.
 */
export type BalanceUser = Pick<
  User,
  "id" | "firstName" | "lastName" | "email" | "venmoHandle"
>;

/**
 * Balance for a single pool member.
 * Positive balance = owed money (creditor)
 * Negative balance = owes money (debtor)
 */
export interface MemberBalance {
  userId: string;
  user?: BalanceUser;
  balance: number;
}

/**
 * A simplified debt between two users.
 * Represents a payment that should be made from one user to another.
 */
export interface SimplifiedDebt {
  fromUserId: string;
  fromUser?: BalanceUser;
  toUserId: string;
  toUser?: BalanceUser;
  amount: number;
}

export interface PoolBalanceResult {
  memberBalances: MemberBalance[];
  simplifiedDebts: SimplifiedDebt[];
  totalExpenses: number;
}

export class BalanceService {
  /**
   * Calculate balances for all members in a pool using equal splits.
   *
   * For each expense:
   * - The payer gets credit for the full amount
   * - Everyone (including payer) owes their equal share
   *
   * Net effect: payer is owed (amount - their share) from the group
   *
   * @param expenses - All expenses in the pool
   * @param settlements - All settlements (payments between users)
   * @param memberUserIds - All member user IDs in the pool
   * @param usersMap - Optional map of userId to user data for display
   * @returns Pool balance result with member balances and simplified debts
   */
  static computePoolBalances(
    expenses: Expense[],
    settlements: Settlement[],
    memberUserIds: string[],
    usersMap?: Map<string, BalanceUser>,
  ): PoolBalanceResult {
    const memberCount = memberUserIds.length;

    // Initialize net balances for all members
    const netBalances = new Map<string, number>();
    for (const userId of memberUserIds) {
      netBalances.set(userId, 0);
    }

    let totalExpenses = 0;

    // Process each expense with equal split
    for (const expense of expenses) {
      const payerId = expense.paidByUserId;
      const amount = expense.amount;
      const sharePerPerson = amount / memberCount;

      totalExpenses += amount;

      // Payer paid the full amount, so they get credit
      const payerBalance = netBalances.get(payerId) ?? 0;
      netBalances.set(payerId, payerBalance + amount);

      // Everyone owes their share (including the payer)
      for (const userId of memberUserIds) {
        const currentBalance = netBalances.get(userId) ?? 0;
        netBalances.set(userId, currentBalance - sharePerPerson);
      }
    }

    // Apply settlements: when fromUser pays toUser
    // - fromUser's debt decreases (balance increases)
    // - toUser's credit decreases (balance decreases)
    for (const settlement of settlements) {
      const fromBalance = netBalances.get(settlement.fromUserId) ?? 0;
      netBalances.set(settlement.fromUserId, fromBalance + settlement.amount);

      const toBalance = netBalances.get(settlement.toUserId) ?? 0;
      netBalances.set(settlement.toUserId, toBalance - settlement.amount);
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
      totalExpenses: Math.round(totalExpenses * 100) / 100,
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
    usersMap?: Map<string, BalanceUser>,
  ): SimplifiedDebt[] {
    const debts: SimplifiedDebt[] = [];

    // Create mutable copies of balances, filtering out zero balances
    const balances = new Map<string, number>();
    for (const [userId, balance] of netBalances) {
      // Round to avoid floating point issues
      const rounded = Math.round(balance * 100) / 100;
      if (Math.abs(rounded) > CURRENCY_TOLERANCE) {
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

      if (transferAmount > CURRENCY_TOLERANCE) {
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
      if (Math.abs(newCreditorBalance) < CURRENCY_TOLERANCE) {
        balances.delete(maxCreditor);
      } else {
        balances.set(maxCreditor, newCreditorBalance);
      }

      // Remove or update debtor
      if (Math.abs(newDebtorBalance) < CURRENCY_TOLERANCE) {
        balances.delete(maxDebtor);
      } else {
        balances.set(maxDebtor, newDebtorBalance);
      }
    }

    return debts;
  }
}
