import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/client/hooks/use-mobile";
import { TabBar } from "@/client/components/TabBar";
import { friendsCollection } from "@/client/tanstack-db";
import { UserPlus, Mail, Check, X, Trash2, Users } from "lucide-react";
import {
  getPendingFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from "@/serverFunctions/friends";

export const Route = createFileRoute("/friends")({
  component: FriendsPage,
});

type PendingRequest = {
  friendship: {
    id: string;
    invitingUserId: string;
    friendUserId: string;
    status: string;
    createdAt: string;
  };
  fromUser: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

function FriendsPage() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Live query for friends
  const { data: friends, isLoading } = useLiveQuery((q) =>
    q.from({ friend: friendsCollection }),
  );

  // Load pending friend requests
  const loadPendingRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const result = await getPendingFriendRequests();
      setPendingRequests(result.requests as PendingRequest[]);
    } catch (error) {
      console.error("Failed to load pending requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadPendingRequests();
  }, []);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendEmail.trim()) return;

    setIsSending(true);
    try {
      await sendFriendRequest({ data: { email: newFriendEmail.trim() } });
      setNewFriendEmail("");
      setShowAddFriend(false);
    } catch (error) {
      console.error("Failed to send friend request:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    setProcessingId(friendshipId);
    try {
      await acceptFriendRequest({ data: { friendshipId } });
      loadPendingRequests();
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    setProcessingId(friendshipId);
    try {
      await rejectFriendRequest({ data: { friendshipId } });
      loadPendingRequests();
    } catch (error) {
      console.error("Failed to reject friend request:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveFriend = (friendshipId: string) => {
    friendsCollection.delete([friendshipId]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
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

        {/* Pending Requests */}
        {isLoadingRequests ? (
          <div className="card bg-base-100 shadow-sm mb-6">
            <div className="card-body">
              <div className="flex justify-center">
                <span className="loading loading-spinner loading-sm"></span>
              </div>
            </div>
          </div>
        ) : pendingRequests.length > 0 ? (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-5 w-5 text-warning" />
              <h2 className="font-semibold">Pending Requests</h2>
              <span className="badge badge-warning badge-sm">
                {pendingRequests.length}
              </span>
            </div>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div
                  key={request.friendship.id}
                  className="card bg-base-100 shadow-sm"
                >
                  <div className="card-body p-4 flex-row items-center gap-3">
                    {/* Avatar */}
                    <div className="avatar placeholder">
                      <div className="bg-warning/20 text-warning w-10 h-10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {request.fromUser.firstName?.[0]?.toUpperCase() ||
                            request.fromUser.email[0].toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {request.fromUser.firstName || request.fromUser.email}
                        {request.fromUser.lastName &&
                          ` ${request.fromUser.lastName}`}
                      </p>
                      <p className="text-sm text-base-content/60 truncate">
                        {request.fromUser.email}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          handleAcceptRequest(request.friendship.id)
                        }
                        disabled={processingId === request.friendship.id}
                        className="btn btn-ghost btn-sm btn-square text-success"
                        title="Accept"
                      >
                        {processingId === request.friendship.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <Check className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          handleRejectRequest(request.friendship.id)
                        }
                        disabled={processingId === request.friendship.id}
                        className="btn btn-ghost btn-sm btn-square text-error"
                        title="Reject"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

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
        onClick={() => setShowAddFriend(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg">Add Friend</h3>
          <p className="text-base-content/60 text-sm mt-1">
            Send a friend request by entering their email address.
          </p>
          <form onSubmit={handleSendRequest} className="mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Friend's Email</span>
              </label>
              <input
                type="email"
                value={newFriendEmail}
                onChange={(e) => setNewFriendEmail(e.target.value)}
                placeholder="friend@example.com"
                className="input input-bordered"
                autoFocus
              />
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowAddFriend(false)}
                className="btn"
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
                    <Mail className="h-4 w-4" />
                    Send Request
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
