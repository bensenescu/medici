import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";

interface Friend {
  id: string;
  user: {
    id: string;
    firstName: string | null;
    email: string;
  };
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (friendId: string) => Promise<void>;
  availableFriends: Friend[];
}

export function AddMemberModal({
  isOpen,
  onClose,
  onSubmit,
  availableFriends,
}: AddMemberModalProps) {
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedFriendId) return;
    setIsSubmitting(true);
    try {
      await onSubmit(selectedFriendId);
      setSelectedFriendId("");
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
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Select a friend</span>
              </label>
              <select
                value={selectedFriendId}
                onChange={(e) => setSelectedFriendId(e.target.value)}
                className="select select-bordered"
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
