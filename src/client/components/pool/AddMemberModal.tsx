import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { UserPlus } from "lucide-react";
import { friendsCollection, poolMembersCollection } from "@/client/tanstack-db";
import { addMemberToPool } from "@/serverFunctions/pools";
import type { PoolMemberWithUser } from "@/types";

interface AddMemberModalProps {
  poolId: string;
  poolMembers: PoolMemberWithUser[] | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function AddMemberModal({
  poolId,
  poolMembers,
  isOpen,
  onClose,
}: AddMemberModalProps) {
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query friends
  const { data: friends } = useLiveQuery((q) =>
    q.from({ friend: friendsCollection }),
  );

  // Get friends not already in pool
  const availableFriends = useMemo(() => {
    if (!friends || !poolMembers?.length) return friends ?? [];
    const memberIds = new Set(poolMembers.map((m) => m.userId));
    return friends.filter((f) => !memberIds.has(f.user.id));
  }, [friends, poolMembers]);

  const handleSubmit = async () => {
    if (!selectedFriendId) return;
    setIsSubmitting(true);
    try {
      await addMemberToPool({ data: { poolId, friendId: selectedFriendId } });
      await poolMembersCollection.utils.refetch();
      setSelectedFriendId("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedFriendId("");
    onClose();
  };

  return (
    <dialog
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onClick={handleClose}
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg">Add Member to Pool</h3>
        {availableFriends.length > 0 ? (
          <>
            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">Select a friend</span>
              </label>
              <select
                value={selectedFriendId}
                onChange={(e) => setSelectedFriendId(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="">Choose a friend...</option>
                {availableFriends.map((friend) => (
                  <option key={friend.id} value={friend.user.id}>
                    {friend.user?.firstName || friend.user?.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-action">
              <button
                onClick={handleClose}
                className="btn"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                disabled={!selectedFriendId || isSubmitting}
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add Member
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-base-content/60 mb-4">
              No friends available to add. All your friends are already in this
              pool, or you need to add friends first.
            </p>
            <Link to="/friends" className="btn btn-outline">
              <UserPlus className="h-4 w-4" />
              Go to Friends
            </Link>
          </div>
        )}
      </div>
    </dialog>
  );
}
