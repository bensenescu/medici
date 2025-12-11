import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client/useSessionTokenClientMiddleware";
import { FriendshipService } from "@/server/services";

// ============================================================================
// GET ALL FRIENDS
// ============================================================================

export const getAllFriends = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const friends = await FriendshipService.getAllFriends(context.userId);
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
    return FriendshipService.addFriend(context.userId, data.email);
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
    return FriendshipService.removeFriend(context.userId, data.friendshipId);
  });
