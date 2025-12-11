import { z } from "zod";

export const addFriendSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const removeFriendSchema = z.object({
  friendshipId: z.string().uuid(),
});

export type AddFriend = z.infer<typeof addFriendSchema>;
export type RemoveFriend = z.infer<typeof removeFriendSchema>;
