import { z } from "zod";

export const sendFriendRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const acceptFriendRequestSchema = z.object({
  friendshipId: z.string().uuid(),
});

export const rejectFriendRequestSchema = z.object({
  friendshipId: z.string().uuid(),
});

export const removeFriendSchema = z.object({
  friendshipId: z.string().uuid(),
});

export type SendFriendRequest = z.infer<typeof sendFriendRequestSchema>;
export type AcceptFriendRequest = z.infer<typeof acceptFriendRequestSchema>;
