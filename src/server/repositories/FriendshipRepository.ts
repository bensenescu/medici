/**
 * Friendship Repository - Pure data access for friendships.
 * Returns null/empty on not found (does not throw).
 * All queries include userId filtering for security.
 */

import { db } from "@/db";
import { friendships, type NewFriendship } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

/**
 * Find a friendship by ID.
 */
async function findById(friendshipId: string) {
  return db.query.friendships.findFirst({
    where: eq(friendships.id, friendshipId),
  });
}

/**
 * Find all friendships for a user (as either party).
 */
async function findAllByUser(userId: string) {
  return db.query.friendships.findMany({
    where: or(
      eq(friendships.userId, userId),
      eq(friendships.friendUserId, userId),
    ),
    with: {
      user: true,
      friendUser: true,
    },
  });
}

/**
 * Find an existing friendship between two users.
 */
async function findBetweenUsers(userId1: string, userId2: string) {
  return db.query.friendships.findFirst({
    where: or(
      and(
        eq(friendships.userId, userId1),
        eq(friendships.friendUserId, userId2),
      ),
      and(
        eq(friendships.userId, userId2),
        eq(friendships.friendUserId, userId1),
      ),
    ),
  });
}

/**
 * Create a new friendship.
 */
async function create(data: NewFriendship) {
  await db.insert(friendships).values(data);
  return data;
}

/**
 * Delete a friendship by ID.
 */
async function deleteFriendship(friendshipId: string) {
  await db.delete(friendships).where(eq(friendships.id, friendshipId));
}

export const FriendshipRepository = {
  findById,
  findAllByUser,
  findBetweenUsers,
  create,
  delete: deleteFriendship,
};
