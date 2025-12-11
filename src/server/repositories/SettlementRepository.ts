/**
 * Settlement Repository - Pure data access for settlements.
 * Returns null/empty on not found (does not throw).
 */

import { db } from "@/db";
import { settlements, type NewSettlement } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export class SettlementRepository {
  /**
   * Find a settlement by ID.
   */
  static async findById(settlementId: string) {
    return db.query.settlements.findFirst({
      where: eq(settlements.id, settlementId),
    });
  }

  /**
   * Find all settlements for a pool.
   */
  static async findAllByPool(poolId: string) {
    return db.query.settlements.findMany({
      where: eq(settlements.poolId, poolId),
      orderBy: [desc(settlements.createdAt)],
    });
  }

  /**
   * Find all settlements for a pool with user relations.
   */
  static async findAllByPoolWithUsers(poolId: string) {
    return db.query.settlements.findMany({
      where: eq(settlements.poolId, poolId),
      with: {
        fromUser: true,
        toUser: true,
        createdBy: true,
      },
      orderBy: [desc(settlements.createdAt)],
    });
  }

  /**
   * Find all settlements for multiple pools.
   */
  static async findAllByPoolIds(poolIds: string[]) {
    if (poolIds.length === 0) return [];
    return db.query.settlements.findMany({
      where: inArray(settlements.poolId, poolIds),
      orderBy: [desc(settlements.createdAt)],
    });
  }

  /**
   * Create a new settlement.
   */
  static async create(data: NewSettlement) {
    await db.insert(settlements).values(data);
    return data;
  }

  /**
   * Delete a settlement by ID.
   */
  static async delete(settlementId: string) {
    await db.delete(settlements).where(eq(settlements.id, settlementId));
  }

  /**
   * Delete all settlements for a pool.
   */
  static async deleteAllByPool(poolId: string) {
    await db.delete(settlements).where(eq(settlements.poolId, poolId));
  }
}
