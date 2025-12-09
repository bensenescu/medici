import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import { getAllFriends, removeFriend } from "@/serverFunctions/friends";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@/embedded-sdk/client";
import type { Friendship, User } from "@/types";

// Friend with user info for display
export type FriendWithUser = {
  id: string; // friendship id
  friendship: Friendship;
  user: User;
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
          user: f.user,
        }));
      },
      queryClient,
      getKey: (item) => item.id,
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await removeFriend({ data: { friendshipId: original.id } });
      },
    }),
  ),
);
