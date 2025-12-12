import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { poolsCollection, poolMembersCollection } from "@/client/tanstack-db";
import { ArrowLeft, Plus, Trash2, Save, UserPlus } from "lucide-react";
import { eq } from "@tanstack/db";
import { useCurrentUser } from "@/embedded-sdk/client";
import { getUserDisplayName } from "@/utils/formatters";
import { AddMemberModal } from "@/client/components/pool/AddMemberModal";

export const Route = createFileRoute("/pools/$poolId_/settings")({
  component: PoolSettings,
});

function PoolSettings() {
  const { poolId } = Route.useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Live queries
  const { data: pools } = useLiveQuery(
    (q) =>
      q
        .from({ pool: poolsCollection })
        .where(({ pool }) => eq(pool.id, poolId)),
    [poolId],
  );
  const pool = pools?.[0];

  const { data: poolMembers } = useLiveQuery(
    (q) =>
      q
        .from({ member: poolMembersCollection })
        .where(({ member }) => eq(member.poolId, poolId)),
    [poolId],
  );

  // Initialize form with pool data
  if (pool && !isInitialized) {
    setName(pool.name);
    setDescription(pool.description ?? "");
    setIsInitialized(true);
  }

  const currentUserId = currentUser?.userId;
  const currentMember = poolMembers?.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "ADMIN";

  const handleRemoveMember = (memberId: string) => {
    poolMembersCollection.delete(memberId);
  };

  const handleSave = () => {
    if (!pool || !name.trim()) return;

    poolsCollection.update(poolId, (draft) => {
      draft.name = name.trim();
      draft.description = description.trim() || null;
      draft.updatedAt = new Date().toISOString();
    });
  };

  const handleDelete = () => {
    if (!pool) return;

    poolsCollection.delete(poolId);
    navigate({ to: "/" });
  };

  // Loading state
  if (!currentUser || !pool) {
    return null;
  }

  const hasChanges =
    pool.name !== name.trim() ||
    (pool.description ?? "") !== description.trim();

  return (
    <div className="px-4 pb-20 md:pt-4 md:pb-0 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/pools/$poolId"
          params={{ poolId }}
          className="btn btn-ghost btn-sm btn-square"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">Pool Settings</h1>
      </div>

      {/* Pool Details */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg">Pool Details</h2>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Pool Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter pool name"
              className="input input-bordered w-full"
              disabled={!isAdmin}
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">
                Description (optional)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter pool description"
              className="textarea textarea-bordered w-full"
              rows={3}
              disabled={!isAdmin}
            />
          </div>

          {isAdmin && (
            <div className="mt-4">
              <button
                onClick={handleSave}
                disabled={!hasChanges || !name.trim()}
                className="btn btn-primary"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          )}

          {!isAdmin && (
            <p className="text-sm text-base-content/60 mt-2">
              Only admins can edit pool details.
            </p>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-lg">
              Members ({poolMembers?.length ?? 0})
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember(true)}
                className="btn btn-primary btn-sm"
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </button>
            )}
          </div>

          <div className="space-y-2 mt-2">
            {poolMembers?.map((member) => {
              const isCurrentUser = member.user.id === currentUserId;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-base-200 rounded-lg p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {getUserDisplayName(member.user)}
                      {isCurrentUser && (
                        <span className="text-base-content/50 ml-1">(you)</span>
                      )}
                    </p>
                    <p className="text-sm text-base-content/60 truncate">
                      {member.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span
                      className={`badge ${member.role === "ADMIN" ? "badge-primary" : "badge-ghost"}`}
                    >
                      {member.role}
                    </span>
                    {isAdmin && !isCurrentUser && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="btn btn-ghost btn-sm btn-square text-base-content/40 hover:text-error"
                        title="Remove member"
                      >
                        <Plus className="h-4 w-4 rotate-45" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="card bg-base-100 shadow border border-error/20">
          <div className="card-body">
            <h2 className="card-title text-lg text-error">Danger Zone</h2>
            <p className="text-sm text-base-content/60 mb-4">
              Deleting a pool will permanently remove all expenses, settlements,
              and member data. This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-error btn-outline w-fit"
              >
                <Trash2 className="h-4 w-4" />
                Delete Pool
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-error">
                  Are you sure you want to delete "{pool.name}"?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button onClick={handleDelete} className="btn btn-error">
                    <Trash2 className="h-4 w-4" />
                    Yes, Delete Pool
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AddMemberModal
        poolId={poolId}
        poolMembers={poolMembers}
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
      />
    </div>
  );
}
