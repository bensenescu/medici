/**
 * Pool Member Service - Business logic for pool memberships.
 * Receives userId as first parameter for all operations.
 */

import { PoolMembershipRepository } from "@/server/repositories";

export class PoolMemberService {
  /**
   * Get all pool members for pools the user is a member of.
   */
  static async getAllPoolMembers(userId: string) {
    const poolIds = await PoolMembershipRepository.findPoolIdsByUser(userId);

    if (poolIds.length === 0) {
      return [];
    }

    return PoolMembershipRepository.findAllByPoolIdsWithUsers(poolIds);
  }
}
