/**
 * Pool Service - Business logic for expense pools.
 * Verifies ownership BEFORE mutations.
 * Receives userId as first parameter for all operations.
 */

import {
  PoolRepository,
  PoolMembershipRepository,
  ExpenseRepository,
  ExpenseLineItemRepository,
  SettlementRepository,
} from "@/server/repositories";
import { BalanceService, type BalanceUser } from "./BalanceService";

export interface CreatePoolInput {
  id: string;
  name: string;
  description?: string | null;
}

export interface UpdatePoolInput {
  id: string;
  name?: string;
  description?: string | null;
}

export class PoolService {
  /**
   * Get all pools for a user with memberships.
   */
  static async getAllPools(userId: string) {
    const userMemberships =
      await PoolMembershipRepository.findAllByUser(userId);

    const poolsWithMemberships = await Promise.all(
      userMemberships.map(async (membership) => {
        const allMemberships =
          await PoolMembershipRepository.findAllByPoolWithUsers(
            membership.poolId,
          );

        return {
          ...membership.pool,
          memberships: allMemberships.map((m) => ({
            ...m,
            user: m.user,
          })),
        };
      }),
    );

    return poolsWithMemberships;
  }

  /**
   * Get a single pool with memberships.
   * Verifies user is a member.
   */
  static async getPool(userId: string, poolId: string) {
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    const pool = await PoolRepository.findById(poolId);

    if (!pool) {
      throw new Error("Pool not found");
    }

    const allMemberships =
      await PoolMembershipRepository.findAllByPoolWithUsers(poolId);

    return {
      ...pool,
      memberships: allMemberships.map((m) => ({
        ...m,
        user: m.user,
      })),
    };
  }

  /**
   * Create a new pool.
   * Creator becomes admin with 100% default split.
   */
  static async createPool(userId: string, input: CreatePoolInput) {
    const now = new Date().toISOString();

    await PoolRepository.create({
      id: input.id,
      name: input.name,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    });

    // Add creator as admin
    await PoolMembershipRepository.create({
      id: crypto.randomUUID(),
      poolId: input.id,
      userId: userId,
      role: "ADMIN",
      defaultSplitPercentage: 100,
      createdAt: now,
    });

    return {
      id: input.id,
      name: input.name,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update a pool.
   * Verifies user is admin.
   */
  static async updatePool(userId: string, input: UpdatePoolInput) {
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      input.id,
      userId,
    );

    if (!membership || membership.role !== "ADMIN") {
      throw new Error("Must be pool admin to update");
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;

    await PoolRepository.update(input.id, updateData);

    return { success: true };
  }

  /**
   * Delete a pool.
   * Verifies user is admin.
   */
  static async deletePool(userId: string, poolId: string) {
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      poolId,
      userId,
    );

    if (!membership || membership.role !== "ADMIN") {
      throw new Error("Must be pool admin to delete");
    }

    await PoolRepository.delete(poolId);

    return { success: true };
  }

  /**
   * Settle up a pool - mark all expenses as settled.
   * Verifies user is a member.
   */
  static async settleUpPool(userId: string, poolId: string) {
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    const now = new Date().toISOString();

    // Mark all expenses as settled
    await ExpenseRepository.settleAllByPool(poolId, now);

    // Mark all line items as settled
    const expenseIds = await ExpenseRepository.findIdsByPool(poolId);
    for (const expenseId of expenseIds) {
      await ExpenseLineItemRepository.settleAllByExpense(expenseId);
    }

    return { success: true };
  }

  /**
   * Add a member to a pool.
   * Verifies user is admin.
   * Recalculates line items for existing expenses.
   */
  static async addMemberToPool(
    userId: string,
    poolId: string,
    friendId: string,
  ) {
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      poolId,
      userId,
    );

    if (!membership || membership.role !== "ADMIN") {
      throw new Error("Must be pool admin to add members");
    }

    // Check if friend is already a member
    const existingMembership = await PoolMembershipRepository.findByPoolAndUser(
      poolId,
      friendId,
    );

    if (existingMembership) {
      throw new Error("User is already a member of this pool");
    }

    // Add new member
    await PoolMembershipRepository.create({
      id: crypto.randomUUID(),
      poolId: poolId,
      userId: friendId,
      role: "PARTICIPANT",
      defaultSplitPercentage: 0,
      createdAt: new Date().toISOString(),
    });

    // Recalculate line items for all existing expenses
    const allMemberships = await PoolMembershipRepository.findAllByPool(poolId);
    const poolExpenses =
      await ExpenseRepository.findAllByPoolWithLineItems(poolId);

    for (const expense of poolExpenses) {
      const newSplitAmount = expense.amount / allMemberships.length;

      // Delete existing line items
      await ExpenseLineItemRepository.deleteAllByExpense(expense.id);

      // Create new line items for all members
      await ExpenseLineItemRepository.createMany(
        allMemberships.map((m) => ({
          id: crypto.randomUUID(),
          expenseId: expense.id,
          debtorUserId: m.userId,
          amount: newSplitAmount,
          isSettled: expense.isSettled,
        })),
      );
    }

    return { success: true };
  }

