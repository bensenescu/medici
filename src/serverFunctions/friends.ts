import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client";
import { db } from "@/db";
import { friendships, users } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

// ============================================================================
// GET ALL FRIENDS (accepted friendships)
// ============================================================================

export const getAllFriends = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const userId = context.userId;

    // Get accepted friendships where current user is involved
    const acceptedFriendships = await db.query.friendships.findMany({
      where: and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.invitingUserId, userId),
          eq(friendships.friendUserId, userId),
        ),
      ),
      with: {
        invitingUser: true,
        friendUser: true,
      },
    });

    // Map to friend users
    const friends = acceptedFriendships.map((f) => {
      const friendUser =
        f.invitingUserId === userId ? f.friendUser : f.invitingUser;
      return {
        friendship: {
          id: f.id,
          invitingUserId: f.invitingUserId,
          friendUserId: f.friendUserId,
          status: f.status,
          createdAt: f.createdAt,
        },
        user: friendUser,
      };
    });

    return { friends };
  });

// ============================================================================
// GET PENDING FRIEND REQUESTS (received by current user)
// ============================================================================

export const getPendingFriendRequests = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const userId = context.userId;

    // Get pending requests where current user is the recipient
    const pendingRequests = await db.query.friendships.findMany({
      where: and(
        eq(friendships.status, "pending"),
        eq(friendships.friendUserId, userId),
      ),
      with: {
        invitingUser: true,
      },
    });

    const requests = pendingRequests.map((f) => ({
      friendship: {
        id: f.id,
        invitingUserId: f.invitingUserId,
        friendUserId: f.friendUserId,
        status: f.status,
        createdAt: f.createdAt,
      },
      fromUser: f.invitingUser,
    }));

    return { requests };
  });

// ============================================================================
// SEND FRIEND REQUEST
// ============================================================================

export const sendFriendRequest = createServerFn({ method: "POST" })
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
      throw new Response("User not found with that email", { status: 404 });
    }

    if (targetUser.id === userId) {
      throw new Response("Cannot send friend request to yourself", {
        status: 400,
      });
    }

    // Check if friendship already exists
    const existingFriendship = await db.query.friendships.findFirst({
      where: or(
        and(
          eq(friendships.invitingUserId, userId),
          eq(friendships.friendUserId, targetUser.id),
        ),
        and(
          eq(friendships.invitingUserId, targetUser.id),
          eq(friendships.friendUserId, userId),
        ),
      ),
    });

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        throw new Response("Already friends with this user", { status: 400 });
      } else {
        throw new Response("Friend request already pending", { status: 400 });
      }
    }

    // Create friendship request
    await db.insert(friendships).values({
      id: crypto.randomUUID(),
      invitingUserId: userId,
      friendUserId: targetUser.id,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  });

// ============================================================================
// ACCEPT FRIEND REQUEST
// ============================================================================

export const acceptFriendRequest = createServerFn({ method: "POST" })
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
      throw new Response("Friend request not found", { status: 404 });
    }

    // Verify current user is the recipient
    if (friendship.friendUserId !== userId) {
      throw new Response("Cannot accept this friend request", { status: 403 });
    }

    if (friendship.status !== "pending") {
      throw new Response("Friend request is not pending", { status: 400 });
    }

    // Accept the request
    await db
      .update(friendships)
      .set({ status: "accepted" })
      .where(eq(friendships.id, data.friendshipId));

    return { success: true };
  });

// ============================================================================
// REJECT FRIEND REQUEST
// ============================================================================

export const rejectFriendRequest = createServerFn({ method: "POST" })
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
      throw new Response("Friend request not found", { status: 404 });
    }

    // Verify current user is the recipient
    if (friendship.friendUserId !== userId) {
      throw new Response("Cannot reject this friend request", { status: 403 });
    }

    if (friendship.status !== "pending") {
      throw new Response("Friend request is not pending", { status: 400 });
    }

    // Delete the request
    await db.delete(friendships).where(eq(friendships.id, data.friendshipId));

    return { success: true };
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
    if (
      friendship.invitingUserId !== userId &&
      friendship.friendUserId !== userId
    ) {
      throw new Response("Cannot remove this friendship", { status: 403 });
    }

    // Delete the friendship
    await db.delete(friendships).where(eq(friendships.id, data.friendshipId));

    return { success: true };
  });
