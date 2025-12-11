/**
 * Settlement Service - Business logic for recording payments between users.
 * Verifies ownership BEFORE mutations.
 * Receives userId as first parameter for all operations.
 */

import { CURRENCY_TOLERANCE } from "@/utils/formatters";
import {
  SettlementRepository,
  PoolMembershipRepository,
  ExpenseRepository,
} from "@/server/repositories";
import { BalanceService } from "./BalanceService";

export interface CreateSettlementInput {
  poolId: string;
  toUserId: string;
  amount: number;
  note?: string;
}

export class SettlementService {
  /**
   * Create a settlement (record payment).
   * Verifies user is a member and validates amount against debt.
   */
  static async createSettlement(userId: string, input: CreateSettlementInput) {
    // Verify user is a member of the pool
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      input.poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    // Verify recipient is also a member
    const recipientMembership =
      await PoolMembershipRepository.findByPoolAndUser(
        input.poolId,
        input.toUserId,
      );

    if (!recipientMembership) {
      throw new Error("Recipient is not a member of this pool");
    }

    // Cannot pay yourself
    if (userId === input.toUserId) {
      throw new Error("Cannot record a payment to yourself");
    }

    // Get current balances to validate amount
    const allMemberships = await PoolMembershipRepository.findAllByPool(
      input.poolId,
    );
    const poolExpenses = await ExpenseRepository.findAllByPool(input.poolId);
    const existingSettlements = await SettlementRepository.findAllByPool(
      input.poolId,
    );

    const memberUserIds = allMemberships.map((m) => m.userId);
    const balanceResult = BalanceService.computePoolBalances(
      poolExpenses,
      existingSettlements,
      memberUserIds,
    );

    // Find the debt from current user to recipient
    const userDebtToRecipient = balanceResult.simplifiedDebts.find(
      (d) => d.fromUserId === userId && d.toUserId === input.toUserId,
    );

    const maxAmount = userDebtToRecipient?.amount ?? 0;

    if (input.amount > maxAmount + CURRENCY_TOLERANCE) {
      throw new Error(
        `Amount exceeds what you owe. Maximum: $${maxAmount.toFixed(2)}`,
      );
    }

    const now = new Date().toISOString();
    const settlementId = crypto.randomUUID();

    // Create the settlement
    await SettlementRepository.create({
      id: settlementId,
      poolId: input.poolId,
      fromUserId: userId,
      toUserId: input.toUserId,
      amount: input.amount,
      note: input.note || null,
      createdAt: now,
      createdByUserId: userId,
    });

    // Check if pool is now fully settled
    const updatedSettlements = await SettlementRepository.findAllByPool(
      input.poolId,
    );

    const updatedBalances = BalanceService.computePoolBalances(
      poolExpenses,
      updatedSettlements,
      memberUserIds,
    );

    const allSettled = updatedBalances.memberBalances.every(
      (b) => Math.abs(b.balance) < CURRENCY_TOLERANCE,
    );

    if (allSettled && poolExpenses.some((e) => !e.isSettled)) {
      // Mark all expenses as settled
      await ExpenseRepository.settleAllByPool(input.poolId, now);

      // Delete settlements since expenses are now settled
      await SettlementRepository.deleteAllByPool(input.poolId);

      return { success: true, settlementId, poolSettled: true };
    }

    return { success: true, settlementId, poolSettled: false };
  }

  /**
   * Get all settlements for a user across all their pools.
   */
  static async getAllSettlements(userId: string) {
    const poolIds = await PoolMembershipRepository.findPoolIdsByUser(userId);

    if (poolIds.length === 0) {
      return [];
    }

    return SettlementRepository.findAllByPoolIds(poolIds);
  }

  /**
   * Get all settlements for a specific pool.
   * Verifies user is a member.
   */
  static async getPoolSettlements(userId: string, poolId: string) {
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    return SettlementRepository.findAllByPoolWithUsers(poolId);
  }

  /**
   * Delete a settlement.
   * Verifies user is creator or pool admin.
   */
  static async deleteSettlement(userId: string, settlementId: string) {
    const settlement = await SettlementRepository.findById(settlementId);

    if (!settlement) {
      throw new Error("Settlement not found");
    }

    const membership = await PoolMembershipRepository.findByPoolAndUser(
      settlement.poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    const canDelete =
      settlement.createdByUserId === userId || membership.role === "ADMIN";

    if (!canDelete) {
      throw new Error(
        "Only the creator or pool admin can delete this settlement",
      );
    }

    await SettlementRepository.delete(settlementId);

    return { success: true };
  }
}
