import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client";
import { db } from "@/db";
import { friendships, users } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

// ============================================================================
// GET ALL FRIENDS
// ============================================================================

export const getAllFriends = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const userId = context.userId;

    // Get friendships where current user is involved
    const userFriendships = await db.query.friendships.findMany({
      where: or(
        eq(friendships.userId, userId),
        eq(friendships.friendUserId, userId),
      ),
      with: {
        user: true,
        friendUser: true,
      },
    });

    // Map to friend users
    const friends = userFriendships.map((f) => {
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

    return { friends };
  });

// ============================================================================
// ADD FRIEND (by email)
// ============================================================================

export const addFriend = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().email() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Find user by email
    const targetUser = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

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
    const existingFriendship = await db.query.friendships.findFirst({
      where: or(
        and(
          eq(friendships.userId, userId),
          eq(friendships.friendUserId, targetUser.id),
        ),
        and(
          eq(friendships.userId, targetUser.id),
          eq(friendships.friendUserId, userId),
        ),
      ),
    });

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

    await db.insert(friendships).values({
      id: friendshipId,
      userId: userId,
      friendUserId: targetUser.id,
      createdAt,
    });

    // Return the created friendship with user data for optimistic updates
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
  });

// ============================================================================
// REMOVE FRIEND
// ============================================================================

export const removeFriend = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ friendshipId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Get the friendship
    const friendship = await db.query.friendships.findFirst({
      where: eq(friendships.id, data.friendshipId),
    });

    if (!friendship) {
      throw new Response("Friendship not found", { status: 404 });
    }

    // Verify current user is part of this friendship
    if (friendship.userId !== userId && friendship.friendUserId !== userId) {
      throw new Response("Cannot remove this friendship", { status: 403 });
    }

    // Delete the friendship
    await db.delete(friendships).where(eq(friendships.id, data.friendshipId));

    return { success: true };
  });