  /**
   * Remove a member from a pool.
   * Verifies user is admin.
   */
  static async removeMemberFromPool(
    userId: string,
    poolId: string,
    memberId: string,
  ) {
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      poolId,
      userId,
    );

    if (!membership || membership.role !== "ADMIN") {
      throw new Error("Must be pool admin to remove members");
    }

    // Can't remove yourself if you're the only admin
    if (memberId === userId) {
      const adminCount =
        await PoolMembershipRepository.countAdminsByPool(poolId);
      if (adminCount === 1) {
        throw new Error("Cannot remove the only admin from pool");
      }
    }

    await PoolMembershipRepository.deleteByPoolAndUser(poolId, memberId);

    return { success: true };
  }

  /**
   * Fix missing line items for a pool.
   * Verifies user is a member.
   */
  static async fixMissingLineItems(userId: string, poolId: string) {
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    const allMemberships = await PoolMembershipRepository.findAllByPool(poolId);
    const poolExpenses =
      await ExpenseRepository.findAllByPoolWithLineItems(poolId);

    let fixedCount = 0;
    let updatedCount = 0;

    for (const expense of poolExpenses) {
      if (expense.lineItems.length === 0) {
        // No line items - create equal split
        const splitAmount = expense.amount / allMemberships.length;

        await ExpenseLineItemRepository.createMany(
          allMemberships.map((m) => ({
            id: crypto.randomUUID(),
            expenseId: expense.id,
            debtorUserId: m.userId,
            amount: splitAmount,
            isSettled: expense.isSettled,
          })),
        );

        fixedCount++;
      } else {
        // Check if we need to add new members
        const existingDebtorIds = new Set(
          expense.lineItems.map((li) => li.debtorUserId),
        );
        const missingMembers = allMemberships.filter(
          (m) => !existingDebtorIds.has(m.userId),
        );

        if (missingMembers.length > 0) {
          const newSplitAmount = expense.amount / allMemberships.length;

          await ExpenseLineItemRepository.deleteAllByExpense(expense.id);

          await ExpenseLineItemRepository.createMany(
            allMemberships.map((m) => ({
              id: crypto.randomUUID(),
              expenseId: expense.id,
              debtorUserId: m.userId,
              amount: newSplitAmount,
              isSettled: expense.isSettled,
            })),
          );

          updatedCount++;
        }
      }
    }

    return { fixedCount, updatedCount, totalExpenses: poolExpenses.length };
  }

  /**
   * Get pool balances.
   * Verifies user is a member.
   */
  static async getPoolBalances(userId: string, poolId: string) {
    const membership = await PoolMembershipRepository.findByPoolAndUser(
      poolId,
      userId,
    );

    if (!membership) {
      throw new Error("Not a member of this pool");
    }

    const allMemberships =
      await PoolMembershipRepository.findAllByPoolWithUsers(poolId);
    const poolExpenses = await ExpenseRepository.findAllByPool(poolId);
    const poolSettlements = await SettlementRepository.findAllByPool(poolId);

    // Build users map for display names
    const usersMap = new Map<string, BalanceUser>(
      allMemberships.map((m) => [
        m.userId,
        {
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
          venmoHandle: m.user.venmoHandle,
        },
      ]),
    );

    const memberUserIds = allMemberships.map((m) => m.userId);
    return BalanceService.computePoolBalances(
      poolExpenses,
      poolSettlements,
      memberUserIds,
      usersMap,
    );
  }
}
