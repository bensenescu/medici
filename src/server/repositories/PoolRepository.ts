/**
 * Pool Repository - Pure data access for pools.
 * Returns null/empty on not found (does not throw).
 */

import { db } from "@/db";
import { pools, type NewPool } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Find a pool by ID.
 */
async function findById(poolId: string) {
  return db.query.pools.findFirst({
    where: eq(pools.id, poolId),
  });
}

/**
 * Create a new pool.
 */
async function create(data: NewPool) {
  await db.insert(pools).values(data);
  return data;
}

/**
 * Update a pool by ID.
 */
async function update(
  poolId: string,
  data: Partial<Pick<NewPool, "name" | "description" | "updatedAt">>,
) {
  await db.update(pools).set(data).where(eq(pools.id, poolId));
}

/**
 * Delete a pool by ID.
 */
async function deletePool(poolId: string) {
  await db.delete(pools).where(eq(pools.id, poolId));
}

export const PoolRepository = {
  findById,
  create,
  update,
  delete: deletePool,
};
