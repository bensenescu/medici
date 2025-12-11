/**
 * Friendship Service - Business logic for friend relationships.
 * Verifies ownership BEFORE mutations.
 * Receives userId as first parameter for all operations.
 */

import { FriendshipRepository, UserRepository } from "@/server/repositories";

export type AddFriendResult =
  | {
      success: true;
      friend: {
        id: string;
        friendship: {
          id: string;
          userId: string;
          friendUserId: string;
          createdAt: string;
        };
        user: {
          id: string;
          email: string;
          firstName: string | null;
          lastName: string | null;
          bio: string | null;
          venmoHandle: string | null;
          createdAt: string;
          updatedAt: string;
        };
      };
    }
  | {
      success: false;
      error: "USER_NOT_FOUND" | "CANNOT_ADD_SELF" | "ALREADY_FRIENDS";
      message: string;
    };

export class FriendshipService {
  /**
   * Get all friends for a user.
   */
  static async getAllFriends(userId: string) {
    const userFriendships = await FriendshipRepository.findAllByUser(userId);

    return userFriendships.map((f) => {
      const friendUser = f.userId === userId ? f.friendUser : f.user;
      return {
        friendship: {
          id: f.id,
          userId: f.userId,
          friendUserId: f.friendUserId,
          createdAt: f.createdAt,
        },
        user: friendUser,
      };
    });
  }

  /**
   * Add a friend by email.
   * Returns error objects instead of throwing for expected validation failures.
   */
  static async addFriend(
    userId: string,
    email: string,
  ): Promise<AddFriendResult> {
    // Find user by email
    const targetUser = await UserRepository.findByEmail(email);

    if (!targetUser) {
      return {
        success: false,
        error: "USER_NOT_FOUND",
        message:
          "No account found with that email. They need to create an Every App account and use Medici at least once.",
      };
    }

    if (targetUser.id === userId) {
      return {
        success: false,
        error: "CANNOT_ADD_SELF",
        message: "You cannot add yourself as a friend.",
      };
    }

    // Check if friendship already exists
    const existingFriendship = await FriendshipRepository.findBetweenUsers(
      userId,
      targetUser.id,
    );

    if (existingFriendship) {
      return {
        success: false,
        error: "ALREADY_FRIENDS",
        message: "You are already friends with this user.",
      };
    }

    // Create friendship
    const friendshipId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await FriendshipRepository.create({
      id: friendshipId,
      userId: userId,
      friendUserId: targetUser.id,
      createdAt,
    });

    return {
      success: true,
      friend: {
        id: friendshipId,
        friendship: {
          id: friendshipId,
          userId: userId,
          friendUserId: targetUser.id,
          createdAt,
        },
        user: targetUser,
      },
    };
  }

  /**
   * Remove a friend.
   * Verifies user is part of the friendship.
   */
  static async removeFriend(userId: string, friendshipId: string) {
    const friendship = await FriendshipRepository.findById(friendshipId);

    if (!friendship) {
      throw new Error("Friendship not found");
    }

    // Verify current user is part of this friendship
    if (friendship.userId !== userId && friendship.friendUserId !== userId) {
      throw new Error("Cannot remove this friendship");
    }

    await FriendshipRepository.delete(friendshipId);

    return { success: true };
  }
}
