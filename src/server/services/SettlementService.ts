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
  verifyPoolMembership,
} from "@/server/repositories";
import { BalanceService } from "@/shared/BalanceService";
import type { Expense } from "@/db/schema";

export interface CreateSettlementInput {
  poolId: string;
  toUserId: string;
  amount: number;
  note?: string;
}

export class SettlementService {
  /**
   * Validate a settlement request before creating it.
   */
  private static async validateSettlementRequest(
    userId: string,
    input: CreateSettlementInput,
  ) {
    await verifyPoolMembership(userId, input.poolId);

    // Verify recipient is also a member
    const recipientMembership =
      await PoolMembershipRepository.findByPoolAndUser(
        input.poolId,
        input.toUserId,
      );
    if (!recipientMembership) {
      throw new Error("Recipient is not a member of this pool");
    }

    if (userId === input.toUserId) {
      throw new Error("Cannot record a payment to yourself");
    }
  }

  /**
   * Validate that the settlement amount doesn't exceed the debt.
   */
  private static validateSettlementAmount(
    userId: string,
    toUserId: string,
    amount: number,
    balanceResult: ReturnType<typeof BalanceService.computePoolBalances>,
  ) {
    const userDebtToRecipient = balanceResult.simplifiedDebts.find(
      (d) => d.fromUserId === userId && d.toUserId === toUserId,
    );

    const maxAmount = userDebtToRecipient?.amount ?? 0;

    if (amount > maxAmount + CURRENCY_TOLERANCE) {
      throw new Error(
        `Amount exceeds what you owe. Maximum: $${maxAmount.toFixed(2)}`,
      );
    }
  }

  /**
   * Check if pool is fully settled and clean up if so.
   */
  private static async checkAndFinalizePoolSettlement(
    poolId: string,
    memberUserIds: string[],
    poolExpenses: Expense[],
    now: string,
  ): Promise<boolean> {
    const updatedSettlements = await SettlementRepository.findAllByPool(poolId);

    const updatedBalances = BalanceService.computePoolBalances(
      poolExpenses,
      updatedSettlements,
      memberUserIds,
    );

    const allSettled = updatedBalances.memberBalances.every(
      (b) => Math.abs(b.balance) < CURRENCY_TOLERANCE,
    );

    if (allSettled && poolExpenses.some((e) => !e.isSettled)) {
      await ExpenseRepository.settleAllByPool(poolId, now);
      await SettlementRepository.deleteAllByPool(poolId);
      return true;
    }

    return false;
  }

  /**
   * Create a settlement (record payment).
   * Verifies user is a member and validates amount against debt.
   */
  static async createSettlement(userId: string, input: CreateSettlementInput) {
    await this.validateSettlementRequest(userId, input);

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

    this.validateSettlementAmount(
      userId,
      input.toUserId,
      input.amount,
      balanceResult,
    );

    const now = new Date().toISOString();
    const settlementId = crypto.randomUUID();

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

    const poolSettled = await this.checkAndFinalizePoolSettlement(
      input.poolId,
      memberUserIds,
      poolExpenses,
      now,
    );

    return { success: true, settlementId, poolSettled };
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
    await verifyPoolMembership(userId, poolId);
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

    const membership = await verifyPoolMembership(userId, settlement.poolId);

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
