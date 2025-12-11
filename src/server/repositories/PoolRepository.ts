/**
 * Pool Repository - Pure data access for pools.
 * Returns null/empty on not found (does not throw).
 */

import { db } from "@/db";
import { pools, type NewPool } from "@/db/schema";
import { eq } from "drizzle-orm";

export class PoolRepository {
  /**
   * Find a pool by ID.
   */
  static async findById(poolId: string) {
    return db.query.pools.findFirst({
      where: eq(pools.id, poolId),
    });
  }

  /**
   * Create a new pool.
   */
  static async create(data: NewPool) {
    await db.insert(pools).values(data);
    return data;
  }

  /**
   * Update a pool by ID.
   */
  static async update(
    poolId: string,
    data: Partial<Pick<NewPool, "name" | "description" | "updatedAt">>,
  ) {
    await db.update(pools).set(data).where(eq(pools.id, poolId));
  }

  /**
   * Delete a pool by ID.
   */
  static async delete(poolId: string) {
    await db.delete(pools).where(eq(pools.id, poolId));
  }
}
