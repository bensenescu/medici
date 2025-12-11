import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllFriends,
  removeFriend,
  addFriend,
} from "@/serverFunctions/friends";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client";
import type { User } from "@/types";

// Friend with user info for display
export type FriendWithUser = {
  id: string; // friendship id
  friendship: {
    id: string;
    userId: string;
    friendUserId: string;
    createdAt: string;
  };
  user: User;
  // Used to pass email to onInsert handler
  _pendingEmail?: string;
};

export const friendsCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions<FriendWithUser, string>({
      queryKey: ["friends"],
      queryFn: async () => {
        const result = await getAllFriends();
        return result.friends.map((f) => ({
          id: f.friendship.id,
          friendship: f.friendship,
          user: f.user as User,
        }));
      },
      queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        const email = modified._pendingEmail;
        if (!email) {
          throw new Error("Email is required to add a friend");
        }

        const result = await addFriend({ data: { email } });

        if (!result.success) {
          throw new Error(result.message);
        }

        // Return the server-created friend data
        return result.friend as FriendWithUser;
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await removeFriend({ data: { friendshipId: original.id } });
      },
    }),
  ),
);
