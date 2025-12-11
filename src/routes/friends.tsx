import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { useIsMobile } from "@/client/hooks/use-mobile";
import { TabBar } from "@/client/components/TabBar";
import { friendsCollection, type FriendWithUser } from "@/client/tanstack-db";
import { UserPlus, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/friends")({
  component: FriendsPage,
});

function FriendsPage() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live query for friends
  const { data: friends, isLoading } = useLiveQuery((q) =>
    q.from({ friend: friendsCollection }),
  );

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendEmail.trim()) return;

    const emailToAdd = newFriendEmail.trim().toLowerCase();

    // Check if already friends with this email
    const alreadyFriends = friends?.some(
      (f) => f.user.email.toLowerCase() === emailToAdd,
    );
    if (alreadyFriends) {
      setError("You are already friends with this user.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Disable optimistic updates - wait for server to validate user exists
      const tx = friendsCollection.insert(
        {
          id: "",
          friendship: { id: "", userId: "", friendUserId: "", createdAt: "" },
          user: {} as FriendWithUser["user"],
          _pendingEmail: newFriendEmail.trim(),
        },
        { optimistic: false },
      );

      // Wait for the server to respond
      await tx.isPersisted.promise;

      setNewFriendEmail("");
      setShowAddFriend(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add friend";
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleRemoveFriend = (friendshipId: string) => {
    friendsCollection.delete([friendshipId]);
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      <div className="px-4 pb-20 md:pt-4 md:pb-0 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Friends</h1>
          </div>
          <button
            onClick={() => setShowAddFriend(true)}
            className="btn btn-primary btn-sm"
          >
            <UserPlus className="h-4 w-4" />
            Add Friend
          </button>
        </div>

        {/* Friends List */}
        <div>
          <h2 className="font-semibold mb-3">
            Your Friends ({friends?.length ?? 0})
          </h2>
          {friends && friends.length > 0 ? (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div key={friend.id} className="card bg-base-100 shadow-sm">
                  <div className="card-body p-4 flex-row items-center gap-3">
                    {/* Avatar */}
                    <div className="avatar placeholder">
                      <div className="bg-primary/10 text-primary w-10 h-10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {friend.user.firstName?.[0]?.toUpperCase() ||
                            friend.user.email[0].toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {friend.user.firstName || friend.user.email}
                        {friend.user.lastName && ` ${friend.user.lastName}`}
                      </p>
                      <p className="text-sm text-base-content/60 truncate">
                        {friend.user.email}
                      </p>
                      {friend.user.venmoHandle && (
                        <p className="text-xs text-primary">
                          @{friend.user.venmoHandle}
                        </p>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="btn btn-ghost btn-sm btn-square text-base-content/40 hover:text-error"
                      title="Remove friend"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-4">
                <Users className="h-16 w-16 mx-auto text-base-content/20" />
              </div>
              <h3 className="text-lg font-medium mb-2">No friends yet</h3>
              <p className="text-base-content/60 mb-6 max-w-sm mx-auto">
                Add friends to start sharing expenses with them in your pools.
              </p>
              <button
                onClick={() => setShowAddFriend(true)}
                className="btn btn-primary"
              >
                <UserPlus className="h-4 w-4" />
                Add your first friend
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      <dialog
        className={`modal ${showAddFriend ? "modal-open" : ""}`}
        onClick={() => {
          setShowAddFriend(false);
          setError(null);
        }}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg">Add Friend</h3>
          <p className="text-base-content/60 text-sm mt-1">
            Add a friend by entering their email address.
          </p>
          <form onSubmit={handleAddFriend} className="mt-6 space-y-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Friend's Email</span>
              </label>
              <input
                type="email"
                value={newFriendEmail}
                onChange={(e) => {
                  setNewFriendEmail(e.target.value);
                  setError(null);
                }}
                placeholder="friend@example.com"
                className={`input input-bordered w-full ${error ? "input-error" : ""}`}
                autoFocus
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="modal-action pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddFriend(false);
                  setError(null);
                }}
                className="btn btn-ghost"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newFriendEmail.trim() || isSending}
                className="btn btn-primary"
              >
                {isSending ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add Friend
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0">
          <TabBar currentPath={location.pathname} />
        </div>
      )}
    </>
  );
}
