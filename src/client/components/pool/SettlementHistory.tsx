import { History, DollarSign, ArrowRight, Trash2 } from "lucide-react";
import { settlementsCollection } from "@/client/tanstack-db";
import { getUserDisplayName } from "@/utils/formatters";
import type { Settlement, PoolMember } from "./types";

interface SettlementHistoryProps {
  settlements: Settlement[];
  poolMembers: PoolMember[] | undefined;
  currentUserId: string;
}

export function SettlementHistory({
  settlements,
  poolMembers,
  currentUserId,
}: SettlementHistoryProps) {
  const handleDeleteSettlement = (settlementId: string) => {
    settlementsCollection.delete(settlementId);
  };

  if (!settlements || settlements.length === 0) {
    return null;
  }

  return (
    <div className="card bg-base-100 shadow mb-6">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h3 className="card-title text-lg">
            <History className="h-5 w-5" />
            Recent Payments ({settlements.length})
          </h3>
        </div>
        <div className="divide-y divide-base-300 mt-2">
          {settlements.map((settlement) => {
            const fromMember = poolMembers?.find(
              (m) => m.userId === settlement.fromUserId,
            );
            const toMember = poolMembers?.find(
              (m) => m.userId === settlement.toUserId,
            );
            const isLoaded = poolMembers && settlement.createdByUserId;
            const canDelete =
              settlement.createdByUserId === currentUserId ||
              poolMembers?.find(
                (m) => m.userId === currentUserId && m.role === "ADMIN",
              );

            return (
              <div
                key={settlement.id}
                className="flex items-center gap-2 text-sm py-3 min-w-0"
              >
                <DollarSign className="h-4 w-4 text-success flex-shrink-0" />
                <span className="font-medium truncate">
                  {getUserDisplayName(fromMember?.user)}
                </span>
                <ArrowRight className="hidden md:block h-4 w-4 text-base-content/40 flex-shrink-0" />
                <span className="hidden md:block font-medium truncate">
                  {getUserDisplayName(toMember?.user)}
                </span>
                {isLoaded && (
                  <>
                    <span className="ml-auto font-bold text-success flex-shrink-0">
                      ${settlement.amount.toFixed(2)}
                    </span>
                    <span className="text-xs text-base-content/40 flex-shrink-0">
                      <span className="hidden md:inline">
                        {new Date(settlement.createdAt).toLocaleDateString()}
                      </span>
                      <span className="md:hidden">
                        {new Date(settlement.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "numeric",
                            day: "numeric",
                          },
                        )}
                      </span>
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteSettlement(settlement.id)}
                        className="btn btn-ghost btn-xs btn-square text-error flex-shrink-0"
                        title="Delete settlement"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
