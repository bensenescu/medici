/**
 * Pool Service - Business logic for expense pools.
 * Verifies ownership BEFORE mutations.
 * Receives userId as first parameter for all operations.
 */

import {
  PoolRepository,
  PoolMembershipRepository,
  ExpenseRepository,
  SettlementRepository,
  verifyPoolMembership,
  verifyPoolAdmin,
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

    if (userMemberships.length === 0) {
      return [];
    }

    // Batch fetch all memberships for all pools in a single query
    const poolIds = userMemberships.map((m) => m.poolId);
    const allMemberships =
      await PoolMembershipRepository.findAllByPoolIdsWithUsers(poolIds);

    // Group memberships by pool
    const membershipsByPool = new Map<string, typeof allMemberships>();
    for (const membership of allMemberships) {
      const existing = membershipsByPool.get(membership.poolId) ?? [];
      existing.push(membership);
      membershipsByPool.set(membership.poolId, existing);
    }

    // Build result
    return userMemberships.map((membership) => ({
      ...membership.pool,
      memberships: (membershipsByPool.get(membership.poolId) ?? []).map(
        (m) => ({
          ...m,
          user: m.user,
        }),
      ),
    }));
  }

  /**
   * Get a single pool with memberships.
   * Verifies user is a member.
   */
  static async getPool(userId: string, poolId: string) {
    await verifyPoolMembership(userId, poolId);

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
    await verifyPoolAdmin(userId, input.id);

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
    await verifyPoolAdmin(userId, poolId);
    await PoolRepository.delete(poolId);
    return { success: true };
  }

  /**
   * Add a member to a pool.
   * Verifies user is admin.
   */
  static async addMemberToPool(
    userId: string,
    poolId: string,
    friendId: string,
  ) {
    await verifyPoolAdmin(userId, poolId);

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
      createdAt: new Date().toISOString(),
    });

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
    await verifyPoolAdmin(userId, poolId);

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
   * Get pool balances.
   * Verifies user is a member.
   */
  static async getPoolBalances(userId: string, poolId: string) {
    await verifyPoolMembership(userId, poolId);

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
