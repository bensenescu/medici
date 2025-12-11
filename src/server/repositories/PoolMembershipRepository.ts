/**
 * Pool Membership Repository - Pure data access for pool memberships.
 * Returns null/empty on not found (does not throw).
 * All queries include userId filtering for security.
 */

import { db } from "@/db";
import { poolMemberships, type NewPoolMembership } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

/**
 * Verify that a user is a member of a pool.
 * Throws if not a member.
 */
export async function verifyPoolMembership(userId: string, poolId: string) {
  const membership = await PoolMembershipRepository.findByPoolAndUser(
    poolId,
    userId,
  );
  if (!membership) {
    throw new Error("Not a member of this pool");
  }
  return membership;
}

/**
 * Verify that a user is an admin of a pool.
 * Throws if not a member or not an admin.
 */
export async function verifyPoolAdmin(userId: string, poolId: string) {
  const membership = await verifyPoolMembership(userId, poolId);
  if (membership.role !== "ADMIN") {
    throw new Error("Must be pool admin");
  }
  return membership;
}

export class PoolMembershipRepository {
  /**
   * Find a membership by pool and user.
   */
  static async findByPoolAndUser(poolId: string, userId: string) {
    return db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, poolId),
        eq(poolMemberships.userId, userId),
      ),
    });
  }

  /**
   * Find all memberships for a user.
   */
  static async findAllByUser(userId: string) {
    return db.query.poolMemberships.findMany({
      where: eq(poolMemberships.userId, userId),
      with: {
        pool: true,
      },
    });
  }

  /**
   * Find all memberships for a user (pool IDs only).
   */
  static async findPoolIdsByUser(userId: string) {
    const memberships = await db.query.poolMemberships.findMany({
      where: eq(poolMemberships.userId, userId),
      columns: { poolId: true },
    });
    return memberships.map((m) => m.poolId);
  }

  /**
   * Find all memberships for a pool.
   */
  static async findAllByPool(poolId: string) {
    return db.query.poolMemberships.findMany({
      where: eq(poolMemberships.poolId, poolId),
    });
  }

  /**
   * Find all memberships for a pool with user info.
   */
  static async findAllByPoolWithUsers(poolId: string) {
    return db.query.poolMemberships.findMany({
      where: eq(poolMemberships.poolId, poolId),
      with: {
        user: true,
      },
    });
  }

  /**
   * Find all memberships for multiple pools with user info.
   */
  static async findAllByPoolIdsWithUsers(poolIds: string[]) {
    if (poolIds.length === 0) return [];
    return db.query.poolMemberships.findMany({
      where: inArray(poolMemberships.poolId, poolIds),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            venmoHandle: true,
          },
        },
      },
    });
  }

  /**
   * Count admins in a pool.
   */
  static async countAdminsByPool(poolId: string) {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(poolMemberships)
      .where(
        and(
          eq(poolMemberships.poolId, poolId),
          eq(poolMemberships.role, "ADMIN"),
        ),
      );
    return result[0]?.count ?? 0;
  }

  /**
   * Create a new membership.
   */
  static async create(data: NewPoolMembership) {
    await db.insert(poolMemberships).values(data);
    return data;
  }

  /**
   * Delete a membership by pool and user.
   */
  static async deleteByPoolAndUser(poolId: string, userId: string) {
    await db
      .delete(poolMemberships)
      .where(
        and(
          eq(poolMemberships.poolId, poolId),
          eq(poolMemberships.userId, userId),
        ),
      );
  }
}
