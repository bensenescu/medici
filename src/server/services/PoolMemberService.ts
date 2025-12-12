/**
 * Pool Member Service - Business logic for pool memberships.
 * Receives userId as first parameter for all operations.
 */

import { PoolMembershipRepository } from "@/server/repositories";

/**
 * Get all pool members for pools the user is a member of.
 */
async function getAllPoolMembers(userId: string) {
  const poolIds = await PoolMembershipRepository.findPoolIdsByUser(userId);

  if (poolIds.length === 0) {
    return [];
  }

  return PoolMembershipRepository.findAllByPoolIdsWithUsers(poolIds);
}

export const PoolMemberService = {
  getAllPoolMembers,
};
