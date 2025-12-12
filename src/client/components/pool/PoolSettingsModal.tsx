import { Plus } from "lucide-react";
import { getUserDisplayName } from "@/utils/formatters";
import { poolMembersCollection } from "@/client/tanstack-db";
import type { PoolMember } from "./types";

interface PoolSettingsModalProps {
  poolMembers: PoolMember[] | undefined;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PoolSettingsModal({
  poolMembers,
  currentUserId,
  isOpen,
  onClose,
}: PoolSettingsModalProps) {
  const handleRemoveMember = (memberId: string) => {
    poolMembersCollection.delete(memberId);
  };

  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`} onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg">Pool Settings</h3>
        <div className="py-4">
          <h4 className="font-medium mb-3">
            Members ({poolMembers?.length ?? 0})
          </h4>
          <div className="space-y-2">
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
                    {!isCurrentUser && (
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
        <div className="modal-action">
          <button onClick={onClose} className="btn">
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
